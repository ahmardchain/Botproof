// botproof why <run-dir | pack.evidence>...
// Pulls Kane's failure record and the screenshot of the failing step out of evidence packs,
// so a human (or the agent) can see what Telegram Web actually showed when a flow failed.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { extractFailure } from "./evidence.js";
import { bold, dim, green, yellow } from "./report.js";

/** Find a pack by file name in .testmuai/evidence or Kane's session store. */
export function locatePack(name: string): string | undefined {
  if (existsSync(name)) return name;
  const dirs = [join(".testmuai", "evidence")];
  const sessions = join(homedir(), ".testmuai", "kaneai", "sessions");
  if (existsSync(sessions)) for (const s of readdirSync(sessions)) dirs.push(join(sessions, s, "evidence"));
  for (const d of dirs) if (existsSync(join(d, name))) return join(d, name);
  return undefined;
}

function packsFromRun(runDir: string): { flow: string; pack: string; status: string }[] {
  const f = join(runDir, "results.json");
  if (existsSync(f)) {
    const j = JSON.parse(readFileSync(f, "utf8")) as { results: { flow: string; status: string; evidencePath?: string }[] };
    return j.results.filter((r) => r.evidencePath).map((r) => ({ flow: r.flow, status: r.status, pack: r.evidencePath! }));
  }
  // Committed logs only keep the pack's file name.
  const md = readFileSync(join(runDir, "SUMMARY.md"), "utf8");
  return [...md.matchAll(/^\| ([^|]+) \| (\w+) \|.*?`([^`]+\.evidence)`/gm)].map((m) => ({ flow: m[1].trim(), status: m[2], pack: m[3] }));
}

export function cmdWhy(targets: string[]): number {
  if (targets.length === 0) {
    console.error("usage: botproof why <botproof/runs/<run-dir> | pack.evidence>...");
    return 2;
  }
  let code = 0;
  for (const t of targets) {
    const items = t.endsWith(".evidence") ? [{ flow: basename(t), status: "?", pack: t }] : statSync(t).isDirectory() ? packsFromRun(t) : [];
    for (const it of items) {
      if (it.status === "passed") continue;
      console.log(bold(`\n${it.flow}`) + dim(`  (${it.status})`));
      const pack = locatePack(it.pack) ?? locatePack(basename(it.pack));
      if (!pack) {
        console.log(yellow(`  pack ${basename(it.pack)} not found on this machine`));
        code = 1;
        continue;
      }
      const f = extractFailure(pack);
      const outDir = t.endsWith(".evidence") ? join("botproof", "runs", "why") : t;
      mkdirSync(outDir, { recursive: true });
      const stem = basename(pack, ".evidence").slice(0, 8);
      if (f.screenshot) {
        writeFileSync(join(outDir, `why-${stem}-screenshot.png`), f.screenshot);
        console.log(green(`  screenshot: ${join(outDir, `why-${stem}-screenshot.png`)}`));
      }
      if (f.annotated) writeFileSync(join(outDir, `why-${stem}-annotated.png`), f.annotated);
      console.log(f.failureYaml ? f.failureYaml.trim().split("\n").map((l) => "  " + l).join("\n") : dim("  (no failure record in this pack)"));
    }
  }
  return code;
}
