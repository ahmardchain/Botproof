#!/usr/bin/env node
import { cmdFix } from "./fix.js";
import { cmdHook } from "./hook.js";
import { cmdInit } from "./init.js";
import { cmdRun } from "./run.js";
import { cmdWhy } from "./why.js";
import { discoverFlows } from "./flows.js";
import { loadConfig } from "./config.js";

const HELP = `botproof — end-to-end tests for Telegram bots, driven by Kane CLI in real Telegram Web

Usage:
  botproof init [--bot <username>] [--group <link>] [--channel <link>] [--discussion <link>] [--profile <dir>] [--yes] [--skip-login]
  botproof list                         List flows and their tags
  botproof run [flow...] [--tag <t>]... [--headless] [--merge] [--verbose]
  botproof fix [flow...] [--tag <t>]... [--headless] [--max-attempts <n>] [--step]
  botproof why <run-dir|pack>...        Show Kane's failure record + screenshot for failed flows
  botproof hook                         Claude Code PreToolUse guard (reads hook JSON on stdin)

Exit codes: 0 pass · 1 flow failed / escalated · 2 setup or Kane error · 10 (fix --step) a patch is needed`;

function parse(argv: string[]) {
  const pos: string[] = [];
  const flags: Record<string, string | boolean> = {};
  const tags: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tag" || a === "--tags") tags.push(...argv[++i].split(","));
    else if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (["bot", "group", "channel", "discussion", "profile", "max-attempts"].includes(key) && next !== undefined) flags[key] = argv[++i];
      else flags[key] = true;
    } else pos.push(a);
  }
  return { pos, flags, tags: tags.map((t) => t.trim()).filter(Boolean) };
}

async function main(): Promise<number> {
  const [cmd, ...rest] = process.argv.slice(2);
  const { pos, flags, tags } = parse(rest);
  switch (cmd) {
    case "init":
      return cmdInit({
        yes: !!flags.yes,
        skipLogin: !!flags["skip-login"],
        bot: flags.bot as string | undefined,
        group: flags.group as string | undefined,
        channel: flags.channel as string | undefined,
        discussion: flags.discussion as string | undefined,
        profile: flags.profile as string | undefined,
      });
    case "list": {
      const cfg = loadConfig();
      for (const f of discoverFlows(cfg.flowsDir)) console.log(`${f.name.padEnd(28)} ${f.tags.join(", ").padEnd(28)} ${f.title}`);
      return 0;
    }
    case "run":
      return cmdRun({ names: pos, tags, headless: !!flags.headless, merge: !!flags.merge, verbose: !!flags.verbose });
    case "fix":
      return cmdFix({
        names: pos,
        tags,
        headless: !!flags.headless,
        step: !!flags.step,
        maxAttempts: flags["max-attempts"] ? Number(flags["max-attempts"]) : undefined,
      });
    case "why":
      return cmdWhy(pos);
    case "hook":
      return cmdHook();
    case undefined:
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      return 0;
    default:
      console.error(`unknown command: ${cmd}\n\n${HELP}`);
      return 2;
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`botproof: ${err instanceof Error ? err.message : err}`);
    process.exit(2);
  },
);
