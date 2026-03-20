import SwaggerParser from "@apidevtools/swagger-parser";
import { join } from "path";
import type { OpenAPIV3_1 } from "openapi-types";

// Usage: bun scripts/generate-api.ts [--spec <path>]

const args = process.argv.slice(2);
let specPath = join(import.meta.dirname!, "..", "openapi", "emumet.json");
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--spec" && args[i + 1]) specPath = args[++i]!;
}

// --- Helpers ----------------------------------------------------------------

function camelCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((w, i) =>
      i === 0
        ? w.charAt(0).toLowerCase() + w.slice(1)
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join("");
}

function indent(s: string, n: number): string {
  const pad = " ".repeat(n);
  return s
    .split("\n")
    .map((l) => (l.trim() ? pad + l : l))
    .join("\n");
}

function wrapComplex(t: string): string {
  if (t.startsWith("(") || !t.includes(" ")) return t;
  return `(${t})`;
}

// --- IR Types ---------------------------------------------------------------

type SchemaObject = OpenAPIV3_1.SchemaObject;

interface RecordField {
  jsonName: string;
  psName: string;
  psType: string;
  required: boolean;
  isTristate: boolean;
}

interface RecordSchema {
  kind: "record";
  name: string;
  fields: RecordField[];
}

interface UnionVariant {
  constructorName: string;
  discriminatorValue: string;
  fields: RecordField[];
}

interface UnionSchema {
  kind: "union";
  name: string;
  discriminatorField: string;
  variants: UnionVariant[];
}

type IRSchema = RecordSchema | UnionSchema;

// --- $ref → schema name mapping ---------------------------------------------

type RefMap = Map<object, string>;

function buildRefMap(raw: OpenAPIV3_1.Document, derefed: OpenAPIV3_1.Document): RefMap {
  const map: RefMap = new Map();
  const rawSchemas = raw.components?.schemas ?? {};
  const derefSchemas = derefed.components?.schemas ?? {};

  for (const [name] of Object.entries(rawSchemas)) {
    const derefSchema = derefSchemas[name];
    if (derefSchema && typeof derefSchema === "object") {
      map.set(derefSchema as object, name);
    }
  }
  return map;
}

// --- Schema → PureScript Type -----------------------------------------------

function mapSimpleType(t: string): string {
  switch (t) {
    case "string": return "String";
    case "boolean": return "Boolean";
    case "integer": return "Int";
    case "number": return "Number";
    default: return "Json";
  }
}

function isFieldNullable(schema: SchemaObject): boolean {
  if (Array.isArray(schema.type)) {
    return (schema.type as string[]).includes("null");
  }
  if (schema.oneOf) {
    const arr = schema.oneOf as SchemaObject[];
    return arr.some((s) => s.type === "null");
  }
  return false;
}

function resolveBaseType(schema: SchemaObject, refMap: RefMap): string {
  const knownName = refMap.get(schema as object);
  if (knownName) return knownName;

  if (schema.oneOf) {
    const nonNull = (schema.oneOf as SchemaObject[]).filter((s) => s.type !== "null");
    if (nonNull.length === 1) {
      return resolveBaseType(nonNull[0]!, refMap);
    }
    return "Json";
  }

  if (Array.isArray(schema.type)) {
    const types = (schema.type as string[]).filter((t) => t !== "null");
    if (types.length === 1) {
      const t = types[0]!;
      if (t === "array" && (schema as any).items) {
        const itemType = resolveBaseType((schema as any).items as SchemaObject, refMap);
        return `(Array ${wrapComplex(itemType)})`;
      }
      return mapSimpleType(t);
    }
    return "Json";
  }

  if (schema.type === "array" && schema.items) {
    const itemType = resolveBaseType(schema.items as SchemaObject, refMap);
    return `(Array ${wrapComplex(itemType)})`;
  }

  if (schema.type === "object" && !schema.properties) return "Json";

  return mapSimpleType((schema.type as string) ?? "object");
}

function resolvePsType(schema: SchemaObject, required: boolean, refMap: RefMap): string {
  let base: string;

  const knownName = refMap.get(schema as object);
  if (knownName) {
    base = knownName;
    if (!required) return `(Maybe ${wrapComplex(base)})`;
    return base;
  }

  if (schema.oneOf) {
    // OpenAPI 3.1 nullable: oneOf: [{ type: "null" }, { ... }]
    const nonNull = (schema.oneOf as SchemaObject[]).filter(
      (s) => s.type !== "null"
    );
    if (nonNull.length === 1 && schema.oneOf.length === 2) {
      const inner = resolvePsType(nonNull[0]!, true, refMap);
      return required
        ? `(Maybe ${wrapComplex(inner)})`
        : `(Maybe ${wrapComplex(inner)})`;
    }
    base = "Json";
  } else if (Array.isArray(schema.type)) {
    // OpenAPI 3.1 nullable: type: ["string", "null"] or ["array", "null"]
    const types = (schema.type as string[]).filter((t) => t !== "null");
    const isNullable = (schema.type as string[]).includes("null");
    if (types.length === 1) {
      const t = types[0]!;
      if (t === "array" && (schema as any).items) {
        const itemType = resolvePsType((schema as any).items as SchemaObject, true, refMap);
        base = `(Array ${wrapComplex(itemType)})`;
      } else {
        base = mapSimpleType(t);
      }
      if (isNullable) return `(Maybe ${wrapComplex(base)})`;
    } else {
      base = "Json";
    }
  } else if (schema.type === "array" && schema.items) {
    const itemType = resolvePsType(schema.items as SchemaObject, true, refMap);
    base = `(Array ${wrapComplex(itemType)})`;
  } else if (schema.type === "object" && !schema.properties) {
    base = "Json";
  } else {
    base = mapSimpleType((schema.type as string) ?? "object");
  }

  if (!required) return `(Maybe ${wrapComplex(base)})`;
  return base;
}

// --- IR Builder -------------------------------------------------------------

function findDiscriminatorValue(
  variant: SchemaObject,
  discriminatorField: string
): string {
  const prop = variant.properties?.[discriminatorField] as SchemaObject | undefined;
  if (prop?.enum && prop.enum.length === 1) return String(prop.enum[0]);
  return "unknown";
}

function pascalCaseDiscriminator(s: string): string {
  return s
    .split(/[_\-\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function buildFields(schema: SchemaObject, refMap: RefMap, schemaName: string): RecordField[] {
  const required = new Set(schema.required ?? []);
  const isRequestType = schemaName.includes("Request");
  const fields: RecordField[] = [];
  for (const [name, prop] of Object.entries(schema.properties ?? {})) {
    const p = prop as SchemaObject;
    const isReq = required.has(name);
    const isNullable = isFieldNullable(p);
    const isTristate = isRequestType && !isReq && isNullable;
    fields.push({
      jsonName: name,
      psName: camelCase(name),
      psType: isTristate
        ? `(Tristate ${wrapComplex(resolveBaseType(p, refMap))})`
        : resolvePsType(p, isReq, refMap),
      required: isReq,
      isTristate,
    });
  }
  return fields;
}

function buildSchemaIR(api: OpenAPIV3_1.Document, refMap: RefMap): IRSchema[] {
  const schemas: IRSchema[] = [];
  const componentSchemas = api.components?.schemas ?? {};

  for (const [name, schema] of Object.entries(componentSchemas)) {
    const s = schema as SchemaObject;

    if (s.oneOf && (s.oneOf as SchemaObject[]).some((v) => v.type === "object")) {
      const variants = s.oneOf as SchemaObject[];
      let discriminatorField = "type";
      for (const v of variants) {
        if (!v.properties) continue;
        for (const [fn, fp] of Object.entries(v.properties)) {
          const fpSchema = fp as SchemaObject;
          if (fpSchema.enum && fpSchema.enum.length === 1) {
            discriminatorField = fn;
            break;
          }
        }
      }

      const irVariants: UnionVariant[] = variants.map((v) => {
        const discValue = findDiscriminatorValue(v, discriminatorField);
        return {
          constructorName: name + pascalCaseDiscriminator(discValue),
          discriminatorValue: discValue,
          fields: buildFields(v, refMap, name),
        };
      });

      schemas.push({ kind: "union", name, discriminatorField, variants: irVariants });
    } else if (s.type === "object" || s.properties) {
      schemas.push({ kind: "record", name, fields: buildFields(s, refMap, name) });
    }
  }

  return schemas;
}

// --- PureScript Emitter: Types Module ---------------------------------------

function emitRecordType(schema: RecordSchema): string {
  const lines: string[] = [];
  const { name, fields } = schema;

  if (fields.length === 0) {
    lines.push(`data ${name} = ${name}`);
    lines.push("");
    lines.push(`instance EncodeJson ${name} where`);
    lines.push(`  encodeJson ${name} = jsonEmptyObject`);
    lines.push("");
    lines.push(`instance DecodeJson ${name} where`);
    lines.push(`  decodeJson _ = Right ${name}`);
    return lines.join("\n");
  }

  lines.push(`newtype ${name} = ${name}`);
  const fieldLines = fields.map(
    (f, i) => `${i === 0 ? "{ " : ", "}${f.psName} :: ${f.psType}`
  );
  fieldLines.push("}");
  lines.push(indent(fieldLines.join("\n"), 2));
  lines.push("");

  const hasTristate = fields.some((f) => f.isTristate);

  lines.push(`instance EncodeJson ${name} where`);
  if (hasTristate) {
    lines.push(`  encodeJson (${name} r) =`);
    lines.push(`    fromObject`);
    const chainLines: string[] = [];
    for (const f of fields) {
      if (f.isTristate) {
        chainLines.push(`$ tristateField "${f.jsonName}" r.${f.psName}`);
      } else {
        chainLines.push(`$ FO.insert "${f.jsonName}" (encodeJson r.${f.psName})`);
      }
    }
    chainLines.push("$ FO.empty");
    lines.push(indent(chainLines.join("\n"), 6));
  } else {
    lines.push(`  encodeJson (${name} r) =`);
    const encLines = fields.map(
      (f, i) =>
        `"${f.jsonName}" := r.${f.psName}` +
        (i < fields.length - 1 ? " ~>" : " ~> jsonEmptyObject")
    );
    lines.push(indent(encLines.join("\n"), 4));
  }
  lines.push("");

  lines.push(`instance DecodeJson ${name} where`);
  lines.push(`  decodeJson json = do`);
  lines.push(`    obj <- decodeJson json`);
  for (const f of fields) {
    if (f.isTristate) {
      lines.push(`    ${f.psName} <- tristateDecodeField obj "${f.jsonName}"`);
    } else {
      const isMaybe = f.psType.startsWith("(Maybe ");
      if (isMaybe && !f.required) {
        lines.push(`    ${f.psName} <- join <$> obj .:? "${f.jsonName}"`);
      } else {
        const op = f.required ? ".:" : ".:?";
        lines.push(`    ${f.psName} <- obj ${op} "${f.jsonName}"`);
      }
    }
  }
  const fieldAssignments = fields.map((f) => f.psName).join(", ");
  lines.push(`    pure (${name} { ${fieldAssignments} })`);

  return lines.join("\n");
}

function emitUnionType(schema: UnionSchema): string {
  const lines: string[] = [];
  const { name, discriminatorField, variants } = schema;

  const ctors = variants.map((v) => {
    const nonDiscFields = v.fields.filter((f) => f.jsonName !== discriminatorField);
    if (nonDiscFields.length === 0) return v.constructorName;
    const recFields = nonDiscFields.map(
      (f, i) => `${i === 0 ? "{ " : ", "}${f.psName} :: ${f.psType}`
    );
    recFields.push("}");
    return `${v.constructorName}\n${indent(recFields.join("\n"), 4)}`;
  });

  lines.push(`data ${name}`);
  ctors.forEach((c, i) => {
    lines.push(`  ${i === 0 ? "= " : "| "}${c}`);
  });
  lines.push("");

  lines.push(`instance EncodeJson ${name} where`);
  for (const v of variants) {
    const nonDiscFields = v.fields.filter((f) => f.jsonName !== discriminatorField);
    if (nonDiscFields.length === 0) {
      lines.push(`  encodeJson ${v.constructorName} =`);
      lines.push(`    "${discriminatorField}" := "${v.discriminatorValue}" ~> jsonEmptyObject`);
    } else {
      lines.push(`  encodeJson (${v.constructorName} r) =`);
      lines.push(`    "${discriminatorField}" := "${v.discriminatorValue}" ~>`);
      const encLines = nonDiscFields.map(
        (f, i) =>
          `"${f.jsonName}" := r.${f.psName}` +
          (i < nonDiscFields.length - 1 ? " ~>" : " ~> jsonEmptyObject")
      );
      lines.push(indent(encLines.join("\n"), 4));
    }
  }
  lines.push("");

  lines.push(`instance DecodeJson ${name} where`);
  lines.push(`  decodeJson json = do`);
  lines.push(`    obj <- decodeJson json`);
  lines.push(`    tag <- obj .: "${discriminatorField}"`);
  lines.push(`    case (tag :: String) of`);
  for (const v of variants) {
    const nonDiscFields = v.fields.filter((f) => f.jsonName !== discriminatorField);
    if (nonDiscFields.length === 0) {
      lines.push(`      "${v.discriminatorValue}" -> Right ${v.constructorName}`);
    } else {
      lines.push(`      "${v.discriminatorValue}" -> do`);
      for (const f of nonDiscFields) {
        if (f.isTristate) {
          lines.push(`        ${f.psName} <- tristateDecodeField obj "${f.jsonName}"`);
        } else {
          const isMaybe = f.psType.startsWith("(Maybe ");
          if (isMaybe && !f.required) {
            lines.push(`        ${f.psName} <- join <$> obj .:? "${f.jsonName}"`);
          } else {
            const op = f.required ? ".:" : ".:?";
            lines.push(`        ${f.psName} <- obj ${op} "${f.jsonName}"`);
          }
        }
      }
      const fieldAssignments = nonDiscFields.map((f) => f.psName).join(", ");
      lines.push(`        pure (${v.constructorName} { ${fieldAssignments} })`);
    }
  }
  lines.push(`      other -> Left (UnexpectedValue (encodeJson other))`);

  return lines.join("\n");
}

function collectUsedImports(schemas: IRSchema[]): { needsJson: boolean; needsTristate: boolean } {
  let needsJson = false;
  let needsTristate = false;
  for (const s of schemas) {
    const fields = s.kind === "record" ? s.fields : s.variants.flatMap((v) => v.fields);
    for (const f of fields) {
      if (f.psType === "Json" || f.psType.includes(" Json)")) needsJson = true;
      if (f.isTristate) needsTristate = true;
    }
  }
  return { needsJson, needsTristate };
}

function emitTypesModule(schemas: IRSchema[]): string {
  const lines: string[] = [];
  const { needsJson, needsTristate } = collectUsedImports(schemas);
  const argonautCoreImports: string[] = [];
  if (needsTristate) argonautCoreImports.push("fromObject");
  if (needsJson) argonautCoreImports.push("Json");
  argonautCoreImports.push("jsonEmptyObject");

  lines.push("-- Auto-generated from OpenAPI spec. DO NOT EDIT.");
  lines.push("module App.Api.Emumet.Types where");
  lines.push("");
  lines.push("import Prelude");
  lines.push("");
  if (needsTristate) {
    lines.push("import App.Api.Emumet.Tristate (Tristate, tristateField, tristateDecodeField)");
  }
  lines.push(`import Data.Argonaut.Core (${argonautCoreImports.join(", ")})`);
  lines.push("import Data.Argonaut.Decode (class DecodeJson, decodeJson, (.:), (.:?))");
  lines.push("import Data.Argonaut.Decode.Error (JsonDecodeError(..))");
  lines.push("import Data.Argonaut.Encode (class EncodeJson, encodeJson, (:=), (~>))");
  lines.push("import Data.Either (Either(..))");
  lines.push("import Data.Maybe (Maybe)");
  if (needsTristate) {
    lines.push("import Foreign.Object as FO");
  }
  lines.push("");

  for (const schema of schemas) {
    lines.push(
      schema.kind === "record"
        ? emitRecordType(schema)
        : emitUnionType(schema)
    );
    lines.push("");
  }

  return lines.join("\n");
}

// --- Main -------------------------------------------------------------------

async function main() {
  console.error(`Reading spec: ${specPath}`);

  const rawJson = JSON.parse(await Bun.file(specPath).text()) as OpenAPIV3_1.Document;
  const api = (await SwaggerParser.dereference(
    JSON.parse(JSON.stringify(rawJson))
  )) as OpenAPIV3_1.Document;

  console.error(
    `Parsed: ${api.info.title} v${api.info.version} — ` +
    `${Object.keys(api.paths ?? {}).length} paths, ` +
    `${Object.keys(api.components?.schemas ?? {}).length} schemas`
  );

  const refMap = buildRefMap(rawJson, api);
  const schemas = buildSchemaIR(api, refMap);
  console.error(`IR: ${schemas.length} schemas`);

  const typesCode = emitTypesModule(schemas);
  const outDir = join(import.meta.dirname!, "..", "src", "App", "Api", "Emumet");
  await Bun.write(join(outDir, "Types.purs"), typesCode);
  console.error(`  → ${outDir}/Types.purs`);

  console.error("Done.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
