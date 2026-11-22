#!/usr/bin/env node
// Builds the BotProof demo video from REAL material only:
//  - Kane's own per-step screenshots from the evidence packs of real runs (found on this machine),
//  - cards with real flow files, the real fix-loop log and the real patch,
//  - a narration track (audio/<segment>.mp3, downloaded from audio.json URLs when missing).
// Each segment lasts as long as its narration; its visuals share that time.
//
// Usage (repo root):  npm --prefix tools/demo-video install
//                     node tools/demo-video/make-video.mjs   →  tools/demo-video/out/botproof-demo.mp4
// Needs: Google Chrome (to render cards), the evidence packs (kane-cli keeps them in
// ~/.testmuai/kaneai/sessions/*/evidence and .testmuai/evidence), the CLI built (npm run build).
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const cli = (m) => import(pathToFileURL(join(root, "cli", "dist", m)).href);
const { findChrome } = await cli("chrome.js");
const { listZip, readZipEntry } = await cli("evidence.js");
const { locatePack } = await cli("why.js");

const W = 1920, H = 1080;
const require = createRequire(import.meta.url);
const ffmpeg = process.env.FFMPEG || (() => { try { return require("ffmpeg-static"); } catch { return "ffmpeg"; } })();
const chrome = findChrome();
if (!chrome) throw new Error("Google Chrome not found");

const build = join(here, "build");
const out = join(here, "out");
rmSync(build, { recursive: true, force: true });
mkdirSync(build, { recursive: true });
mkdirSync(out, { recursive: true });
mkdirSync(join(here, "audio"), { recursive: true });

const story = JSON.parse(readFileSync(join(here, "storyboard.json"), "utf8"));
const audioUrls = existsSync(join(here, "audio.json")) ? JSON.parse(readFileSync(join(here, "audio.json"), "utf8")) : {};

// ---------- helpers ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const CSS = `*{box-sizing:border-box}body{margin:0;width:${W}px;height:${H}px;background:#0f1419;color:#e8edf2;font-family:"Segoe UI",system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:90px 120px}
h1{font-size:120px;margin:0 0 24px;color:#7cc4ff;letter-spacing:-2px}h2{font-size:58px;margin:0 0 44px;color:#7cc4ff}
.sub{font-size:44px;color:#c9d3dc;white-space:pre-line;line-height:1.35}ul{margin:0;padding-left:50px}li{font-size:44px;line-height:1.35;margin:0 0 26px}
pre{font-family:Consolas,"Cascadia Mono",Menlo,monospace;font-size:27px;line-height:1.45;background:#161d24;border:1px solid #2a3540;border-radius:14px;padding:34px 40px;margin:0;white-space:pre-wrap;overflow:hidden;max-height:800px}
.add{color:#7ee787}.del{color:#ff7b72}.tag{position:absolute;right:60px;bottom:40px;font-size:26px;color:#6b7b8a}
.frame{position:absolute;inset:0;padding:30px 60px 120px;display:flex;align-items:center;justify-content:center}.frame img{max-width:100%;max-height:100%;border-radius:12px;box-shadow:0 10px 40px #000a}
.cap{position:absolute;left:0;right:0;bottom:0;height:100px;background:#0b0f13;display:flex;align-items:center;padding:0 60px;font-size:36px;color:#e8edf2}.cap b{color:#7cc4ff;margin-right:18px}`;

function page(body, tag = true) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}${tag ? '<div class="tag">BotProof · Kane CLI · real runs, 22 Nov 2026</div>' : ""}</body></html>`;
}

let n = 0;
function render(html) {
  const id = String(++n).padStart(4, "0");
  const htmlPath = join(build, `${id}.html`);
  const png = join(build, `${id}.png`);
  writeFileSync(htmlPath, html);
  const profile = join(tmpdir(), `botproof-video-chrome-${process.pid}`);
  spawnSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", `--user-data-dir=${profile}`, `--window-size=${W},${H}`, `--screenshot=${png}`, pathToFileURL(htmlPath).href], { stdio: "ignore", timeout: 60_000 });
  if (!existsSync(png)) throw new Error(`Chrome did not render ${htmlPath}`);
  return png;
}

function codeHtml(text) {
  return text
    .split("\n")
    .map((l) => (l.startsWith("+") ? `<span class="add">${esc(l)}</span>` : l.startsWith("-") ? `<span class="del">${esc(l)}</span>` : esc(l)))
    .join("\n");
}

function packFrames(v) {
  const p = locatePack(v.pack);
  if (!p) {
    console.warn(`  ! pack ${v.pack} not found on this machine — showing a placeholder card`);
    return [render(page(`<h2>${esc(v.label)}</h2><div class="sub">(evidence pack ${esc(v.pack)} not found on this machine)</div>`))];
  }
  const buf = readFileSync(p);
  const entries = listZip(buf);
  const steps = [...new Set(entries.map((e) => /^(tests\/[^/]+\/steps\/[^/]+)\//.exec(e.name)?.[1]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  const shots = steps
    .map((d) => entries.find((e) => e.name === `${d}/annotated.png`) ?? entries.find((e) => e.name === `${d}/screenshot.png`))
    .filter(Boolean);
  if (shots.length === 0) return [render(page(`<h2>${esc(v.label)}</h2><div class="sub">(no screenshots in this pack)</div>`))];
  const max = Math.max(1, v.max ?? 4);
  let pick;
  if (v.last) pick = shots.slice(-max);
  else if (shots.length <= max) pick = shots;
  else pick = Array.from({ length: max }, (_, i) => shots[Math.round((i * (shots.length - 1)) / (max - 1 || 1))]);
  return pick.map((e, i) => {
    const img = join(build, `shot-${++n}.png`);
    writeFileSync(img, readZipEntry(buf, e));
    return render(
      page(`<div class="frame"><img src="${pathToFileURL(img).href}"></div><div class="cap"><b>Kane</b>${esc(v.label)}<span style="margin-left:auto;color:#6b7b8a">${i + 1}/${pick.length}</span></div>`, false),
    );
  });
}

function stats() {
  const runs = join(root, "botproof", "runs");
  const passed = new Set();
  const failedFlows = new Set();
  let credits = 0;
  for (const d of existsSync(runs) ? readdirSync(runs) : []) {
    for (const f of ["SUMMARY.md", "LOG.md"]) {
      const p = join(runs, d, f);
      if (!existsSync(p)) continue;
      for (const m of readFileSync(p, "utf8").matchAll(/^\| (\S+_test\.md) \| (\w+) \| \d+s \| ([\d.]+|–) \|/gm)) {
        const flow = m[1].split(/[\\/]/).pop().replace(/_test\.md$/, "");
        if (m[2] === "passed") passed.add(flow);
        else failedFlows.add(flow);
        if (m[3] !== "–") credits += Number(m[3]);
      }
    }
  }
  const items = [
    `${passed.size} flows passing live in Telegram Web: ${[...passed].sort().join(", ")}`,
    `1 real bug caught by Kane and fixed by the closed loop (docs/caught.md)`,
    `≈${Math.round(credits / 10) * 10} Kane credits across all runs so far`,
  ];
  return [render(page(`<h2>Real runs, real evidence</h2><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`))];
}

function visual(v) {
  switch (v.type) {
    case "title":
      return [{ png: render(page(`<h1>${esc(v.title)}</h1><div class="sub">${esc(v.subtitle ?? "")}</div>`)), weight: 2 }];
    case "bullets":
      return [{ png: render(page(`<h2>${esc(v.title)}</h2><ul>${v.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`)), weight: 2.5 }];
    case "code": {
      let text = v.text ?? readFileSync(join(root, v.file), "utf8");
      if (v.from && text.includes(v.from)) text = text.slice(text.indexOf(v.from));
      text = text.split("\n").slice(0, 26).join("\n");
      return [{ png: render(page(`<h2>${esc(v.title)}</h2><pre>${codeHtml(text)}</pre>`)), weight: 3 }];
    }
    case "pack":
      return packFrames(v).map((png) => ({ png, weight: 1 }));
    case "stats":
      return stats().map((png) => ({ png, weight: 2.5 }));
    case "recording": {
      // A BotProof --record capture of Kane driving Telegram Web: newest folder whose name ends with -<flow>.
      const dir = join(root, "botproof", "recordings");
      const hit = existsSync(dir) ? readdirSync(dir).filter((d) => d.endsWith(`-${v.flow}`)).sort().at(-1) : undefined;
      if (!hit || !existsSync(join(dir, hit, "frames.txt"))) {
        console.warn(`  ! no recording for ${v.flow} (run: botproof run ${v.flow} --record) — skipped`);
        return [];
      }
      const list = join(dir, hit, "frames.txt");
      const natural = readFileSync(list, "utf8").split("\n").filter((l) => l.startsWith("duration ")).reduce((a, l) => a + Number(l.slice(9)), 0);
      return [{ video: list, natural, label: v.label, weight: v.weight ?? 5 }];
    }
    default:
      throw new Error(`unknown visual type ${v.type}`);
  }
}

function audioDuration(file) {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-i", file], { encoding: "utf8" });
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr);
  if (!m) throw new Error(`cannot read duration of ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

async function ensureAudio(id) {
  const file = join(here, "audio", `${id}.mp3`);
  if (existsSync(file)) return file;
  const url = audioUrls[id];
  if (!url) return undefined;
  console.log(`  downloading narration ${id}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`narration ${id}: HTTP ${res.status} (signed URL expired? ask for fresh links)`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

// ---------- build ----------
if (process.argv.includes("--audio-only")) {
  for (const seg of story.segments) console.log(`${seg.id}: ${(await ensureAudio(seg.id)) ?? "no narration"}`);
  process.exit(0);
}
const segFiles = [];
for (const seg of story.segments) {
  console.log(`▶ ${seg.id}`);
  const audio = await ensureAudio(seg.id);
  const frames = seg.visuals.flatMap(visual);
  const total = audio ? audioDuration(audio) + 1.2 : frames.reduce((s, f) => s + f.weight * 2, 0);
  const wsum = frames.reduce((s, f) => s + f.weight, 0);
  const clips = [];
  frames.forEach((f, i) => {
    const d = (f.weight / wsum) * total;
    const clip = join(build, `${seg.id}-${String(i).padStart(2, "0")}.mp4`);
    const vf = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x0f1419,fps=30,format=yuv420p`;
    let args;
    if (f.video) {
      // speed the real-time recording to fill its slot; overlay a caption bar rendered by Chrome
      const factor = d / Math.max(0.5, f.natural);
      const cap = render(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}html,body{background:#ff00ff;padding:0}</style></head><body><div class="cap"><b>Kane · live</b>${esc(f.label ?? "")}</div></body></html>`);
      args = ["-f", "concat", "-safe", "0", "-i", f.video, "-i", cap, "-filter_complex", `[0:v]setpts=${factor.toFixed(5)}*PTS,${vf}[v];[1:v]format=rgba,colorkey=0xff00ff:0.25[c];[v][c]overlay=0:0[o]`, "-map", "[o]"];
    } else {
      args = ["-loop", "1", "-i", f.png, "-vf", vf];
    }
    execFileSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", ...args, "-t", d.toFixed(3), "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", "30", clip], { stdio: "inherit" });
    clips.push(clip);
  });
  const listFile = join(build, `${seg.id}.txt`);
  writeFileSync(listFile, clips.map((c) => `file '${c.replace(/'/g, "'\\''")}'`).join("\n") + "\n");
  const segOut = join(build, `${seg.id}.mp4`);
  const args = ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listFile];
  if (audio) args.push("-i", audio);
  else args.push("-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo");
  args.push("-af", "apad", "-t", total.toFixed(3), "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2", segOut);
  execFileSync(ffmpeg, args, { stdio: "inherit" });
  if (!audio) console.warn(`  ! no narration for ${seg.id} (silent)`);
  segFiles.push(segOut);
}
const concat = join(build, "segments.txt");
writeFileSync(concat, segFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n") + "\n");
const final = join(out, "botproof-demo.mp4");
execFileSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concat, "-c", "copy", "-movflags", "+faststart", final], { stdio: "inherit" });
const secs = audioDuration(final);
console.log(`\n✔ ${final}  (${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, "0")})`);
