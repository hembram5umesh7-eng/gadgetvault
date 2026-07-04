/**
 * Create a new GitHub repo using stored git credentials (no token printed).
 * Usage: node scripts/create-github-repo.mjs <repo-name> [description]
 */
import { spawnSync } from "node:child_process";

const repoName = process.argv[2];
const description = process.argv[3] || "GadgetVault — Premium gadgets & accessories e-commerce";

if (!repoName) {
  console.error("Usage: node scripts/create-github-repo.mjs <repo-name>");
  process.exit(1);
}

function getGitHubToken() {
  const input = "protocol=https\nhost=github.com\n\n";
  const result = spawnSync("git", ["credential", "fill"], {
    input,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "git credential fill failed");
  }
  const passwordMatch = result.stdout.match(/^password=(.+)$/m);
  if (!passwordMatch?.[1]) throw new Error("No GitHub token from git credential helper");
  return passwordMatch[1].trim();
}

async function main() {
  const token = getGitHubToken();
  const res = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      name: repoName,
      description,
      private: false,
      auto_init: false,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (res.status === 422 && body.message?.includes("already exists")) {
    console.log(`Repo already exists: ${body.errors?.[0]?.message || repoName}`);
    console.log(`https://github.com/hembram5umesh7-eng/${repoName}`);
    return;
  }
  if (!res.ok) {
    throw new Error(body.message || `GitHub API ${res.status}: ${JSON.stringify(body)}`);
  }
  console.log(`Created: ${body.html_url}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
