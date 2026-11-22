// botproof video [recording-dir...] [--speed N]
// Turns a `botproof run --record` capture into a shareable MP4: a title card, Kane's live
// Telegram Web footage (sped up), a caption naming the step Kane is on, and a PASS/FAIL card.
// Kane has no video output; BotProof films the Chrome it owns (see chrome.ts startScreencast).
import { spawnSync, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { findChrome } from "./chrome.js";
import { bold, dim, green, red, yellow } from "./report.js";

const W = 1920;
const H = 1080;

export function findFfmpeg(): string | undefined {
  const cands: string[] = [];
  if (process.env.FFMPEG) cands.push(process.env.FFMPEG);
  try {
    const p = createRequire(import.meta.url)("ffmpeg-static") as string | null;
    if (p) cands.push(p);
  } catch {
    /* optional dependency not installed */
  }
  cands.push("ffmpeg");
  return cands.find((c) => spawnSync(c, ["-version"], { stdio: "ignore" }).status === 0);
}

interface RunMeta {
  flow: string;
  name: string;
  title: string;
  status: string;
  durationS?: number;
  failure?: { stepIndex: number; heading: string; remark: string };
  steps: { t: number; heading: string }[];
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const CSS = `*{box-sizing:border-box}html,body{margin:0;width:${W}px;height:${H}px;font-family:"Segoe UI",system-ui,sans-serif}
.card{width:100%;height:100%;background:#0f1419;color:#e8edf2;display:flex;flex-direction:column;justify-content:center;padding:0 140px}
.k{font-size:34px;color:#7cc4ff;letter-spacing:2px;text-transform:uppercase}.t{font-size:76px;font-weight:700;margin:18px 0}.s{font-size:38px;color:#c9d3dc}
.pass{color:#7ee787}.fail{color:#ff7b72}
.cap{position:absolute;left:0;right:0;bottom:0;height:104px;background:#0b0f13;color:#e8edf2;display:flex;align-items:center;padding:0 56px;font-size:38px}
.cap b{color:#7cc4ff;margin-right:20px}.cap span{margin-left:auto;color:#6b7b8a;font-size:30px}`;

function renderPng(html: string, out: string, chrome: string, transparentKey = false) {
  const file = out.replace(/\.png$/, ".html");
  writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}${transparentKey ? "html,body{background:#ff00ff}" : ""}</style></head><body>${html}</body></html>`);
  const profile = join(tmpdir(), `botproof-video-${process.pid}`);
  spawnSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", `--user-data-dir=${profile}`, `--window-size=${W},${H}`, `--screenshot=${out}`, pathToFileURL(file).href], { stdio: "ignore", timeout: 60_000 });
  if (!existsSync(out)) throw new Error(`Chrome could not render ${file}`);
}

/** Recordings to process: the given folders, or every capture without a video yet. */
function targets(args: string[]): string[] {
  if (args.length) return args.map((a) => resolve(a));
  const root = join("botproof", "recordings");
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .map((d) => join(root, d))
    .filter((d) => existsSync(join(d, "frames.txt")) && !existsSync(join(d, "video.mp4")));
}

export function makeVideo(dir: string, opts: { speed?: number; ffmpeg: string; chrome: string }): string {
  const meta: RunMeta = existsSync(join(dir, "run.json"))
    ? JSON.parse(readFileSync(join(dir, "run.json"), "utf8"))
    : { flow: dir, name: dir.split(/[\\/]/).pop()!, title: "", status: "unknown", steps: [] };
  const times = existsSync(join(dir, "times.txt"))
    ? readFileSync(join(dir, "times.txt"), "utf8").trim().split("\n").map((l) => Number(l.split(" ")[1]))
    : [];
  const natural = readFileSync(join(dir, "frames.txt"), "utf8").split("\n").filter((l) => l.startsWith("duration ")).reduce((a, l) => a + Number(l.slice(9)), 0);
  if (natural < 1) throw new Error(`${dir}: recording too short`);
  const speed = opts.speed ?? Math.max(1, Math.ceil(natural / 60)); // aim for ≤ 60 s of footage
  const work = join(dir, "video-build");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  const ff = (args: string[]) => execFileSync(opts.ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
  const enc = ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30", "-an"];

  // 1. title card
  const status = meta.status === "passed" ? `<span class="pass">PASS</span>` : meta.status === "failed" ? `<span class="fail">FAIL</span>` : esc(meta.status);
  renderPng(`<div class="card"><div class="k">BotProof · Kane CLI in real Telegram Web</div><div class="t">${esc(meta.title || meta.name)}</div><div class="s">${esc(meta.flow.split("\\").join("/"))}</div></div>`, join(work, "title.png"), opts.chrome);
  ff(["-loop", "1", "-i", join(work, "title.png"), "-vf", "fade=t=in:d=0.4,fade=t=out:st=2.1:d=0.4", "-t", "2.5", ...enc, join(work, "1-title.mp4")]);

  // 2. live footage with per-step captions (timeline in recording time, then sped up)
  const t0 = times[0] ?? meta.steps[0]?.t ?? 0;
  const steps = meta.steps.map((s, i) => ({ ...s, a: Math.max(0, s.t - t0), b: i + 1 < meta.steps.length ? Math.max(0, meta.steps[i + 1].t - t0) : natural + 5 }));
  const inputs = ["-f", "concat", "-safe", "0", "-i", join(dir, "frames.txt")];
  let graph = `[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0f1419,setsar=1[v0]`;
  steps.forEach((s, i) => {
    const png = join(work, `cap-${i}.png`);
    renderPng(`<div class="cap"><b>Step ${i + 1}/${steps.length}</b>${esc(s.heading)}<span>Kane · live · ${speed}×</span></div>`, png, opts.chrome, true);
    inputs.push("-i", png);
    graph += `;[${i + 1}:v]colorkey=0xff00ff:0.25[c${i}];[v${i}][c${i}]overlay=0:0:enable='between(t,${s.a.toFixed(2)},${s.b.toFixed(2)})'[v${i + 1}]`;
  });
  graph += `;[v${steps.length}]setpts=PTS/${speed},fps=30,fade=t=in:d=0.3[out]`;
  ff([...inputs, "-filter_complex", graph, "-map", "[out]", ...enc, join(work, "2-live.mp4")]);

  // 3. verdict card
  const why = meta.failure ? `<div class="s">Step ${meta.failure.stepIndex} “${esc(meta.failure.heading)}”: ${esc(meta.failure.remark).slice(0, 220)}</div>` : `<div class="s">${meta.durationS ? `${Math.round(meta.durationS)} s in Telegram Web · ` : ""}evidence pack sealed by Kane</div>`;
  renderPng(`<div class="card"><div class="k">${esc(meta.name)}</div><div class="t">${status}</div>${why}</div>`, join(work, "end.png"), opts.chrome);
  ff(["-loop", "1", "-i", join(work, "end.png"), "-vf", "fade=t=in:d=0.4", "-t", "3", ...enc, join(work, "3-end.mp4")]);

  const list = join(work, "parts.txt");
  writeFileSync(list, ["1-title.mp4", "2-live.mp4", "3-end.mp4"].map((f) => `file '${f}'`).join("\n") + "\n");
  const out = join(dir, "video.mp4");
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", out]);
  rmSync(work, { recursive: true, force: true });
  return out;
}

export function cmdVideo(args: string[], speed?: number): number {
  const ffmpeg = findFfmpeg();
  const chrome = findChrome();
  if (!ffmpeg) {
    console.error("ffmpeg not found: install it, set FFMPEG=/path/to/ffmpeg, or `npm install ffmpeg-static`.");
    return 2;
  }
  if (!chrome) {
    console.error("Google Chrome not found (it renders the title and caption cards).");
    return 2;
  }
  const dirs = targets(args);
  if (dirs.length === 0) {
    console.log(yellow("No recordings without a video. Record one with: botproof run <flow> --record"));
    return 0;
  }
  let code = 0;
  for (const d of dirs) {
    try {
      const out = makeVideo(d, { speed, ffmpeg, chrome });
      console.log(`${green("✔")} ${bold(out)}`);
    } catch (e) {
      console.log(`${red("✘")} ${d}: ${(e as Error).message}`);
      code = 1;
    }
  }
  console.log(dim("Each video: title card → Kane's live Telegram Web footage with step captions → PASS/FAIL card."));
  return code;
}
