// BotProof starts Chrome itself on the per-flow copy of the logged-in profile, with remote
// debugging on, and hands Kane the endpoint (`kane-cli testmd run --cdp-endpoint <url>`).
//
// Why: in kane-cli 0.10.7 the testmd launcher can start Chrome in a fresh temp profile
// (%TEMP%\kane-clean-*) instead of the configured one, which lands on Telegram's QR login
// (seen 22 Nov, docs/FINDINGS.md). When a CDP endpoint is given, kane-cli attaches to that browser
// and skips its own profile handling entirely, so Kane always drives the logged-in session.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";

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

function freePort(): Promise<number> {
  return new Promise((res, rej) => {
    const s = createServer();
    s.unref();
    s.on("error", rej);
    s.listen(0, "127.0.0.1", () => {
      const port = (s.address() as { port: number }).port;
      s.close(() => res(port));
    });
  });
}

/**
 * Stop a Chrome left running on this profile by an earlier BotProof run that was killed
 * (e.g. the agent's shell stopped it). Matches only processes whose command line carries this
 * exact --user-data-dir, so the user's own Chrome is never touched.
 */
export function killChromeOnProfile(userDataDir: string): void {
  if (process.platform === "win32") {
    const dir = userDataDir.replace(/'/g, "''");
    const ps = `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*--user-data-dir=${dir}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
    spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], { stdio: "ignore" });
  } else {
    spawnSync("pkill", ["-f", "--", `--user-data-dir=${userDataDir}`], { stdio: "ignore" });
  }
}

/** Chromes started by this process, stopped on Ctrl-C / kill / exit. */
const live = new Set<ChromeSession>();
let hooked = false;
function hookExit() {
  if (hooked) return;
  hooked = true;
  const killAll = () => {
    for (const s of live) s.killNow();
  };
  process.on("exit", killAll);
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"] as const) {
    try {
      process.on(sig, () => {
        killAll();
        process.exit(130);
      });
    } catch {
      /* signal not supported on this platform */
    }
  }
}

export interface ChromeSession {
  killNow: () => void;
  endpoint: string;
  stop: () => Promise<void>;
}

export async function launchChrome(opts: { userDataDir: string; headless?: boolean; startUrl?: string; width?: number; height?: number }): Promise<ChromeSession> {
  const bin = findChrome();
  if (!bin) throw new Error("Google Chrome not found (set KANE_CLI_CHROME_PATH).");
  const port = await freePort();
  const args = [
    `--remote-debugging-port=${port}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${opts.userDataDir}`,
    `--window-size=${opts.width ?? 1920},${opts.height ?? 1080}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-notifications",
    "--disable-popup-blocking",
  ];
  if (opts.headless) args.push("--headless=new");
  args.push(opts.startUrl ?? "about:blank");
  const child: ChildProcess = spawn(bin, args, { stdio: "ignore" });
  let exited = false;
  child.on("exit", () => (exited = true));

  const endpoint = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30_000;
  for (;;) {
    if (exited) throw new Error(`Chrome exited during startup (profile ${opts.userDataDir}; is another Chrome using it?)`);
    try {
      const r = await fetch(`${endpoint}/json/version`);
      if (r.ok) break;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) {
      child.kill();
      throw new Error(`Chrome did not open its debugging port ${port} within 30 s`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  const killNow = () => {
    if (exited) return;
    if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGKILL");
  };
  const session: ChromeSession = {
    endpoint,
    killNow,
    stop: async () => {
      live.delete(session);
      if (exited) return;
      if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      else child.kill("SIGTERM");
      const until = Date.now() + 10_000;
      while (!exited && Date.now() < until) await new Promise((r) => setTimeout(r, 200));
      if (!exited) child.kill("SIGKILL");
      killChromeOnProfile(opts.userDataDir); // renderer/GPU children that outlived the browser
    },
  };
  live.add(session);
  hookExit();
  return session;
}
