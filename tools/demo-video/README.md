# Demo video builder

Builds `out/botproof-demo.mp4` from real material only: Kane's per-step screenshots from the evidence packs of real
runs (listed in `storyboard.json`, found on the machine that ran them), cards with the real flow files, the real patch
and the real fix-loop log, and a narration track (`audio.json`, generated with ElevenLabs).

```bash
npm run build                                   # the BotProof CLI (repo root)
npm --prefix tools/demo-video install           # ffmpeg-static
node tools/demo-video/make-video.mjs --audio-only   # download the narration (signed links expire)
node tools/demo-video/make-video.mjs            # render → tools/demo-video/out/botproof-demo.mp4
```

Each segment lasts as long as its narration; missing narration renders silent with a warning, and a missing pack
renders a placeholder card — check the output before uploading.
