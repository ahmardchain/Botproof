#!/usr/bin/env node
// Renders film.html (deterministic, time-driven scenes) frame by frame with Playwright,
// pipes the frames to ffmpeg, and lays the narration under each scene.
// Usage: node tools/demo-video/film/render-film.mjs <dir-with-narration-wavs> [--fps 30] [--preview]
//   narration files: 01-problem 02-what 03-private 04-group-channel 05-bug-loop 05b-install 06-close (.wav/.m4a/.mp3)
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = dirname(fileURLToPath(import.meta.url));
const voDir = resolve(process.argv[2] ?? join(here, "..", "audio"));
const fps = Number(process.argv.includes("--fps") ? process.argv[process.argv.indexOf("--fps") + 1] : 30);
const preview = process.argv.includes("--preview");
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const out = join(here, "..", "out");
mkdirSync(out, { recursive: true });

const ORDER = ["01-problem", "02-what", "03-private", "04-group-channel", "05-bug-loop", "05b-install", "06-close"];
const findVo = (id) => ["wav", "m4a", "mp3"].map((e) => join(voDir, `${id}.${e}`)).find(existsSync);
const dur = (f) => {
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(spawnSync(ffmpeg, ["-hide_banner", "-i", f], { encoding: "utf8" }).stderr);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
};
const vo = ORDER.map((id) => {
  const f = findVo(id);
  if (!f) throw new Error(`missing narration ${id} in ${voDir}`);
  return { id, f, d: dur(f) };
});
const LEAD = 0.5, TAIL = 0.9, INTRO = 3.5, OUTRO = 5;
const D = [INTRO, ...vo.map((v, i) => LEAD + v.d + TAIL + (i === vo.length - 1 ? OUTRO : 0))];
const total = D.reduce((a, b) => a + b, 0);
console.log(`scenes: ${D.map((d) => d.toFixed(1)).join(" + ")} = ${total.toFixed(1)} s`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.addInitScript((d) => (window.DUR = d), D);
await page.goto(pathToFileURL(join(here, "film.html")).href);
await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));

const silent = join(out, preview ? "film-preview-video.mp4" : "film-video.mp4");
const enc = spawn(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
  "-c:v", "libx264", "-preset", preview ? "veryfast" : "slow", "-crf", preview ? "26" : "17", "-pix_fmt", "yuv420p", "-r", String(fps), silent], { stdio: ["pipe", "inherit", "inherit"] });
const frames = Math.round(total * fps);
const step = preview ? 3 : 1; // preview: every 3rd frame, held
const t0 = Date.now();
for (let i = 0; i < frames; i += step) {
  await page.evaluate((t) => window.render(t), i / fps);
  const jpg = await page.screenshot({ type: "jpeg", quality: 92 });
  for (let r = 0; r < Math.min(step, frames - i); r++) if (!enc.stdin.write(jpg)) await new Promise((res) => enc.stdin.once("drain", res));
  if (i % (fps * 10) === 0) process.stdout.write(`\r  frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
enc.stdin.end();
await new Promise((res) => enc.on("close", res));
await browser.close();
console.log("\n  video done");

// narration: each segment starts LEAD seconds into its scene
let start = INTRO;
const inputs = [], filters = [];
vo.forEach((v, i) => {
  inputs.push("-i", v.f);
  const ms = Math.round((start + LEAD) * 1000);
  filters.push(`[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[a${i}]`);
  start += D[i + 1];
});
const mix = `${filters.join(";")};${vo.map((_, i) => `[a${i}]`).join("")}amix=inputs=${vo.length}:normalize=0,apad,atrim=0:${total.toFixed(3)}[aout]`;
const final = join(out, preview ? "botproof-demo-preview.mp4" : "botproof-demo.mp4");
const r = spawnSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-i", silent, ...inputs, "-filter_complex", mix, "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", final], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`✔ ${final}  (${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, "0")})`);
