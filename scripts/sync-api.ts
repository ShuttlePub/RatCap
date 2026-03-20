/**
 * Usage: bun scripts/sync-api.ts [--ref <branch|tag|sha>] [--commit] [--generate-only]
 *
 * Orchestrates OpenAPI spec fetch + PureScript code generation.
 *
 * Flags:
 *   --ref <value>      Branch, tag, or SHA to fetch from (default: main)
 *   --commit           Auto-commit generated files with Emumet SHA in message
 *   --generate-only    Skip fetch, only regenerate from existing openapi/emumet.json
 */

import { $ } from "bun";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const doCommit = args.includes("--commit");
  const generateOnly = args.includes("--generate-only");

  const scriptsDir = import.meta.dirname!;
  let commitSha: string | undefined;

  if (!generateOnly) {
    const fetchArgs = ["bun", `${scriptsDir}/fetch-openapi.ts`];
    const refIdx = args.indexOf("--ref");
    if (refIdx !== -1) {
      const refValue = args[refIdx + 1];
      if (!refValue) {
        console.error("Error: --ref requires a value");
        process.exit(1);
      }
      fetchArgs.push("--ref", refValue);
    }

    console.error("=== Step 1: Fetching OpenAPI spec ===");
    const fetchResult = await Bun.spawn(fetchArgs, {
      stdout: "pipe",
      stderr: "inherit",
    });

    const exitCode = await fetchResult.exited;
    if (exitCode !== 0) {
      console.error("Fetch failed");
      process.exit(1);
    }

    commitSha = (await new Response(fetchResult.stdout).text()).trim();
    console.error(`Resolved commit SHA: ${commitSha}`);
  } else {
    console.error("=== Step 1: Skipped (--generate-only) ===");
  }

  console.error("\n=== Step 2: Generating PureScript code ===");
  const genResult = await Bun.spawn(["bun", `${scriptsDir}/generate-api.ts`], {
    stdout: "inherit",
    stderr: "inherit",
  });

  const genExitCode = await genResult.exited;
  if (genExitCode !== 0) {
    console.error("Code generation failed");
    process.exit(1);
  }

  if (doCommit) {
    console.error("\n=== Step 3: Committing changes ===");

    const shaLabel = commitSha
      ? `ShuttlePub/Emumet@${commitSha.slice(0, 12)}`
      : "existing spec";

    const commitMsg = commitSha
      ? `Update Emumet OpenAPI spec from ${shaLabel}\n\nFull SHA: ${commitSha}`
      : `Regenerate API code from ${shaLabel}`;

    await $`git add openapi/emumet.json src/App/Api/Emumet/Types.purs`;

    const diffResult = await Bun.spawn(["git", "diff", "--cached", "--quiet"], {
      stdout: "inherit",
      stderr: "inherit",
    });
    const diffExitCode = await diffResult.exited;

    if (diffExitCode === 0) {
      console.error("No changes to commit — skipping.");
    } else {
      await $`git commit -m ${commitMsg}`;
      console.error("Committed.");
    }
  } else {
    console.error("\n=== Step 3: Skipped (no --commit flag) ===");
  }

  console.error("\nDone.");
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
