#!/usr/bin/env node
// Free narration for the demo video: Microsoft Edge's online neural voices via the
// msedge-tts package (no account, no key). Falls back to the Windows built-in voice
// (System.Speech) when the Edge service can't be reached.
// Usage (repo root): node tools/demo-video/narrate.mjs   → tools/demo-video/audio/<segment>.mp3
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { voice, segments } = JSON.parse(readFileSync(join(here, "narration.json"), "utf8"));
const ffmpeg = process.env.FFMPEG || (() => { try { return require("ffmpeg-static"); } catch { return "ffmpeg"; } })();
const audioDir = join(here, "audio");
mkdirSync(audioDir, { recursive: true });
const force = process.argv.includes("--force");

// msedge-tts can throw network errors from inside a socket event (outside any try/catch);
// route those to the current request so the Windows-voice fallback still runs.
let failCurrent = null;
process.on("uncaughtException", (e) => {
  if (failCurrent) failCurrent(e);
  else throw e;
});

function edge(text, out) {
  return Promise.race([
    edgeInner(text, out),
    new Promise((_, reject) => {
      failCurrent = reject;
      setTimeout(() => reject(new Error("Edge voice timed out")), 60_000).unref();
    }),
  ]).finally(() => (failCurrent = null));
}

async function edgeInner(text, out) {
  const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const dir = join(tmpdir(), `botproof-tts-${process.pid}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const { audioFilePath } = await tts.toFile(dir, text);
  tts.close();
  renameSync(audioFilePath, out);
  rmSync(dir, { recursive: true, force: true });
}

function windowsVoice(text, out) {
  const wav = out.replace(/\.mp3$/, ".wav");
  const txt = join(tmpdir(), `botproof-tts-${process.pid}.txt`);
  writeFileSync(txt, text, "utf8");
  const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = 0; $s.SetOutputToWaveFile('${wav.replace(/'/g, "''")}'); $s.Speak([IO.File]::ReadAllText('${txt.replace(/'/g, "''")}')); $s.Dispose()`;
  const r = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], { stdio: "inherit" });
  if (r.status !== 0 || !existsSync(wav)) throw new Error("Windows voice failed");
  execFileSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-i", wav, "-ac", "1", "-b:a", "96k", out]);
  rmSync(wav, { force: true });
}

for (const [id, text] of Object.entries(segments)) {
  const out = join(audioDir, `${id}.mp3`);
  if (existsSync(out) && !force) {
    console.log(`= ${id} (exists; --force to redo)`);
    continue;
  }
  try {
    await edge(text, out);
    console.log(`✔ ${id}  (Edge voice ${voice})`);
  } catch (e) {
    if (process.platform !== "win32") {
      console.error(`✘ ${id}: Edge voice unavailable (${e.message}) and no Windows voice on this OS`);
      process.exit(2);
    }
    console.log(`  Edge voice unavailable (${e.message}); using the Windows voice for ${id}`);
    windowsVoice(text, out);
    console.log(`✔ ${id}  (Windows voice)`);
  }
}
