/**
 * Usage: bun scripts/sync-graphql.ts [--generate-only] [--schema <path>]
 *
 * Generates PureScript GraphQL client types from the local SDL
 * (bff/schema.graphql) into src/Generated/ (git-tracked, like the old
 * Emumet/Types.purs workflow).
 *
 * The codegen tool (purescript-graphql-client) requires a live introspection
 * URL, so this script:
 *   1. builds a resolver-less schema from the SDL via makeExecutableSchema,
 *   2. serves it on a random temporary port (Bun.serve, POST only),
 *   3. runs generateSchema against that URL,
 *   4. stops the server (try/finally — no orphan listeners).
 *
 * Flags:
 *   --generate-only  No-op flag. This script is inherently generate-only:
 *                    it always reads the local SDL, there is nothing to fetch.
 *   --schema <path>  SDL file to read (default: bff/schema.graphql).
 *                    Used by QA to point at a broken copy without touching
 *                    the real schema.
 */

import { makeExecutableSchema } from "@graphql-tools/schema";
import { graphqlSync, type ExecutionResult } from "graphql";
import { generateSchema } from "purescript-graphql-client";

interface GqlRequestBody {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Upstream workaround (purescript-graphql-client 10.1.1): the schema writer
// unconditionally emits `import Data.DateTime (DateTime)`, which is a
// ScopeConflict against the local `type DateTime = ...` alias it also
// generates for any scalar named DateTime (mapped or not — verified against
// gen-schema-bundled.mjs and unmapped output). Once the alias exists the
// import is unused, so remove exactly that line; only when the alias is
// present, otherwise fail loudly instead of silently editing generated code.
async function dropConflictingDateTimeImport(path: string): Promise<void> {
  const source = await Bun.file(path).text();
  const importLine = "import Data.DateTime (DateTime)\n";
  const hasAlias = /^type DateTime =/m.test(source);
  if (!source.includes(importLine)) return;
  if (!hasAlias) {
    throw new Error(`${path}: unexpected codegen shape (DateTime import without local alias)`);
  }
  await Bun.write(path, source.replace(importLine, ""));
  console.error(`  fixup ${path}: removed conflicting Data.DateTime import`);
}

// graphql v17 introspection reports DIRECTIVE_DEFINITION as a @deprecated
// location (new spec draft). The bundled codegen parser predates it and
// throws "Unknown directive location". The location is irrelevant to client
// codegen, so strip it from the introspection response before serving.
function stripDirectiveDefinitionLocation(result: ExecutionResult): void {
  const data = result.data;
  if (!isRecord(data)) return;
  const schema = data["__schema"];
  if (!isRecord(schema)) return;
  const directives = schema["directives"];
  if (!Array.isArray(directives)) return;
  for (const directive of directives) {
    if (!isRecord(directive)) continue;
    const locations = directive["locations"];
    if (!Array.isArray(locations)) continue;
    directive["locations"] = locations.filter((loc) => loc !== "DIRECTIVE_DEFINITION");
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  // --generate-only: accepted but a no-op (see header).
  void args.includes("--generate-only");

  let schemaPath = "bff/schema.graphql";
  const schemaIdx = args.indexOf("--schema");
  if (schemaIdx !== -1) {
    const value = args[schemaIdx + 1];
    if (!value) {
      console.error("Error: --schema requires a value");
      process.exit(1);
    }
    schemaPath = value;
  }

  console.error(`=== Step 1: Building schema from ${schemaPath} ===`);
  const sdl = await Bun.file(schemaPath).text();
  const schema = makeExecutableSchema({ typeDefs: sdl });

  console.error("=== Step 2: Starting temporary introspection server ===");
  const server = Bun.serve({
    port: 0,
    fetch: async (req) => {
      if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }
      try {
        const body = (await req.json()) as GqlRequestBody;
        const result = graphqlSync({
          schema,
          source: body.query,
          variableValues: body.variables,
          operationName: body.operationName,
        });
        stripDirectiveDefinitionLocation(result);
        return Response.json(result);
      } catch (err) {
        return Response.json(
          { errors: [{ message: err instanceof Error ? err.message : String(err) }] },
          { status: 400 },
        );
      }
    },
  });
  console.error(`Temporary server listening on port ${server.port}`);

  try {
    console.error("=== Step 3: Generating PureScript types ===");
    const result = await generateSchema({
      dir: "./src/Generated",
      modulePath: ["Generated", "Gql"],
      url: `http://localhost:${server.port}/graphql`,
      // The bundled 10.1.1 codegen reads `gqlToPursTypes` (verified against
      // gen-schema-bundled.mjs optsJs keys). The README-documented
      // `gqlScalarsToPursTypes` key is silently ignored by this version —
      // passing it leaves DateTime mapped to Data.DateTime.DateTime.
      gqlToPursTypes: { DateTime: "String" },
    });
    const written = [...result.schemas, ...result.enums, ...result.directives, result.symbols];
    for (const { path } of written) {
      console.error(`  wrote ${path}`);
    }
    await dropConflictingDateTimeImport("./src/Generated/Schema/Gql.purs");
  } finally {
    server.stop(true);
    console.error("=== Step 4: Temporary server stopped ===");
  }

  console.error("Done. Generated files are in src/Generated/");
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
