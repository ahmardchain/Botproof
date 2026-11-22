import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig, writeVariablesFile, type BotProofConfig } from "./config.js";
import { discoverFlows, selectFlows, type Flow } from "./flows.js";
import { kaneAvailable, mergeEvidence, runFlow, type FlowResult } from "./kane.js";
import { launchChrome, waitForTelegramReady, type ChromeSession } from "./chrome.js";
import { bold, dim, printResult, printSummary, resultsMarkdown, red, yellow } from "./report.js";
import { isEmptyDir, prepareScratchProfile, profileInUse } from "./profile.js";

export interface RunArgs {
  names: string[];
  tags: string[];
  headless?: boolean;
  merge?: boolean;
  verbose?: boolean;
}

export function newRunId(prefix = "run"): string {
  return `${prefix}-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
}

export function resolveFlows(cfg: BotProofConfig, names: string[], tags: string[]): Flow[] {
  const flows = selectFlows(discoverFlows(cfg.flowsDir), names, tags);
  if (flows.length === 0) throw new Error(`No flows match${names.length ? ` ${names.join(", ")}` : ""}${tags.length ? ` tags ${tags.join(", ")}` : ""} in ${cfg.flowsDir}.`);
  return flows;
}

/**
 * Flows run one at a time with `kane-cli testmd run`, not `kane-cli testrun run`:
 * testrun gives every worker a fresh temporary Chrome profile (docs/user-guide/testrun.md),
 * which would drop the logged-in Telegram Web session. See docs/FINDINGS.md.
 */
export async function runFlows(cfg: BotProofConfig, flows: Flow[], opts: { headless?: boolean; verbose?: boolean } = {}): Promise<FlowResult[]> {
  const variablesFile = writeVariablesFile(cfg);
  const results: FlowResult[] = [];
  if (profileInUse(cfg.chromeProfile)) {
    console.log(yellow(`! ${cfg.chromeProfile} looks open in Chrome. Close that Chrome window so its login is fully saved before copying.`));
  }
  for (const f of flows) {
    console.log(dim(`▶ ${f.path}  [${f.tags.join(", ")}]`));
    // Fresh copy of the logged-in master profile for every flow; Kane only ever sees the copy.
    const prof = prepareScratchProfile(cfg.chromeProfile);
    if (!prof.ok) {
      const r: FlowResult = { flow: f.path, status: "error", exitCode: 2, steps: [], errorMessage: prof.reason };
      printResult(r);
      results.push(r);
      continue;
    }
    // BotProof owns the browser: Chrome on the copy, Kane attached over CDP (see chrome.ts).
    let chrome: ChromeSession;
    try {
      chrome = await launchChrome({ userDataDir: prof.path, headless: opts.headless ?? cfg.headless, startUrl: cfg.telegramWeb });
    } catch (e) {
      const r: FlowResult = { flow: f.path, status: "error", exitCode: 2, steps: [], errorMessage: (e as Error).message };
      printResult(r);
      results.push(r);
      continue;
    }
    // Don't hand Kane an offline or logged-out Telegram.
    const tg = await waitForTelegramReady(chrome.endpoint);
    if (tg.state === "logged_out") {
      await chrome.stop();
      const r: FlowResult = { flow: f.path, status: "error", exitCode: 2, steps: [], errorMessage: `Telegram Web shows the login screen in the profile copy: log the test account into ${cfg.chromeProfile} again. Kane was not started (no credits used).` };
      printResult(r);
      results.push(r);
      continue;
    }
    console.log(dim(`    Telegram Web ${tg.state === "ready" ? "connected" : "still syncing (starting anyway)"} after ${Math.round(tg.waitedMs / 1000)}s`));
    const r = await runFlow(f.path, {
      cdpEndpoint: chrome.endpoint,
      variablesFile,
      timeout: cfg.stepTimeout,
      onEvent: (e) => {
        if (e.type === "test_md_step_start") console.log(dim(`    · ${e.heading}`));
        else if (opts.verbose && e.type === undefined && e.remark) console.log(dim(`      ${e.status}: ${e.remark}`));
      },
    });
    await chrome.stop();
    if (isEmptyDir(prof.path)) {
      r.profileWiped = true;
      console.log(red(`        Kane left the run's Chrome profile empty (the master login is untouched).`));
    }
    printResult(r);
    results.push(r);
  }
  return results;
}

export async function cmdRun(args: RunArgs): Promise<number> {
  const k = kaneAvailable();
  if (!k.ok) {
    console.error("kane-cli not found. Install it: npm install -g @testmuai/kane-cli");
    return 2;
  }
  const cfg = loadConfig();
  const flows = resolveFlows(cfg, args.names, args.tags);
  const runId = newRunId();
  console.log(bold(`BotProof · ${flows.length} flow(s) · kane-cli ${k.version} · ${cfg.telegramWeb}`));
  const results = await runFlows(cfg, flows, args);
  printSummary(results);

  const dir = join("botproof", "runs", runId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "results.json"), JSON.stringify({ runId, kane: k.version, results }, null, 2));
  writeFileSync(join(dir, "SUMMARY.md"), `# ${runId}\n\n${resultsMarkdown(results)}\n`);
  if (args.merge) {
    const packs = results.map((r) => r.evidencePath).filter((p): p is string => !!p);
    if (packs.length > 1) {
      const out = join(".testmuai", "evidence", `${runId}.evidence`);
      const m = mergeEvidence(packs, runId, out);
      console.log(m.ok ? `merged evidence pack: ${out}` : `evidence merge failed: ${m.output}`);
    }
  }
  console.log(dim(`run log: ${dir}/SUMMARY.md`));
  if (results.every((r) => r.status === "passed")) return 0;
  return results.some((r) => r.status === "failed") ? 1 : 2;
}
