// botproof fix — the closed loop.
//   run flows with Kane → on failure hand the agent the flow, Kane's remark, the evidence
//   and the bot sources → agent patches bot code only (allowlist enforced) → restart/redeploy
//   the bot → re-run the failed flows with Kane → up to N attempts → escalate to a human.
// Every attempt is written to botproof/runs/<id>/LOG.md.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig, type BotProofConfig } from "./config.js";
import { extractFailure } from "./evidence.js";
import { checkEdit } from "./guard.js";
import { kaneAvailable, type FlowResult } from "./kane.js";
import { bold, dim, green, printSummary, red, resultsMarkdown, yellow } from "./report.js";
import { newRunId, resolveFlows, runFlows } from "./run.js";
import type { Flow } from "./flows.js";

export const LOCK_FILE = "botproof/.fix-active";

export interface FixArgs {
  names: string[];
  tags: string[];
  headless?: boolean;
  /** Agent-driven mode (Claude Code skill): one step per invocation, state on disk. */
  step?: boolean;
  maxAttempts?: number;
}

interface State {
  runId: string;
  attempt: number; // patches applied so far
  maxAttempts: number;
  pending: string[]; // flow paths still failing
  snapshot?: Snapshot;
  history: { attempt: number; results: FlowResult[] }[];
}

// ---------- git snapshot / allowlist enforcement ----------

interface Snapshot {
  base: string; // commit-ish capturing the working tree (git stash create) or HEAD
  hashes: Record<string, string>; // dirty/untracked file -> sha1 (or "deleted")
  contents: Record<string, string>; // base64 content of dirty files, to restore on refusal
}

function git(args: string[]): string {
  const r = spawnSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout;
}

/** BotProof's and Kane's own outputs; never treated as agent edits. */
const OWN_OUTPUTS = [/^botproof\/runs\//, /^botproof\/\.fix-/, /^botproof\/variables\.json$/, /^\.testmuai\//, /(^|\/)output-[^/]+\//];

function dirtyFiles(): string[] {
  return [...new Set(git(["ls-files", "-m", "-o", "-d", "--exclude-standard"]).split("\n"))]
    .filter(Boolean)
    .filter((f) => !OWN_OUTPUTS.some((re) => re.test(f)));
}

function sha(p: string): string {
  return existsSync(p) ? createHash("sha1").update(readFileSync(p)).digest("hex") : "deleted";
}

export function takeSnapshot(): Snapshot {
  const base = git(["stash", "create"]).trim() || git(["rev-parse", "HEAD"]).trim();
  const hashes: Record<string, string> = {};
  const contents: Record<string, string> = {};
  for (const f of dirtyFiles()) {
    hashes[f] = sha(f);
    if (existsSync(f)) contents[f] = readFileSync(f).toString("base64");
  }
  return { base, hashes, contents };
}

/** Files whose content changed since the snapshot. */
export function changedSince(s: Snapshot): string[] {
  const out = new Set<string>();
  for (const f of dirtyFiles()) if (s.hashes[f] !== sha(f)) out.add(f);
  for (const f of Object.keys(s.hashes)) if (s.hashes[f] !== sha(f)) out.add(f);
  return [...out].sort();
}

function restore(f: string, s: Snapshot) {
  if (f in s.contents) writeFileSync(f, Buffer.from(s.contents[f], "base64"));
  else if (s.hashes[f] === undefined && git(["ls-files", f]).trim() === "") rmSync(f, { force: true });
  else git(["checkout", "HEAD", "--", f]);
}

/** Revert every change outside the allowlist. Returns [kept, refused]. */
export function enforceAllowlist(cfg: BotProofConfig, s: Snapshot): { kept: string[]; refused: { file: string; reason: string }[] } {
  const kept: string[] = [];
  const refused: { file: string; reason: string }[] = [];
  for (const f of changedSince(s)) {
    const v = checkEdit(f, cfg.fix.editable);
    if (v.allowed) kept.push(f);
    else {
      restore(f, s);
      refused.push({ file: f, reason: v.reason! });
    }
  }
  return { kept, refused };
}

function diffSince(s: Snapshot, files: string[]): string {
  if (files.length === 0) return "";
  const tracked = files.filter((f) => git(["ls-files", f]).trim() !== "");
  const untracked = files.filter((f) => !tracked.includes(f));
  let d = tracked.length ? git(["diff", "--no-color", s.base, "--", ...tracked]) : "";
  for (const f of untracked) if (existsSync(f)) d += `--- /dev/null\n+++ b/${f}\n${readFileSync(f, "utf8").split("\n").map((l) => "+" + l).join("\n")}\n`;
  return d;
}

// ---------- the brief handed to the agent ----------

export function buildBrief(cfg: BotProofConfig, failures: FlowResult[], runDir: string, attempt: number): string {
  const parts: string[] = [];
  parts.push(`# BotProof fix request — attempt ${attempt} of ${cfg.fix.maxAttempts}`);
  parts.push(
    [
      "Kane CLI drove the real Telegram Web client (logged in as a test account) through the flows below and they failed.",
      "Fix the **bot code** so the flows pass. Rules:",
      `- You may only edit files matching: ${cfg.fix.editable.map((g) => "`" + g + "`").join(", ")}.`,
      "- Never edit flow files (`*_test.md`), BotProof (`cli/`, `botproof/`) or agent config. Edits there are refused and reverted.",
      "- Do not weaken the flows' expectations; make the bot do what the flow describes.",
      "- Keep the change minimal. When done, reply with one paragraph: root cause and what you changed.",
    ].join("\n"),
  );
  failures.forEach((r, i) => {
    parts.push(`## Failure ${i + 1}: \`${r.flow}\``);
    if (r.failure) parts.push(`Failed at step ${r.failure.stepIndex} **"${r.failure.heading}"**.\n\nKane's remark: ${r.failure.remark}`);
    if (r.errorMessage) parts.push(`Error: ${r.errorMessage}`);
    parts.push("### Flow (plain English, what a user does)\n\n```markdown\n" + readFileSync(r.flow, "utf8").trim() + "\n```");
    if (r.evidencePath && existsSync(r.evidencePath)) {
      try {
        const f = extractFailure(r.evidencePath);
        const base = join(runDir, `attempt-${attempt}-${i + 1}`);
        if (f.screenshot) writeFileSync(`${base}-screenshot.png`, f.screenshot);
        if (f.annotated) writeFileSync(`${base}-annotated.png`, f.annotated);
        parts.push(`### Evidence\nPack: \`${r.evidencePath}\` (open with \`kane-cli evidence serve ${r.evidencePath}\`)`);
        if (f.screenshot) parts.push(`Screenshot of Telegram Web at the failing step: \`${base}-screenshot.png\` (read it).`);
        if (f.annotated) parts.push(`Annotated (element Kane acted on): \`${base}-annotated.png\``);
        if (f.failureYaml) parts.push("Kane's failure record:\n\n```yaml\n" + f.failureYaml.trim().slice(0, 4000) + "\n```");
      } catch (e) {
        parts.push(`Evidence pack \`${r.evidencePath}\` could not be read: ${(e as Error).message}`);
      }
    }
  });
  parts.push("## Bot sources\nStart with these files (read others under the allowlist as needed):\n" + cfg.fix.sources.map((s) => `- \`${s}\``).join("\n"));
  return parts.join("\n\n") + "\n";
}

// ---------- bot under test lifecycle ----------

let botProc: ChildProcess | undefined;

function shell(cmd: string) {
  return spawn(cmd, { shell: true, stdio: ["ignore", "pipe", "pipe"] });
}

async function startBot(cfg: BotProofConfig, log: (s: string) => void): Promise<void> {
  if (!cfg.fix.botCommand) return;
  stopBot();
  botProc = shell(cfg.fix.botCommand);
  botProc.stdout?.on("data", (d) => process.env.BOTPROOF_DEBUG && process.stdout.write(dim(String(d))));
  botProc.stderr?.on("data", (d) => process.stderr.write(dim(String(d))));
  log(`bot started: ${cfg.fix.botCommand}`);
  await new Promise((r) => setTimeout(r, 4000));
}

function stopBot() {
  if (botProc && botProc.exitCode === null) botProc.kill("SIGTERM");
  botProc = undefined;
}

function redeploy(cfg: BotProofConfig, log: (s: string) => void): boolean {
  if (!cfg.fix.deployCommand) return true;
  log(`redeploying: ${cfg.fix.deployCommand}`);
  const r = spawnSync(cfg.fix.deployCommand, { shell: true, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (r.status !== 0) log(`deploy failed: ${(r.stderr || r.stdout).trim().slice(-2000)}`);
  return r.status === 0;
}

function runAgent(cfg: BotProofConfig, brief: string): { ok: boolean; output: string } {
  const r = spawnSync(cfg.fix.agentCommand, {
    shell: true,
    input: brief,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, BOTPROOF_FIX: "1" }, // turns on the PreToolUse guard hook
    timeout: 15 * 60 * 1000,
  });
  return { ok: r.status === 0, output: ((r.stdout ?? "") + (r.stderr ? `\n${r.stderr}` : "")).trim() };
}

// ---------- logging ----------

function logger(runDir: string) {
  const file = join(runDir, "LOG.md");
  return {
    file,
    md: (s: string) => appendFileSync(file, s + "\n\n"),
    say: (s: string) => console.log(s),
  };
}

function fence(lang: string, s: string) {
  return "```" + lang + "\n" + s.trim() + "\n```";
}

// ---------- autonomous loop ----------

export async function cmdFix(args: FixArgs): Promise<number> {
  if (args.step) return cmdFixStep(args);
  const k = kaneAvailable();
  if (!k.ok) {
    console.error("kane-cli not found. Install it: npm install -g @testmuai/kane-cli");
    return 2;
  }
  const cfg = loadConfig();
  if (args.maxAttempts) cfg.fix.maxAttempts = args.maxAttempts;
  const all = resolveFlows(cfg, args.names, args.tags);
  const runId = newRunId("fix");
  const runDir = join("botproof", "runs", runId);
  mkdirSync(runDir, { recursive: true });
  const L = logger(runDir);
  L.md(`# BotProof fix run \`${runId}\`\n\nkane-cli ${k.version} · max ${cfg.fix.maxAttempts} attempts · editable: ${cfg.fix.editable.map((g) => "`" + g + "`").join(", ")}\n\nFlows: ${all.map((f) => "`" + f.path + "`").join(", ")}`);

  await startBot(cfg, L.say);
  try {
    let pending: Flow[] = all;
    for (let attempt = 0; ; attempt++) {
      L.say(bold(attempt === 0 ? "\n== Initial run ==" : `\n== Re-run after attempt ${attempt} ==`));
      const results = await runFlows(cfg, pending, args);
      printSummary(results);
      L.md(`## ${attempt === 0 ? "Initial run" : `Re-run after attempt ${attempt}`}\n\n${resultsMarkdown(results)}`);
      const failed = results.filter((r) => r.status !== "passed");
      if (failed.length === 0) {
        L.md(`## Result: ✅ all flows pass${attempt ? ` after ${attempt} attempt(s)` : ""}`);
        L.say(green(`\nAll flows pass. Log: ${L.file}`));
        return 0;
      }
      const infra = failed.filter((r) => r.status !== "failed");
      if (infra.length === failed.length) {
        L.md(`## Result: ⚠️ stopped — Kane errors, not bot failures\n\n${infra.map((r) => `- \`${r.flow}\`: ${r.errorMessage ?? r.status}`).join("\n")}\n\nThe agent was not invoked: these are setup/infrastructure errors (auth, Chrome, timeouts), not bot behaviour.`);
        L.say(yellow(`\nKane could not run the flows (errors, not test failures). Not asking the agent to patch anything. Log: ${L.file}`));
        return 2;
      }
      if (attempt >= cfg.fix.maxAttempts) {
        L.md(
          `## Result: 🛑 escalated to a human after ${attempt} attempt(s)\n\nStill failing:\n${failed.map((r) => `- \`${r.flow}\` — ${r.failure ? `step ${r.failure.stepIndex} "${r.failure.heading}": ${r.failure.remark}` : r.errorMessage ?? r.status}`).join("\n")}\n\nAll attempted patches are left in the working tree for review (see the diffs above). Nothing was committed.`,
        );
        L.say(red(`\nStill failing after ${attempt} attempts. Escalating to a human. Log: ${L.file}`));
        return 1;
      }

      const n = attempt + 1;
      const brief = buildBrief(cfg, failed.filter((r) => r.status === "failed"), runDir, n);
      writeFileSync(join(runDir, `attempt-${n}-brief.md`), brief);
      L.say(bold(`\n== Attempt ${n}/${cfg.fix.maxAttempts}: handing ${failed.length} failure(s) to the agent ==`));
      const snap = takeSnapshot();
      const agent = runAgent(cfg, brief);
      const { kept, refused } = enforceAllowlist(cfg, snap);
      const diff = diffSince(snap, kept);
      L.md(
        [
          `## Attempt ${n}`,
          `Brief: \`attempt-${n}-brief.md\``,
          `Agent (${agent.ok ? "exited 0" : "exited non-zero"}):\n\n${fence("text", agent.output.slice(-4000) || "(no output)")}`,
          refused.length ? `Refused and reverted (outside allowlist):\n${refused.map((r) => `- \`${r.file}\`: ${r.reason}`).join("\n")}` : "No edits outside the allowlist.",
          kept.length ? `Changed: ${kept.map((f) => "`" + f + "`").join(", ")}\n\n${fence("diff", diff)}` : "**The agent changed no bot files.**",
        ].join("\n\n"),
      );
      for (const r of refused) L.say(red(`  refused edit: ${r.file} — ${r.reason}`));
      L.say(kept.length ? `  agent changed: ${kept.join(", ")}` : yellow("  agent changed no bot files"));
      if (!redeploy(cfg, L.say)) {
        L.md("Redeploy failed; stopping. See the deploy output above.");
        return 2;
      }
      await startBot(cfg, L.say);
      const failedPaths = new Set(failed.map((r) => r.flow));
      pending = all.filter((f) => failedPaths.has(f.path));
    }
  } finally {
    stopBot();
  }
}

// ---------- agent-driven loop (Claude Code calls this repeatedly) ----------
// Exit codes: 0 all pass · 10 needs a fix (brief printed) · 1 escalated · 2 Kane/setup error.

export async function cmdFixStep(args: FixArgs): Promise<number> {
  const cfg = loadConfig();
  if (args.maxAttempts) cfg.fix.maxAttempts = args.maxAttempts;
  const stateFile = join("botproof", ".fix-state.json");
  let st: State | undefined = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : undefined;
  if (!st) {
    const flows = resolveFlows(cfg, args.names, args.tags);
    st = { runId: newRunId("fix"), attempt: 0, maxAttempts: cfg.fix.maxAttempts, pending: flows.map((f) => f.path), history: [] };
  }
  const runDir = join("botproof", "runs", st.runId);
  mkdirSync(runDir, { recursive: true });
  const L = logger(runDir);
  if (st.history.length === 0) L.md(`# BotProof fix run \`${st.runId}\` (agent-driven)\n\nmax ${st.maxAttempts} attempts · editable: ${cfg.fix.editable.map((g) => "`" + g + "`").join(", ")}`);

  // Close out the agent's previous attempt: enforce the allowlist and record the diff.
  if (st.snapshot) {
    const { kept, refused } = enforceAllowlist(cfg, st.snapshot);
    L.md(
      [
        `## Attempt ${st.attempt} (patched by the coding agent)`,
        refused.length ? `Refused and reverted:\n${refused.map((r) => `- \`${r.file}\`: ${r.reason}`).join("\n")}` : "No edits outside the allowlist.",
        kept.length ? `Changed: ${kept.map((f) => "`" + f + "`").join(", ")}\n\n${fence("diff", diffSince(st.snapshot, kept))}` : "**The agent changed no bot files.**",
      ].join("\n\n"),
    );
    for (const r of refused) console.log(red(`refused edit: ${r.file} — ${r.reason}`));
    st.snapshot = undefined;
    if (!redeploy(cfg, console.log)) return 2;
  }

  const all = resolveFlows(cfg, [], []);
  const flows = all.filter((f) => st!.pending.includes(f.path));
  const results = await runFlows(cfg, flows, args);
  printSummary(results);
  st.history.push({ attempt: st.attempt, results });
  L.md(`## ${st.attempt === 0 ? "Initial run" : `Re-run after attempt ${st.attempt}`}\n\n${resultsMarkdown(results)}`);
  const failed = results.filter((r) => r.status !== "passed");
  const done = (code: number, msg: string) => {
    L.md(msg);
    rmSync(stateFile, { force: true });
    rmSync(LOCK_FILE, { force: true });
    console.log(`log: ${L.file}`);
    return code;
  };
  if (failed.length === 0) return done(0, `## Result: ✅ all flows pass${st.attempt ? ` after ${st.attempt} attempt(s)` : ""}`);
  if (failed.every((r) => r.status !== "failed")) return done(2, "## Result: ⚠️ stopped — Kane errors, not bot failures. No patch requested.");
  if (st.attempt >= st.maxAttempts) {
    return done(1, `## Result: 🛑 escalated to a human after ${st.attempt} attempt(s)\n\nStill failing: ${failed.map((r) => "`" + r.flow + "`").join(", ")}`);
  }
  st.attempt += 1;
  st.pending = failed.map((r) => r.flow);
  const brief = buildBrief(cfg, failed.filter((r) => r.status === "failed"), runDir, st.attempt);
  writeFileSync(join(runDir, `attempt-${st.attempt}-brief.md`), brief);
  st.snapshot = takeSnapshot();
  writeFileSync(stateFile, JSON.stringify(st));
  writeFileSync(LOCK_FILE, st.runId); // PreToolUse guard enforces the allowlist while this exists
  console.log("\n" + brief);
  console.log(yellow(`NEEDS FIX (attempt ${st.attempt}/${st.maxAttempts}). Patch the bot, then run \`botproof fix --step\` again.`));
  return 10;
}
