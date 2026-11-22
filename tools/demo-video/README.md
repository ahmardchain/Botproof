# Demo video builder

Builds `out/botproof-demo.mp4` from real material only: Kane's per-step screenshots from the evidence packs of real
runs (listed in `storyboard.json`, found on the machine that ran them), cards with the real flow files, the real patch
and the real fix-loop log, and a free narration track (`narration.json`, spoken by Microsoft Edge's neural voices through the `msedge-tts`
package, with the Windows built-in voice as fallback).

```bash
npm run build                                   # the BotProof CLI (repo root)
npm --prefix tools/demo-video install           # ffmpeg-static
node tools/demo-video/narrate.mjs               # free narration → tools/demo-video/audio/*.mp3
node tools/demo-video/make-video.mjs            # render → tools/demo-video/out/botproof-demo.mp4
```

Live footage: `node cli/dist/index.js run <flow> --record` films the Telegram Web page Kane drives (Chrome's own
screencast over CDP; Kane itself has no video output) into `botproof/recordings/<time>-<flow>/`. Storyboard entries of
type `recording` use the newest capture of a flow, sped up to fit the narration. Re-running an already-passed flow
mostly replays Kane's recording from cache, so it is quick and cheap.

Each segment lasts as long as its narration; missing narration renders silent with a warning, and a missing pack
renders a placeholder card — check the output before uploading.

## The submitted film (`film/`)

`film/film.html` is the demo film as time-driven HTML scenes (camera moves over the real Kane screenshots in
`docs/screenshots/`, the real patch, the real log). `film/render-film.mjs` renders it frame by frame with Playwright and
ffmpeg and lays the narration under each scene. The narration is generated offline with **Kokoro** (free, open-source
neural TTS, voice `af_heart`) by `film/kokoro_tts.py`.

```bash
python tools/demo-video/film/kokoro_tts.py /tmp/vo        # see the file header for the one-time setup
node tools/demo-video/film/render-film.mjs /tmp/vo        # → tools/demo-video/out/botproof-demo.mp4
```

