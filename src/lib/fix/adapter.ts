import type { FileChange, RepoContext } from "./types";
import { loadRepoContext, openPullRequest, readFile as ghReadFile, type RepoRef } from "@/lib/github/client";

/**
 * Where Autofix reads source from and writes fixes to. GitHub is the original (and still
 * default) target — this abstraction exists so the same planning/deterministic/LLM pipeline
 * in runner.ts can also target a user's local disk via the desktop app, without a second
 * copy of any fix logic. The desktop app has the disk; the server never does — so its
 * adapter takes file contents the client already read, and returns changes for the client
 * to write back, instead of opening a PR.
 */
export interface SourceAdapter {
  loadContext(): Promise<RepoContext>;
  readFile(path: string): Promise<string | null>;
  /** Returns a PR link when the adapter can open one; null when the caller applies changes itself. */
  applyChanges(
    changes: FileChange[],
    meta: { title: string; body: string }
  ): Promise<{ url: string; number: number; branch: string } | null>;
}

export function githubAdapter(token: string, ref: RepoRef): SourceAdapter {
  let ctx: RepoContext | null = null;
  return {
    async loadContext() {
      ctx = await loadRepoContext(token, ref);
      return ctx;
    },
    readFile(path) {
      if (!ctx) throw new Error("loadContext() must run before readFile()");
      return ghReadFile(token, ref, path, ctx.defaultBranch);
    },
    applyChanges(changes, meta) {
      if (!ctx) throw new Error("loadContext() must run before applyChanges()");
      return openPullRequest(token, ctx, changes, meta);
    },
  };
}

/**
 * Local-disk target for the desktop app. The server has no filesystem access to the
 * user's machine, so `ctx` and `fileMap` arrive pre-read in the request body — the desktop
 * app walks the folder, sends the framework/tree/candidate-file contents it already has on
 * disk, and writes the returned FileChange[] back itself. No PR is opened; applyChanges is
 * a no-op and the caller (the local-fix API route) returns the raw changes instead.
 */
export function localAdapter(ctx: RepoContext, fileMap: Map<string, string>): SourceAdapter {
  return {
    async loadContext() {
      return ctx;
    },
    async readFile(path) {
      return fileMap.get(path) ?? null;
    },
    async applyChanges() {
      return null;
    },
  };
}
