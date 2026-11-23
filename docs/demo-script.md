# Demo video

**Video:** https://youtu.be/mY_bRyfb-SE (3:22, 1080p)

Made from real material only: Kane's own screenshots from the live runs (docs/screenshots/1–5), phone photos of the
Mini App order in the test chat (6–7, labelled as phone photos), the real fix-loop log and diff, and the real commands.
Narration: Kokoro TTS (free, open source), generated from [`tools/demo-video/narration.json`](../tools/demo-video/narration.json).
Rendered with [`tools/demo-video/film/render-film.mjs`](../tools/demo-video/film/render-film.mjs).

| Scene | Screen | What the voice says |
|---|---|---|
| 1 Problem | Testing a bot by hand | Bots are tested by hand; unit tests mock the Bot API and miss what users see |
| 2 What it is | A plain-English flow file, Kane in Telegram Web | Flows in plain English; Kane drives real Telegram Web as a test account |
| 3 Private chat | Kane's screenshots: /start, menu edited in place, item alert | Commands, inline keyboards editing in place, callback alerts |
| 4 Mini App | Phone photos of the checkout and the paid order | Kane opens the Mini App, presses Telegram's Pay button, the bot confirms |
| 5 Group & channel | Kane's screenshots: group order, channel post | Group order shows who tapped; channel post, edit, delete |
| 6 Bug & fix loop | Kane's failure screenshot, the diff, the passing screenshot | The real anonymous-admin `/close` bug, Claude's one-line fix, redeploy, pass |
| 7 Install | The real commands | `kane-cli login`, clone, `botproof init`, `botproof run`, `--record` |
| 8 Close | Belief line | The loop doesn't patch when Telegram is at fault; evidence packs; belief line |

The bug in scene 6 is not staged: it is the one in [caught.md](caught.md), found on 22 Nov.
