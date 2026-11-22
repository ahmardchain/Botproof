// The logged-in Telegram Web session lives in a "master" Chrome profile that Kane never touches.
// Before each flow BotProof copies it to a scratch profile, starts Chrome on the copy and
// attaches Kane to that Chrome over CDP (see chrome.ts).
//
// Why: on 22 Nov the configured profile was found completely empty after a replay that
// healed in a "fresh browser" — the Telegram session was gone (docs/FINDINGS.md). Running on a
// copy means a wiped profile costs one flow, not the login, and every flow starts from the same state.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import { killChromeOnProfile } from "./chrome.js";

/** Large, regenerable caches; skipping them keeps the copy to a few seconds. */
const SKIP = new Set(["Cache", "Code Cache", "GPUCache", "ShaderCache", "GrShaderCache", "GraphiteDawnCache", "DawnCache", "Crashpad", "component_crx_cache", "optimization_guide_model_store"]);

export function scratchPath(master: string): string {
  return `${master.replace(/[\\/]+$/, "")}-run`;
}

export function isEmptyDir(p: string): boolean {
  return !existsSync(p) || readdirSync(p).length === 0;
}

/** Chrome holds these while a profile is open (Linux/macOS: Singleton*, Windows: lockfile). */
export function profileInUse(p: string): boolean {
  return ["SingletonLock", "lockfile"].some((f) => existsSync(join(p, f)));
}

export function prepareScratchProfile(master: string): { ok: true; path: string } | { ok: false; reason: string } {
  if (isEmptyDir(master)) {
    return { ok: false, reason: `the Telegram login profile ${master} is empty. Log the TEST account in again (botproof init prints the command).` };
  }
  const scratch = scratchPath(master);
  killChromeOnProfile(scratch); // a Chrome left by a killed run would lock the copy on Windows
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(scratch, { recursive: true });
  cpSync(master, scratch, {
    recursive: true,
    errorOnExist: false,
    filter: (src) => {
      const name = basename(src);
      return !SKIP.has(name) && !name.startsWith("Singleton") && name !== "lockfile";
    },
  });
  return { ok: true, path: scratch };
}
