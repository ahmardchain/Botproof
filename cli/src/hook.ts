// Claude Code PreToolUse hook: while a BotProof fix is in progress, refuse edits
// outside the allowlist before they happen. (The fix loop also reverts any that slip through.)
// Wired in .claude/settings.json; reads the hook payload JSON on stdin.
// Exit 2 = block the tool call and show stderr to the agent.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "./config.js";
import { checkEdit } from "./guard.js";
import { LOCK_FILE } from "./fix.js";

export function cmdHook(): number {
  let payload: { tool_name?: string; tool_input?: Record<string, unknown>; cwd?: string };
  try {
    payload = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return 0;
  }
  const root = payload.cwd ?? process.cwd();
  const active = process.env.BOTPROOF_FIX === "1" || existsSync(join(root, LOCK_FILE));
  if (!active) return 0;
  const input = payload.tool_input ?? {};
  const target = (input.file_path ?? input.notebook_path ?? input.path) as string | undefined;
  if (!target) return 0;
  let editable: string[];
  try {
    editable = loadConfig(root).fix.editable;
  } catch {
    return 0;
  }
  const v = checkEdit(target, editable, root);
  if (v.allowed) return 0;
  process.stderr.write(`BotProof refused this edit: ${v.reason}. During a fix you may only change bot code.\n`);
  return 2;
}
