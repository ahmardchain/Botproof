import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const CONFIG_PATH = "botproof/botproof.config.json";
export const VARIABLES_PATH = "botproof/variables.json";

export interface BotProofConfig {
  /** Where the *_test.md flows live. */
  flowsDir: string;
  /** Chrome user-data dir holding the logged-in Telegram Web session of the TEST account. Keep it outside the repo. */
  chromeProfile: string;
  /** Telegram Web client the flows target. BotProof uses Web K. */
  telegramWeb: string;
  /** Values flows reference as {{name}}. Never put secrets here. */
  variables: Record<string, string>;
  /** Run Chrome headless. */
  headless?: boolean;
  /** Per-flow kill timer in seconds (kane-cli --timeout, applied per step). */
  stepTimeout?: number;
  fix: {
    maxAttempts: number;
    /** Globs the agent may edit. Everything else is refused and reverted. */
    editable: string[];
    /** Files handed to the agent as context. */
    sources: string[];
    /** Agent invocation. The prompt is passed on stdin. */
    agentCommand: string;
    /** Optional: command that runs the bot under test locally (restarted after each patch). */
    botCommand?: string;
    /** Optional: command that redeploys the bot after a patch (used instead of botCommand). */
    deployCommand?: string;
  };
}

export const DEFAULT_CONFIG: BotProofConfig = {
  flowsDir: "botproof/flows",
  chromeProfile: join(homedir(), ".botproof", "chrome-profile"),
  telegramWeb: "https://web.telegram.org/k/",
  variables: {
    bot_username: "your_bot",
    group_link: "https://t.me/your_test_group",
    channel_link: "https://t.me/your_test_channel",
    discussion_link: "https://t.me/your_test_discussion",
    customer_name: "Ada",
    customer_phone: "+2348012345678",
  },
  headless: false,
  fix: {
    maxAttempts: 3,
    editable: ["demo-bot/src/**", "demo-bot/api/**", "demo-bot/public/**"],
    sources: ["demo-bot/src/bot.ts", "demo-bot/src/menu.ts"],
    agentCommand:
      "claude -p --permission-mode acceptEdits --allowedTools Read,Edit,Write,Glob,Grep",
  },
};

/** Paths the fix loop never lets the agent touch, whatever `editable` says. */
export const ALWAYS_PROTECTED = ["botproof/**", "cli/**", ".claude/**", "**/*_test.md", "package.json", ".git/**"];

export function loadConfig(cwd = process.cwd()): BotProofConfig {
  const p = resolve(cwd, CONFIG_PATH);
  if (!existsSync(p)) throw new Error(`No ${CONFIG_PATH} here. Run \`botproof init\` first.`);
  const raw = JSON.parse(readFileSync(p, "utf8")) as Partial<BotProofConfig>;
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    chromeProfile: expandHome(raw.chromeProfile ?? DEFAULT_CONFIG.chromeProfile),
    variables: { ...DEFAULT_CONFIG.variables, ...(raw.variables ?? {}) },
    fix: { ...DEFAULT_CONFIG.fix, ...(raw.fix ?? {}) },
  };
}

export function saveConfig(cfg: BotProofConfig, cwd = process.cwd()) {
  const p = resolve(cwd, CONFIG_PATH);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(cfg, null, 2) + "\n");
}

/** Kane's variables-file shape: { name: { value } }. */
export function writeVariablesFile(cfg: BotProofConfig, cwd = process.cwd()): string {
  const p = resolve(cwd, VARIABLES_PATH);
  const out: Record<string, { value: string }> = {};
  for (const [k, v] of Object.entries(cfg.variables)) out[k] = { value: v };
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(out, null, 2) + "\n");
  return p;
}

export function expandHome(p: string): string {
  return p.startsWith("~/") ? join(homedir(), p.slice(2)) : p;
}
