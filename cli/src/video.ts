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
  const work = join(dir, "video-build");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  // Real-speed footage: keep every moment the screen changes at 1×, cut each still stretch (Kane thinking) to ≤ 0.8 s.
  // Falls back to a uniform speed-up for recordings made before frame timestamps were logged.
  const compact = times.length >= 2 ? compactTimeline(dir, times, work, opts.ffmpeg) : undefined;
  const footageLen = compact ? compact.total : natural;
  const warp = (relT: number) => (compact ? compact.warp(relT) : relT);
  const speed = opts.speed ?? (compact ? Math.max(1, footageLen / 90) : Math.max(1, Math.ceil(natural / 60)));
  const speedLabel = compact && speed <= 1.01 ? "real speed, pauses cut" : `${speed.toFixed(1)}×${compact ? ", pauses cut" : ""}`;
  const ff = (args: string[]) => execFileSync(opts.ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
  const enc = ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30", "-an"];

  // 1. title card
  const status = meta.status === "passed" ? `<span class="pass">PASS</span>` : meta.status === "failed" ? `<span class="fail">FAIL</span>` : esc(meta.status);
  renderPng(`<div class="card"><div class="k">BotProof · Kane CLI in real Telegram Web</div><div class="t">${esc(meta.title || meta.name)}</div><div class="s">${esc(meta.flow.split("\\").join("/"))}</div></div>`, join(work, "title.png"), opts.chrome);
  ff(["-loop", "1", "-i", join(work, "title.png"), "-vf", "fade=t=in:d=0.4,fade=t=out:st=2.1:d=0.4", "-t", "2.5", ...enc, join(work, "1-title.mp4")]);

  // 2. live footage with per-step captions (timeline in recording time, then sped up)
  const t0 = times[0] ?? meta.steps[0]?.t ?? 0;
  const steps = meta.steps.map((s, i) => ({ ...s, a: warp(Math.max(0, s.t - t0)), b: i + 1 < meta.steps.length ? warp(Math.max(0, meta.steps[i + 1].t - t0)) : footageLen + 5 }));
  const inputs = ["-f", "concat", "-safe", "0", "-i", compact ? compact.list : join(dir, "frames.txt")];
  let graph = `[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0f1419,setsar=1,fps=30[v0]`; // constant frame rate so captions/cursor animate between page changes
  steps.forEach((s, i) => {
    const png = join(work, `cap-${i}.png`);
    renderPng(`<div class="cap"><b>Step ${i + 1}/${steps.length}</b>${esc(s.heading)}<span>Kane · live · ${speedLabel} · cursor = Kane's real clicks</span></div>`, png, opts.chrome, true);
    inputs.push("-i", png);
    graph += `;[${i + 1}:v]colorkey=0xff00ff:0.25[c${i}];[v${i}][c${i}]overlay=0:0:enable='between(t,${s.a.toFixed(2)},${s.b.toFixed(2)})'[v${i + 1}]`;
  });
  // cursor drawn from Kane's real clicks (clicks.txt, logged during --record); Kane itself never shows a cursor
  let last = `v${steps.length}`;
  const clicks = readClicks(dir, t0, natural);
  const vp = existsSync(join(dir, "viewport.json")) ? (JSON.parse(readFileSync(join(dir, "viewport.json"), "utf8")) as { w: number; h: number }) : undefined;
  const frame = firstFrameSize(dir, opts.ffmpeg);
  if (clicks.length && vp && frame) {
    const s = Math.min(W / frame.w, H / frame.h);
    const padX = (W - frame.w * s) / 2, padY = (H - frame.h * s) / 2;
    const pts = clicks.map((c) => ({ t: warp(c.t), x: padX + c.x * (frame.w / vp.w) * s, y: padY + c.y * (frame.h / vp.h) * s }));
    const cur = join(work, "cursor.png"), rip = join(work, "ripple.png");
    renderPng(`<svg width="64" height="64" viewBox="0 0 64 64" style="position:absolute;left:0;top:0"><path d="M6 4 L6 50 L18 39 L27 59 L35 55 L26 36 L42 36 Z" fill="#ffffff" stroke="#111" stroke-width="3" stroke-linejoin="round"/></svg>`, cur, opts.chrome, true);
    renderPng(`<div style="position:absolute;left:0;top:0;width:96px;height:96px;border-radius:50%;border:6px solid #2aabee;background:rgba(42,171,238,.35)"></div>`, rip, opts.chrome, true);
    const n = inputs.filter((x) => x === "-i").length;
    inputs.push("-i", cur, "-i", rip);
    const X = cursorExpr(pts, "x"), Y = cursorExpr(pts, "y");
    const enableRip = pts.map((p) => `between(t,${p.t.toFixed(2)},${(p.t + 0.45).toFixed(2)})`).join("+");
    const rx = ripExpr(pts, "x"), ry = ripExpr(pts, "y");
    graph += `;[${n}:v]crop=64:64:0:0,colorkey=0xff00ff:0.3[cur];[${n + 1}:v]crop=96:96:0:0,colorkey=0xff00ff:0.3[rip]`;
    graph += `;[${last}][rip]overlay=x='${rx}-48':y='${ry}-48':enable='${enableRip}'[vr];[vr][cur]overlay=x='${X}-6':y='${Y}-4'[vc]`;
    last = "vc";
  }
  graph += `;[${last}]setpts=PTS/${speed},fps=30,fade=t=in:d=0.3[out]`;
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


/**
 * Find the frames where the screen visibly changes (ffmpeg mpdecimate on a blurred, downscaled copy, so a blinking
 * caret doesn't count) and build a timeline that plays those at real speed while capping every still stretch.
 */
function compactTimeline(dir: string, times: number[], work: string, ffmpeg: string, hold = 0.8) {
  const rel = times.map((t) => t - times[0]);
  const r = spawnSync(ffmpeg, ["-hide_banner", "-f", "concat", "-safe", "0", "-i", join(dir, "frames.txt"), "-vf", "scale=480:-2,boxblur=2:1,mpdecimate=hi=64*20:lo=64*6:frac=0.2,showinfo", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  const keptT = [...r.stderr.matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1]));
  const nearest = (t: number) => {
    let lo = 0, hi = rel.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (rel[mid] < t - 1e-3) lo = mid + 1; else hi = mid; }
    return lo;
  };
  const idx = [...new Set([0, ...keptT.map(nearest), rel.length - 1])].sort((a, b) => a - b);
  const files = readFileSync(join(dir, "times.txt"), "utf8").trim().split("\n").map((l) => l.split(" ")[0]);
  const start: number[] = [], dur: number[] = [];
  let acc = 0;
  idx.forEach((i, j) => {
    const gap = j + 1 < idx.length ? rel[idx[j + 1]] - rel[i] : 1;
    const d = Math.min(Math.max(gap, 1 / 30), hold);
    start.push(acc); dur.push(d); acc += d;
  });
  const list = join(work, "frames-compact.txt");
  writeFileSync(list, idx.map((i, j) => `file '${resolve(dir, files[i]).replace(/'/g, "'\\''")}'\nduration ${dur[j].toFixed(3)}`).join("\n") + `\nfile '${resolve(dir, files[idx[idx.length - 1]]).replace(/'/g, "'\\''")}'\n`);
  const warp = (t: number) => {
    let j = 0;
    while (j + 1 < idx.length && rel[idx[j + 1]] <= t) j++;
    return start[j] + Math.min(Math.max(0, t - rel[idx[j]]), dur[j]);
  };
  return { list, total: acc, warp, kept: idx.length, of: rel.length };
}

/** Clicks logged during --record, in recording time (seconds since the first frame). */
function readClicks(dir: string, t0: number, natural: number): { t: number; x: number; y: number }[] {
  const f = join(dir, "clicks.txt");
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map((l) => {
    const [t, x, y] = l.split(" ").map(Number);
    return { t: t - t0, x, y };
  }).filter((c) => c.t >= 0 && c.t <= natural && Number.isFinite(c.x) && Number.isFinite(c.y));
}

function firstFrameSize(dir: string, ffmpeg: string): { w: number; h: number } | undefined {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-i", join(dir, "f000001.jpg")], { encoding: "utf8" });
  const m = /, (\d{2,5})x(\d{2,5})/.exec(r.stderr);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : undefined;
}

/** Cursor position over time: rests on each click, glides (smoothstep, 0.7 s) to the next one. */
function cursorExpr(pts: { t: number; x: number; y: number }[], k: "x" | "y"): string {
  const v = (i: number) => pts[i][k].toFixed(1);
  let e = v(pts.length - 1);
  for (let i = pts.length - 1; i >= 1; i--) {
    const b = pts[i].t, a = Math.max(pts[i - 1].t, b - 0.7);
    const u = `((t-${a.toFixed(2)})/${Math.max(0.05, b - a).toFixed(2)})`;
    e = `if(lt(t,${a.toFixed(2)}),${v(i - 1)},if(lt(t,${b.toFixed(2)}),${v(i - 1)}+(${v(i)}-${v(i - 1)})*${u}*${u}*(3-2*${u}),${e}))`;
  }
  return e;
}

function ripExpr(pts: { t: number; x: number; y: number }[], k: "x" | "y"): string {
  let e = pts[pts.length - 1][k].toFixed(1);
  for (let i = pts.length - 2; i >= 0; i--) e = `if(lt(t,${(pts[i + 1].t - 0.01).toFixed(2)}),${pts[i][k].toFixed(1)},${e})`;
  return e;
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
