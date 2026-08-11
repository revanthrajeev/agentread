import type { FileChange, RepoContext } from "@/lib/fix/types";

/**
 * Minimal GitHub REST client — only the six calls Autofix needs.
 *
 * Deliberately no auto-merge and no writes to the default branch: every change lands as
 * a pull request on its own branch, so a human reviews machine-written code before it
 * ships. That constraint is a product decision, not an oversight.
 *
 * Uses fetch directly rather than Octokit — six endpoints doesn't justify the dependency,
 * and the serverless bundle stays small.
 */

const API = "https://api.github.com";

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

async function gh<T>(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "AgentRead-Autofix/1.0",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GitHubError(
      `GitHub ${init.method ?? "GET"} ${path} failed (${res.status}): ${body.slice(0, 300)}`,
      res.status
    );
  }

  return (await res.json()) as T;
}

/** Files whose presence identifies the framework, checked in priority order. */
const FRAMEWORK_MARKERS: Array<{ framework: string; test: (tree: string[], pkg: string) => boolean }> = [
  { framework: "nextjs", test: (_t, pkg) => /"next"\s*:/.test(pkg) },
  { framework: "nuxt", test: (_t, pkg) => /"nuxt"\s*:/.test(pkg) },
  { framework: "sveltekit", test: (_t, pkg) => /"@sveltejs\/kit"\s*:/.test(pkg) },
  { framework: "astro", test: (_t, pkg) => /"astro"\s*:/.test(pkg) },
  { framework: "gatsby", test: (_t, pkg) => /"gatsby"\s*:/.test(pkg) },
  { framework: "vite", test: (_t, pkg) => /"vite"\s*:/.test(pkg) },
  { framework: "react", test: (_t, pkg) => /"react"\s*:/.test(pkg) },
  { framework: "hugo", test: (t) => t.includes("config.toml") || t.includes("hugo.toml") },
  { framework: "jekyll", test: (t) => t.includes("_config.yml") },
];

/** High-signal files worth pulling into every prompt as shared context. */
const KEY_FILE_CANDIDATES = [
  "package.json",
  "next.config.js",
  "next.config.ts",
  "next.config.mjs",
  "astro.config.mjs",
  "svelte.config.js",
  "nuxt.config.ts",
];

export interface RepoRef {
  owner: string;
  repo: string;
}

export function parseRepoUrl(input: string): RepoRef | null {
  const trimmed = input.trim().replace(/\.git$/, "");
  const m = /github\.com[/:]([^/]+)\/([^/\s]+)/i.exec(trimmed) ?? /^([\w.-]+)\/([\w.-]+)$/.exec(trimmed);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

export async function loadRepoContext(token: string, ref: RepoRef): Promise<RepoContext> {
  const meta = await gh<{ default_branch: string }>(token, `/repos/${ref.owner}/${ref.repo}`);
  const defaultBranch = meta.default_branch;

  const treeRes = await gh<{ tree: Array<{ path: string; type: string }>; truncated: boolean }>(
    token,
    `/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`
  );

  const tree = treeRes.tree
    .filter((n) => n.type === "blob")
    // Vendored and build output is noise that would otherwise dominate the token budget.
    .filter((n) => !/(^|\/)(node_modules|\.next|dist|build|vendor|\.git)\//.test(n.path))
    .map((n) => n.path);

  const keyFiles: Array<{ path: string; contents: string }> = [];
  for (const candidate of KEY_FILE_CANDIDATES) {
    if (!tree.includes(candidate)) continue;
    const contents = await readFile(token, ref, candidate, defaultBranch);
    if (contents !== null) keyFiles.push({ path: candidate, contents: contents.slice(0, 20_000) });
  }

  const pkg = keyFiles.find((f) => f.path === "package.json")?.contents ?? "";
  const framework = FRAMEWORK_MARKERS.find((m) => m.test(tree, pkg))?.framework ?? "unknown";

  return { owner: ref.owner, repo: ref.repo, defaultBranch, tree, framework, keyFiles };
}

export async function readFile(
  token: string,
  ref: RepoRef,
  path: string,
  branch: string
): Promise<string | null> {
  try {
    const res = await gh<{ content?: string; encoding?: string }>(
      token,
      `/repos/${ref.owner}/${ref.repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`
    );
    if (!res.content) return null;
    return Buffer.from(res.content, (res.encoding as BufferEncoding) ?? "base64").toString("utf8");
  } catch (err) {
    // A missing file is an expected answer here (e.g. "is there a robots.txt?"), not a failure.
    if (err instanceof GitHubError && err.status === 404) return null;
    throw err;
  }
}

export interface PullRequestResult {
  url: string;
  number: number;
  branch: string;
}

/**
 * Commits `changes` onto a fresh branch and opens a pull request against the default
 * branch. Uses the Git Data API so every file lands in a single commit rather than one
 * commit per file.
 */
export async function openPullRequest(
  token: string,
  repo: RepoContext,
  changes: FileChange[],
  opts: { title: string; body: string; branchPrefix?: string }
): Promise<PullRequestResult> {
  const ref: RepoRef = { owner: repo.owner, repo: repo.repo };
  const branch = `${opts.branchPrefix ?? "agentread/autofix"}-${Date.now().toString(36)}`;

  const baseRef = await gh<{ object: { sha: string } }>(
    token,
    `/repos/${ref.owner}/${ref.repo}/git/ref/heads/${encodeURIComponent(repo.defaultBranch)}`
  );
  const baseSha = baseRef.object.sha;

  const baseCommit = await gh<{ tree: { sha: string } }>(
    token,
    `/repos/${ref.owner}/${ref.repo}/git/commits/${baseSha}`
  );

  // Blobs first, then one tree, then one commit — keeps the PR to a single reviewable diff.
  const blobs = await Promise.all(
    changes.map(async (change) => {
      const blob = await gh<{ sha: string }>(token, `/repos/${ref.owner}/${ref.repo}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({
          content: Buffer.from(change.contents, "utf8").toString("base64"),
          encoding: "base64",
        }),
      });
      return { path: change.path, mode: "100644" as const, type: "blob" as const, sha: blob.sha };
    })
  );

  const tree = await gh<{ sha: string }>(token, `/repos/${ref.owner}/${ref.repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: blobs }),
  });

  const commit = await gh<{ sha: string }>(token, `/repos/${ref.owner}/${ref.repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message: opts.title, tree: tree.sha, parents: [baseSha] }),
  });

  await gh(token, `/repos/${ref.owner}/${ref.repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
  });

  const pr = await gh<{ html_url: string; number: number }>(
    token,
    `/repos/${ref.owner}/${ref.repo}/pulls`,
    {
      method: "POST",
      body: JSON.stringify({
        title: opts.title,
        body: opts.body,
        head: branch,
        base: repo.defaultBranch,
      }),
    }
  );

  return { url: pr.html_url, number: pr.number, branch };
}

/** Verifies a token can actually write before a job starts spending inference on it. */
export async function verifyAccess(token: string, ref: RepoRef): Promise<{ ok: boolean; reason?: string }> {
  try {
    const repo = await gh<{ permissions?: { push?: boolean } }>(
      token,
      `/repos/${ref.owner}/${ref.repo}`
    );
    if (!repo.permissions?.push) {
      return { ok: false, reason: "Token can read this repository but cannot push branches." };
    }
    return { ok: true };
  } catch (err) {
    const reason =
      err instanceof GitHubError && err.status === 404
        ? "Repository not found, or the token has no access to it."
        : err instanceof Error
          ? err.message
          : "Could not verify repository access.";
    return { ok: false, reason };
  }
}
