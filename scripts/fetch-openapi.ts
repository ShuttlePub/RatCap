/**
 * Usage: bun scripts/fetch-openapi.ts [--ref <branch|tag|sha>]
 *
 * Prints the resolved commit SHA to stdout for use by sync-api.ts.
 */

const REPO_OWNER = "ShuttlePub";
const REPO_NAME = "Emumet";
const FILE_PATH = "openapi.json";
const OUT_PATH = "openapi/emumet.json";

interface GitHubCommitResponse {
  sha: string;
  commit: { message: string };
}

async function fetchLatestCommitSha(ref: string): Promise<string> {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/${ref}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Ratcap-OpenAPI-Fetcher",
    },
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch commit info: ${res.status} ${res.statusText}`,
    );
  }
  const data = (await res.json()) as GitHubCommitResponse;
  return data.sha;
}

async function fetchOpenApiSpec(ref: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${ref}/${FILE_PATH}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Ratcap-OpenAPI-Fetcher" },
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${FILE_PATH}: ${res.status} ${res.statusText}`,
    );
  }
  return res.text();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let ref = "main";
  const refIdx = args.indexOf("--ref");
  if (refIdx !== -1) {
    const refValue = args[refIdx + 1];
    if (!refValue) {
      console.error("Error: --ref requires a value (branch, tag, or SHA)");
      process.exit(1);
    }
    ref = refValue;
  }

  console.error(`Fetching OpenAPI spec from ${REPO_OWNER}/${REPO_NAME}@${ref}...`);

  const commitSha = await fetchLatestCommitSha(ref);
  console.error(`Resolved SHA: ${commitSha}`);
  const specContent = await fetchOpenApiSpec(commitSha);

  try {
    JSON.parse(specContent);
  } catch {
    console.error("Error: Fetched content is not valid JSON");
    process.exit(1);
  }

  const outPath = `${import.meta.dirname}/../${OUT_PATH}`;
  await Bun.write(outPath, specContent.endsWith("\n") ? specContent : specContent + "\n");

  console.error(`Saved to ${OUT_PATH}`);
  console.error(`Commit: ${REPO_OWNER}/${REPO_NAME}@${commitSha.slice(0, 12)}`);

  console.log(commitSha);
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
