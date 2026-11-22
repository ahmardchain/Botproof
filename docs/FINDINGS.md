# FINDINGS — spike log

Rule for this file: only what was observed. Anything not yet run says **NOT RUN** and why.

## First live run — 22 Nov 2026, 14:35 (Windows 11, Node 24.14.0, Chrome, kane-cli 0.10.7)

Run on the developer's machine against the deployed bot `@botproofbot` (Vercel), test account logged into
Telegram Web K in `C:\Users\<user>\.botproof\chrome-profile`. Run log: `botproof/runs/run-2026-11-22T13-35-39/SUMMARY.md`.

| Flow | Result | Time | Credits | Notes |
|---|---|---|---|---|
| `private/start_test.md` | **PASS** | 600 s | 66.4 | First (authoring) run. Kane opened the chat via `#@botproofbot`, `/cancel` got "Order cancelled", `/start` got the bold "Welcome to Brew Bot" with the "📋 Open menu" button and no raw HTML. |
| `start_test.md` (sample written by `init`) | FAIL at step 1 "Open the bot chat" | 77 s | 15.9 | Kane: "no viable actions remain". A duplicate sample `init` should not have written (fixed: `init` now only seeds a sample into an empty project). It also lacked `local_context`; not confirmed as the cause. |

What this answers:
- **Q1 (logged-in profile reused):** yes for one run — Kane started in Telegram Web already logged in. *Across runs* still to confirm with a second run.
- **Q2 (partly):** Kane opened a bot chat, sent commands and read the formatted reply. Inline button tap + edit still to run (`menu_pagination`).
- **Q5 (partly):** an authoring run of a 4-step flow took **10 minutes and 66 credits**. Replays of an unchanged flow should come from Kane's cache with no LLM cost (per the testmd docs) — to measure with the second run. Budget at authoring cost: 21 flows ≈ 1,400–2,000 credits of the 10,000.
- `init` prompts are skipped when stdin is not a terminal (e.g. run from an agent's shell); pass `--bot/--group/--channel/--discussion` instead.

## Second run — 22 Nov 2026, 14:51: the Telegram login was wiped

| Flow | Result | Time | Credits | Notes |
|---|---|---|---|---|
| `private/start_test.md` (2nd run) | FAIL | 311 s | 9.68 | Kane planned a **pure replay** of the 6 recorded actions (hence ~7× cheaper than authoring). The replay could not find the chat; adaptive heal then opened a "fresh browser", which showed Telegram's "Log in by QR Code". Kane: "The replay environment was not signed in to Telegram." |

After the run, the configured profile `C:\Users\<user>\.botproof\chrome-profile` was **completely empty**:
the folder itself was emptied, not just signed out. Run 1 used the same folder logged in. What emptied it is not
confirmed (kane-cli's runner is a compressed binary; its launcher code only shows Chrome being started with
`--user-data-dir` and killed with SIGKILL). The timing points at the heal's "fresh browser". To report to the Kane team
(Slack / GitHub issue) with the run-2 evidence pack.

**Q1 answer so far: the session is NOT safely kept across runs when Kane owns the profile.**

Mitigation (in `cli/src/profile.ts`, since 22 Nov): the logged-in profile is a **master Kane never sees**. Before every
flow BotProof copies it (minus caches and lock files) to `<master>-run` and points Kane at the copy with
`kane-cli config chrome-profile <master>-run` (`testmd run` has no `--chrome-profile` flag; only `kane-cli run` does,
checked against 0.10.7). If Kane empties the copy, BotProof prints it and records `profileWiped` in the run results;
the next flow starts from a fresh copy of the master. Verified here: the config is set and the copy is made before Kane starts.

## Status on 22 Nov 2026 (morning): spike blocked, not failed

The five spike questions need three things this build environment did not have:

| Needed | State on 22 Nov | Who unblocks it |
|---|---|---|
| A TestMu AI login for kane-cli (the account holding the 10,000 hackathon credits) | `kane-cli whoami` → *Not logged in* | The user: `kane-cli login` |
| A dedicated test Telegram account logged into Telegram Web inside a BotProof-only Chrome profile | none | The user: `botproof init` (scan the QR code with the test account's phone) |
| A bot token for the demo bot | none | The user: create a bot with @BotFather and set `BOT_TOKEN` on the deployment |

The first build session ran in a cloud container whose network policy blocked `web.telegram.org`,
`api.telegram.org` and every Kane backend host (`kaneai-api.lambdatest.com`, `auth.lambdatest.com`, …).
So the spike has to run on a machine with Chrome and normal internet access: the developer's own computer.

## Spike checklist

| # | Question | Result | Evidence |
|---|---|---|---|
| 1 | Kane opens Telegram Web with a saved, logged-in Chrome profile and stays logged in across runs | **Run 1 yes; run 2 no: the profile was emptied.** Mitigated with a per-flow copy of a master profile; re-test pending | runs of 22 Nov 14:35 and 14:51 |
| 2 | Open a bot chat, send /start, read the reply, tap an inline button, see the message edit | **Chat + /start + reply: YES**; button + edit pending | `start_test.md` PASS; next `menu_pagination_test.md` |
| 3 | Interact with a Mini App in Telegram Web's iframe | **NOT RUN** | flow ready: `miniapp_checkout_test.md` |
| 4 | Open a group and a channel, find the bot's message, tap a button on a channel post | **NOT RUN** | flows ready: `group_order_test.md`, `channel_special_vote_test.md` |
| 5 | Headless works? Time and credits per flow | **Authoring 600 s / 66.4 credits; replay 311 s / 9.68 credits** (start flow, replay incl. a failed heal); headless pending | `botproof run` prints both per flow (`test_md_done.duration_s`, summed `run_end.credits`) |

How to run it (about 30 minutes, uses a few dozen credits):

```bash
npm install -g @testmuai/kane-cli && kane-cli login
npm install && npm run build
node cli/dist/index.js init          # logs the TEST account into Telegram Web in ~/.botproof/chrome-profile
node cli/dist/index.js run start     # Q1 + Q2 (part)
node cli/dist/index.js run start     # again: still logged in across runs? (Q1)
node cli/dist/index.js run menu_pagination item_details   # Q2
node cli/dist/index.js run miniapp_checkout              # Q3
node cli/dist/index.js run group_order channel_special_vote   # Q4
node cli/dist/index.js run start --headless              # Q5
```

Record each answer in the table above with the run log path (`botproof/runs/<id>/SUMMARY.md`).
If Q1 fails, stop: nothing else can work, and the design must change (see "Fallbacks").

## What was verified (22 Nov)

### Kane CLI 0.10.7 (installed from npm, `@testmuai/kane-cli`)

- Every flag BotProof passes exists in `--help`: `testmd run <path> --agent --headless --variables-file <f> --timeout <s>`,
  `config chrome-profile <path>`, `evidence merge <targets…> --run-id <id> --out <path> --title <t>`, `evidence serve <paths…>`,
  `testrun run --tags --parallel --agent`.
- Real `testmd run --agent` output without login: stdout `{"type":"stream_start","cli_version":"0.10.7","surface":"testmd",…}`,
  stderr `error: Not authenticated…`, exit **2**. BotProof reports this as `ERROR` (setup), not `FAIL`, and the fix
  loop does not call the agent for it.
- Saved-test stream contract used by the parser (from the Kane skill, `references/testmd.md`): `test_md_step_start {step_index, heading}`,
  `test_md_step_end {step_index, status}`, inner `run_end` per step (credits), `test_md_done {overall_status, duration_s, session_id, share_url?}`.
  The exit code is authoritative (0 pass, 1 fail, 2 error, 3 cancelled/timeout). The evidence path is the stderr hint
  `` evidence: view locally with `kane-cli evidence serve <path>` ``, with `.testmuai/evidence/` as fallback.

### Design decision from the docs: `testmd run` per flow, not `testrun`

`docs/user-guide/testrun.md`: *"Each desktop worker gets its own isolated Chrome with a fresh temporary profile"*.
A fresh profile has no Telegram session, so `kane-cli testrun run --tags …` would land on the Telegram login screen.
BotProof therefore runs each selected flow with `kane-cli testmd run` (which uses the profile set by
`kane-cli config chrome-profile`) one after another, and can merge the packs with `kane-cli evidence merge`
(`botproof run --merge`).

To verify during the spike: the `_test.md` frontmatter key `chrome_profile` (a *named* profile under
`~/.testmuai/kaneai/chrome-profiles/`) might let `testrun` reuse the session. If it does, `botproof run --tag` could
switch to one `testrun` with one evidence pack. Even then `--parallel` > 1 cannot share one Telegram session
(Chrome locks a profile to one process).

### Demo bot deployment

- Deployed to Vercel (`brewbot-botproof.vercel.app`) from this repo's `demo-bot/` directory.
- Verified through the Vercel connector: `GET /api/webhook` → 200 "Brew Bot webhook…" (the TypeScript function
  compiles and loads grammY); `GET /checkout.html` → 200, the Mini App page.
- Not verified: anything that talks to Telegram (needs `BOT_TOKEN`).
- Cloudflare was the first choice; its API token in the build environment was rejected (`Invalid access token`).

## Telegram Web assumptions the flows make (verify in the spike)

| Assumption | Used by | If wrong |
|---|---|---|
| Web K opens a chat from `https://web.telegram.org/k/#@<username>` | almost every flow | open the chat via the search box instead |
| Web K resolves deep links from `#?tgaddr=tg%3A%2F%2Fresolve%3Fdomain%3D<bot>%26start%3Dpromo` | `deeplink_test.md` | send `/start promo` (same payload reaches the bot) and record the limit |
| Reply-keyboard `web_app` buttons open the Mini App in Web K and `Telegram.WebApp.sendData` reaches the bot | `miniapp_checkout_test.md` | use the menu-button path (`/api/checkout` with verified `initData`) |
| Telegram's MainButton is clickable by Kane (drawn by Telegram, outside the iframe) | Mini App flows | the page also shows its own Pay button when opened outside Telegram |
| Channel posts with a linked discussion group show "Leave a comment" in Web K | `channel_comments_test.md` | open the discussion group and reply to the auto-forwarded post |

## Fallbacks if a spike question fails

- **Q1 fails (session not kept):** try `--cdp-endpoint` to attach Kane to a Chrome the user started with
  `--remote-debugging-port` and the BotProof profile (flag verified in `--help`). If that fails too, BotProof cannot
  work on Telegram Web; report it and stop.
- **Q3 fails (Mini App iframe):** keep the Mini App tests at the page level (`kane-cli run` against
  `checkout.html` outside Telegram) and say so in Limits. Do not claim in-Telegram Mini App coverage.
- **Q4 partly fails:** drop the failing channel/group flows from the "passing" table and list them in Limits.
- **Q5 headless fails:** run headed (the default in `botproof.config.json`) and say so in Limits.
