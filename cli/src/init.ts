import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { join, resolve, sep } from "node:path";
import { CONFIG_PATH, DEFAULT_CONFIG, expandHome, loadConfig, saveConfig, writeVariablesFile, type BotProofConfig } from "./config.js";
import { kaneAvailable, kaneSync } from "./kane.js";
import { discoverFlows } from "./flows.js";

const CONTEXT_PATH = "botproof/telegram-context.md";
const TELEGRAM_CONTEXT = `# Telegram Web (K) — notes for the test agent

- The browser is already logged in to Telegram Web K as a dedicated test account. Never log out or change settings.
- Newest messages are at the bottom. Bot messages are on the left, the test account's on the right.
- Inline buttons sit under the bot message they belong to; an edit in place changes that same bubble.
- Bots can take a few seconds to answer. Wait up to 15 seconds for a reply.
`;
import { bold, dim, green, red, yellow } from "./report.js";

export interface InitArgs {
  yes?: boolean;
  bot?: string;
  group?: string;
  channel?: string;
  discussion?: string;
  profile?: string;
  skipLogin?: boolean;
}

const SAMPLE_FLOW = `---
mode: testing
url: https://web.telegram.org/k/
tags: [smoke, commands]
max_steps: 25
local_context: botproof/telegram-context.md
---

# /start replies with a welcome

## Open the bot chat
Open https://web.telegram.org/k/#@{{bot_username}} and wait until the chat with {{bot_username}} is shown with a message input box at the bottom.

## Send /start
Type /start in the message box and press Enter.

## Check the welcome
Verify that a new message from the bot appears below the /start message and contains the text "Welcome".
`;

export function findChrome(): string | undefined {
  const candidates = [
    process.env.KANE_CLI_CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean) as string[];
  return candidates.find((p) => existsSync(p));
}

function check(ok: boolean, label: string, hint?: string) {
  console.log(`${ok ? green("✔") : red("✘")} ${label}${!ok && hint ? `\n    ${yellow(hint)}` : ""}`);
  return ok;
}

export async function cmdInit(args: InitArgs): Promise<number> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (q: string, def: string) => {
    if (args.yes || !process.stdin.isTTY) return def;
    const a = (await rl.question(`${q} ${dim(`[${def}]`)} `)).trim();
    return a || def;
  };
  try {
    console.log(bold("BotProof init\n"));

    // 1. Environment checks
    const nodeMajor = Number(process.versions.node.split(".")[0]);
    check(nodeMajor >= 20, `Node ${process.versions.node}`, "Node 20+ is required.");
    const chrome = findChrome();
    check(!!chrome, `Google Chrome ${chrome ? dim(chrome) : ""}`, "Install Google Chrome (stable). Kane drives your local Chrome; set KANE_CLI_CHROME_PATH for a non-standard location.");
    const kane = kaneAvailable();
    check(kane.ok, `kane-cli ${kane.version ?? ""}`, "npm install -g @testmuai/kane-cli");
    if (kane.ok) {
      const who = kaneSync(["whoami"]);
      const loggedIn = !/not logged in/i.test(who.stdout + who.stderr);
      check(loggedIn, "kane-cli logged in to TestMu AI", "Run `kane-cli login` (use the account where you claimed your hackathon credits).");
    }

    // 2. Config
    const existing: BotProofConfig = existsSync(CONFIG_PATH) ? loadConfig() : structuredClone(DEFAULT_CONFIG);
    console.log(bold("\nTest Telegram account"));
    console.log(
      yellow(
        "Use a DEDICATED test Telegram account, never your personal one. Its session lives in a Chrome profile\n" +
          "used only by BotProof, outside this repo. Never commit, share or upload that profile.",
      ),
    );
    const profile = resolve(expandHome(args.profile ?? (await ask("Chrome profile directory for the test account:", existing.chromeProfile))));
    if (profile.startsWith(resolve(".") + sep)) {
      console.log(red("  Refusing a profile inside the repo: it would be one `git add` away from leaking the session."));
      return 2;
    }
    mkdirSync(profile, { recursive: true });
    existing.chromeProfile = profile;
    if (kane.ok) {
      const r = kaneSync(["config", "chrome-profile", profile]);
      check(r.status === 0, `Chrome profile set (BotProof runs Kane on a fresh copy of it per flow)`, (r.stderr || r.stdout).trim());
    }

    // 3. Log the test account into Telegram Web inside that profile
    if (!args.skipLogin && chrome && process.stdin.isTTY && !args.yes) {
      const go = await ask("Open Chrome now to log the TEST account into Telegram Web? (y/n)", "y");
      if (go.toLowerCase().startsWith("y")) {
        const child = spawn(chrome, [`--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", existing.telegramWeb], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        console.log("  Scan the QR code with the test account's phone (Settings → Devices → Link Desktop Device),");
        console.log("  wait until your chat list shows, then CLOSE that Chrome window completely.");
        await rl.question("  Press Enter once Chrome is closed… ");
      }
    } else {
      console.log(dim(`  Skipped. Later: "${chrome ?? "google-chrome"}" --user-data-dir="${profile}" ${existing.telegramWeb}`));
    }

    // 4. Bot, group, channel
    console.log(bold("\nBot under test"));
    const bot = (args.bot ?? (await ask("Bot username (without @):", existing.variables.bot_username))).replace(/^@/, "");
    console.log(bold("\nTest group and channel (owned by the test account)"));
    console.log(
      [
        "  1. In Telegram, create a group (e.g. 'BotProof Test Group'), add your bot, make the group public and note its t.me link.",
        "  2. Create a channel (e.g. 'BotProof Specials'), make it public, add your bot as ADMIN with 'Post messages' and 'Edit messages of others'.",
        "  3. Channel → Edit → Discussion: link a discussion group; add the bot there as admin so it can see comments.",
        "  4. Set CHANNEL_ID=@<channel_username> on the bot deployment.",
      ].join("\n"),
    );
    const group = args.group ?? (await ask("Test group link:", existing.variables.group_link));
    const channel = args.channel ?? (await ask("Test channel link:", existing.variables.channel_link));
    const discussion = args.discussion ?? (await ask("Discussion group link:", existing.variables.discussion_link));
    existing.variables = { ...existing.variables, bot_username: bot, group_link: group, channel_link: channel, discussion_link: discussion };

    // 5. Write files
    saveConfig(existing);
    writeVariablesFile(existing);
    mkdirSync(existing.flowsDir, { recursive: true });
    // Only seed a sample into an empty project: never add a duplicate next to existing flows.
    const hasFlows = discoverFlows(existing.flowsDir).length > 0;
    if (!hasFlows) writeFileSync(join(existing.flowsDir, "start_test.md"), SAMPLE_FLOW);
    if (!existsSync(CONTEXT_PATH)) writeFileSync(CONTEXT_PATH, TELEGRAM_CONTEXT);
    const gi = existsSync(".gitignore") ? readFileSync(".gitignore", "utf8") : "";
    const ignores = [".testmuai/evidence/", "botproof/.fix-*", "botproof/runs/**/*.png"].filter((l) => !gi.includes(l));
    if (ignores.length) appendFileSync(".gitignore", `\n# BotProof\n${ignores.join("\n")}\n`);

    console.log(bold(green("\nReady.")));
    console.log(`  config:  ${CONFIG_PATH}`);
    console.log(`  flows:   ${existing.flowsDir}/${hasFlows ? "" : " (sample: start_test.md)"}`);
    console.log(`  next:    botproof run start`);
    return 0;
  } finally {
    rl.close();
  }
}
