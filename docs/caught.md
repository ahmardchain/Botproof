# Bugs Kane caught

Every entry here is a real bug in the demo bot that a BotProof flow caught while Kane drove real Telegram Web.
Each one links the flow, what Kane saw, the fix commit and the passing re-run. Staged bugs never go here;
the regression replay used in the demo video lives on the `demo/regressions` branch and is labelled as such.

_No entries yet. Kane has not run against Telegram Web: the spike is blocked (see [FINDINGS.md](FINDINGS.md))._

## Template

### N. <one-line symptom a user would see>

- **Flow:** [`botproof/flows/…/<name>_test.md`](../botproof/flows/) step "<heading>"
- **What Kane saw:** "<Kane's failure remark, verbatim>" — evidence pack `<execution id>`, screenshot `<path>`
- **Root cause:** <one or two sentences>
- **Fix:** <commit link>
- **Passing re-run:** `botproof/runs/<id>/SUMMARY.md` (evidence pack `<execution id>`)
- **Found by:** first run of the flow / the `botproof fix` loop (attempt n) / manual fix after a BotProof failure
