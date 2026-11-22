import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** What BotProof keeps from one `kane-cli testmd run --agent`. */
export interface FlowResult {
  flow: string;
  status: "passed" | "failed" | "error" | "cancelled";
  exitCode: number;
  durationS?: number;
  credits?: number;
  sessionId?: string;
  shareUrl?: string;
  evidencePath?: string;
  steps: { index: number; heading: string; status: string; durationS?: number }[];
  failure?: { stepIndex: number; heading: string; remark: string };
  errorMessage?: string;
}

type Ev = Record<string, any>;

export function parseNdjson(stdout: string): Ev[] {
  const out: Ev[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    try {
      out.push(JSON.parse(t));
    } catch {
      /* not an event line */
    }
  }
  return out;
}

/** Path from the stderr hint: evidence: view locally with `kane-cli evidence serve <path>` */
export function evidenceFromStderr(stderr: string): string | undefined {
  const m = /kane-cli evidence serve ([^`\n]+)`/.exec(stderr);
  return m?.[1].trim();
}

/**
 * Build a FlowResult from the saved-test stream. Contract (kane-cli skill, references/testmd.md):
 * test_md_step_start {step_index, heading} … inner step events … test_md_step_end {step_index, status},
 * test_md_summary, test_md_done {overall_status, duration_s, session_id, share_url?}. Exit code is authoritative.
 */
export function summarize(flow: string, events: Ev[], exitCode: number, stderr = ""): FlowResult {
  const headings = new Map<number, string>();
  const steps: FlowResult["steps"] = [];
  let failure: FlowResult["failure"];
  let lastRemark = "";
  let credits = 0;
  let sawCredits = false;
  let done: Ev | undefined;
  let error: Ev | undefined;

  for (const e of events) {
    switch (e.type) {
      case "test_md_step_start":
        headings.set(e.step_index, e.heading ?? `Step ${e.step_index}`);
        lastRemark = "";
        break;
      case "step_end":
        if (e.summary) lastRemark = String(e.summary);
        break;
      case "step_event":
        if (e.detail && typeof e.detail === "string" && /fail|error|could not|not found|assert/i.test(e.detail)) lastRemark = e.detail;
        break;
      case "run_end": {
        const c = e.credits ?? e.credits_consumed;
        if (typeof c === "number") {
          credits += c;
          sawCredits = true;
        }
        if (e.status === "failed") lastRemark = String(e.reason ?? e.summary ?? lastRemark);
        break;
      }
      case "test_md_step_end": {
        const heading = headings.get(e.step_index) ?? `Step ${e.step_index}`;
        steps.push({ index: e.step_index, heading, status: e.status, durationS: e.duration_s });
        if (e.status === "failed" && !failure) failure = { stepIndex: e.step_index, heading, remark: lastRemark || "Kane reported the step as failed." };
        break;
      }
      case "test_md_done":
        done = e;
        break;
      case "error":
        error = e;
        break;
      default:
        // untyped progress events: {step, status, remark}
        if (e.type === undefined && e.status === "failed" && e.remark) lastRemark = String(e.remark);
    }
  }

  const status: FlowResult["status"] =
    exitCode === 0 ? "passed" : exitCode === 1 ? "failed" : exitCode === 3 ? "cancelled" : "error";
  return {
    flow,
    status,
    exitCode,
    durationS: done?.duration_s,
    credits: sawCredits ? credits : undefined,
    sessionId: done?.session_id,
    shareUrl: done?.share_url,
    evidencePath: evidenceFromStderr(stderr),
    steps,
    failure: status === "failed" ? failure : undefined,
    errorMessage: error ? `${error.message ?? error.code ?? "error"}${error.remedy ? ` — ${error.remedy}` : ""}` : status === "error" ? lastStderrLine(stderr) : undefined,
  };
}

function lastStderrLine(stderr: string): string | undefined {
  const lines = stderr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const err = lines.find((l) => /^error:/i.test(l));
  return err ?? lines.at(-1);
}

export interface RunOptions {
  headless?: boolean;
  variablesFile?: string;
  timeout?: number;
  onEvent?: (e: Ev) => void;
}

export function kaneAvailable(): { ok: boolean; version?: string } {
  const r = spawnSync("kane-cli", ["--version"], { encoding: "utf8" });
  return r.status === 0 ? { ok: true, version: r.stdout.trim() } : { ok: false };
}

/** Run one flow: `kane-cli testmd run <file> --agent [--headless] [--variables-file f] [--timeout s]`. */
export function runFlow(flowPath: string, opts: RunOptions = {}, cwd = process.cwd()): Promise<FlowResult> {
  const args = ["testmd", "run", flowPath, "--agent"];
  if (opts.headless) args.push("--headless");
  if (opts.variablesFile) args.push("--variables-file", opts.variablesFile);
  if (opts.timeout) args.push("--timeout", String(opts.timeout));
  const started = Date.now();
  return new Promise((resolveP) => {
    // stdin closed: nothing interactive can block a run (Kane disables ask_user without a TTY).
    const child = spawn("kane-cli", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let buf = "";
    child.stdout.on("data", (d: Buffer) => {
      const s = d.toString();
      stdout += s;
      buf += s;
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        const [ev] = parseNdjson(line);
        if (ev && opts.onEvent) opts.onEvent(ev);
      }
    });
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    child.on("error", (err) => {
      resolveP({ flow: flowPath, status: "error", exitCode: 2, steps: [], errorMessage: `could not start kane-cli: ${err.message}` });
    });
    child.on("close", (code) => {
      const r = summarize(flowPath, parseNdjson(stdout), code ?? 2, stderr);
      if (!r.evidencePath) r.evidencePath = newestEvidence(cwd, started);
      resolveP(r);
    });
  });
}

/** `testmd run` always copies its pack to <cwd>/.testmuai/evidence/ — fall back to the newest one written since the run started. */
export function newestEvidence(cwd: string, sinceMs: number): string | undefined {
  const dir = join(cwd, ".testmuai", "evidence");
  if (!existsSync(dir)) return undefined;
  const packs = readdirSync(dir)
    .filter((f) => f.endsWith(".evidence"))
    .map((f) => ({ f: join(dir, f), t: statSync(join(dir, f)).mtimeMs }))
    .filter((p) => p.t >= sinceMs - 1000)
    .sort((a, b) => b.t - a.t);
  return packs[0]?.f;
}

/** Merge several packs into one with `kane-cli evidence merge <packs...> --run-id <id>`. */
export function mergeEvidence(packs: string[], runId: string, out: string, cwd = process.cwd()): { ok: boolean; output: string } {
  const r = spawnSync("kane-cli", ["evidence", "merge", ...packs, "--run-id", runId, "--out", out, "--title", `BotProof ${runId}`], {
    cwd,
    encoding: "utf8",
  });
  return { ok: r.status === 0, output: (r.stdout + r.stderr).trim() };
}
