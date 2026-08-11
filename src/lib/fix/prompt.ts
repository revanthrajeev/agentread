/**
 * The instructions and output contract shared by every model Autofix can call.
 *
 * Split out so Claude and GPT are given byte-identical instructions — if the two providers
 * drifted, a customer's fix quality would depend on which model happened to route their
 * issue, which is not a distinction anyone should have to reason about.
 */

export const SYSTEM_PROMPT = `You fix websites so AI agents can read them, without changing what humans see.

You are given a repository's structure, a set of relevant source files, and one specific finding from an audit of the deployed site. Produce the minimal code change that resolves that finding.

Rules:
- Change as little as possible. A finding about one component is not licence to refactor the module.
- Never alter the rendered experience for human visitors. These fixes are about what exists in the server-rendered markup, not about visual design.
- Return complete file contents, never diffs or fragments — your output is written to disk verbatim.
- Match the surrounding code: its formatting, naming, imports, and idioms.
- Only write a comment to state a constraint the code cannot show. Do not narrate what the next line does.
- If the context you were given is not enough to make the change correctly, set confident to false and return no changes. A pull request that has to be reverted costs the user far more than one that was never opened.`;

/** Anthropic's `output_config.format.schema` and OpenAI's `json_schema.schema` both take this shape directly. */
export const PATCH_SCHEMA = {
  type: "object",
  properties: {
    explanation: {
      type: "string",
      description:
        "What was changed and why, in two or three sentences, addressed to the developer reviewing the pull request.",
    },
    changes: {
      type: "array",
      description:
        "Files to write. Each entry replaces the file wholesale, so `contents` must be the complete final file, not a diff or a fragment.",
      items: {
        type: "object",
        properties: {
          path: { type: "string", description: "Repository-relative path." },
          contents: { type: "string", description: "Complete new contents of the file." },
          rationale: {
            type: "string",
            description: "One sentence on why this specific file changed.",
          },
        },
        required: ["path", "contents", "rationale"],
        additionalProperties: false,
      },
    },
    /** Lets the model decline rather than invent a change it isn't confident in. */
    confident: {
      type: "boolean",
      description:
        "False if the provided context was insufficient to make a correct change. Prefer returning false over guessing.",
    },
  },
  required: ["explanation", "changes", "confident"],
  additionalProperties: false,
} as const;

export interface ParsedPatch {
  explanation: string;
  changes: Array<{ path: string; contents: string; rationale: string }>;
  confident: boolean;
}

/** Builds the two prompt sections every provider needs: the cacheable repo prefix and the finding. */
export function buildFixPrompt(
  repo: { owner: string; repo: string; framework: string; defaultBranch: string; tree: string[]; keyFiles: Array<{ path: string; contents: string }> },
  item: { title: string; description: string; affectedUrls: string[] },
  relevantFiles: Array<{ path: string; contents: string }>
) {
  const repoContext = [
    `# Repository: ${repo.owner}/${repo.repo}`,
    `Framework: ${repo.framework}`,
    `Default branch: ${repo.defaultBranch}`,
    ``,
    `## File tree`,
    repo.tree.slice(0, 2000).join("\n"),
    ``,
    `## Key files`,
    ...repo.keyFiles.map((f) => `### ${f.path}\n\`\`\`\n${f.contents}\n\`\`\``),
  ].join("\n");

  const finding = [
    `## Finding to fix`,
    `${item.title}`,
    ``,
    item.description,
    ``,
    item.affectedUrls.length ? `Affected pages:\n${item.affectedUrls.map((u) => `- ${u}`).join("\n")}` : "",
    ``,
    `## Files likely involved`,
    ...relevantFiles.map((f) => `### ${f.path}\n\`\`\`\n${f.contents}\n\`\`\``),
  ]
    .filter(Boolean)
    .join("\n");

  return { repoContext, finding };
}
