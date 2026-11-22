import { relative, resolve, isAbsolute } from "node:path";
import { ALWAYS_PROTECTED } from "./config.js";

/** Glob match supporting `**`, `*` and `?` on forward-slash paths. */
export function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        i++;
        if (glob[i + 1] === "/") {
          i++;
          re += "(?:.*/)?";
        } else re += ".*";
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

export function matchesAny(path: string, globs: string[]): boolean {
  return globs.some((g) => globToRegExp(g).test(path));
}

export function toRepoPath(file: string, root = process.cwd()): string {
  const abs = isAbsolute(file) ? file : resolve(root, file);
  return relative(root, abs).split("\\").join("/");
}

/**
 * The closed loop's edit policy: a path is editable only when it is inside the repo,
 * matches an `editable` glob, and is not protected (flows, BotProof itself, agent config).
 */
export function checkEdit(file: string, editable: string[], root = process.cwd()): { allowed: boolean; reason?: string } {
  const p = toRepoPath(file, root);
  if (p.startsWith("..")) return { allowed: false, reason: `${file} is outside the repository` };
  if (matchesAny(p, ALWAYS_PROTECTED)) return { allowed: false, reason: `${p} is protected (flows and BotProof itself are never edited by the fix loop)` };
  if (!matchesAny(p, editable)) return { allowed: false, reason: `${p} is not in the editable allowlist (${editable.join(", ")})` };
  return { allowed: true };
}
