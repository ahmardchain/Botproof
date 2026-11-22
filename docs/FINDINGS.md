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

## Fix loop, third attempt — 22 Nov 2026, 18:58: Telegram was still syncing when Kane started

Manual check on the master profile right before: connected, test message delivered. The fix-loop run then failed at the
group-order step (429 s, 70.5 credits; Kane: "Espresso click landed outside the group-order button",
`automation_bug/agent_misstep`), with Kane's browser showing "Updating…". In the two last runs Kane's copied profile was
reconnecting at the moment of failure. Likely cause: each flow starts from a copy whose Telegram sync state is as old as the
master's last use, and the test account is in busy public channels, so Telegram Web spends its first seconds catching up
while Kane is already clicking. Fix (22 Nov): before Kane starts, BotProof polls the page over CDP until Telegram Web no
longer shows "Updating…"/"Connecting…"/"Waiting for network" for 3 s in a row (max 90 s); if it shows the login screen,
the flow fails at once without starting Kane (no credits). Verified with a page that shows "Updating…" for 5 s (BotProof
waited 7 s) and a login page (detected in 4 s). The chat history confirms the bug: the bot replied "⛔ Only group admins
can close the order" to the owner's anonymous `/close`.

## Fix loop, second attempt — 22 Nov 2026, 18:21: stopped for the wrong reason (BotProof bug, fixed)

`fix --step group_close_admin` from a clean state: exit 2, 500 s, 65.0 credits, log `botproof/runs/fix-2026-11-22T17-21-07/LOG.md`.
Kane got past the Appearance tip (the new overlay instruction worked) and failed at step 3 "Close as the group owner":
*"Test account is not recognized as a group admin for order closure"*. BotProof read the **first** failure record in the
pack (the recovered step-1 tip, triaged `automation_bug`) and stopped as "environment". Fixed the same day: BotProof now
uses the **last** failure record, the one that ended the run.

The final screenshot also shows Telegram Web was not connected in that run ("Updating…", the new `/grouporder` and
`/close` messages stuck with a clock icon), so the "⛔ Only group admins can close the order" reply Kane read was from an
earlier run. Cause of the bot's refusal (from the code, consistent with that earlier reply): the test account posts as an
**anonymous admin**, so Telegram sends the bot `@GroupAnonymousBot` with `sender_chat` = the group, and `isAdmin()` asks
`getChatMember` about that placeholder, which is never an admin. A real bot bug: anonymous admins can't close orders.

## Fix loop, first live attempt — 22 Nov 2026, 17:54–18:10: correctly refused to patch

`botproof fix --step group_close_admin` (test account set to "Remain anonymous", to reproduce a suspected anonymous-admin
bug). The reproduction run failed at step 1 "Open the test group" (831 s, 75.1 credits): Kane's remark
"action_failed: click @ step 2". The screenshot shows Telegram Web's own **"Appearance" tip** covering the screen; Kane's
triage: *"Appearance tip blocked group-opening click"*, category `automation_bug/state_transition_bug`, confidence 0.96.
The coding agent read the brief and the screenshot and **declined to patch the bot**: no bot change can fix a Telegram
overlay, and the skill forbids fake fixes. Follow-ups (22 Nov): `telegram-context.md` now tells Kane to close Telegram
tips/overlays and wait out "Updating…"; and `botproof fix` now reads Kane's triage itself and stops without calling the
agent (and without using an attempt) when the triage blames automation or the environment. The anonymous-admin bug is
still unconfirmed.

The account in the screenshots is the dedicated test account (confirmed by the developer); its chat list includes some
public channels it has joined. Nothing beyond run summaries was committed to git (no share links or packs; local
Windows paths in run summaries were trimmed to pack file names).

## Runs 9–16 — 22 Nov 2026, 16:33–17:17: groups and channels (2 of 8 pass)

| Flow | Result | Time | Credits | Kane's remark |
|---|---|---|---|---|
| `group/group_menu_test.md` | FAIL | 181 s | 44.2 | no bot message "Brew Bot menu — page 1/2" with drink buttons appeared in the group |
| `group/group_order_test.md` | **PASS** | 273 s | 60.8 | |
| `group/group_close_admin_test.md` | FAIL | 237 s | 62.3 | order message never became "Group order (closed)"; no "Group order closed by … 1 drink(s)" |
| `group/group_privacy_test.md` | FAIL | 426 s | 102.8 | "AP determined agent is stuck — no viable actions remain" |
| `channel/channel_special_vote_test.md` | FAIL | 190 s | 47.0 | newest post was not "Today's special" with "👍 0" / "👎 0" |
| `channel/channel_edit_delete_test.md` | **PASS** | 595 s | 87.6 | |
| `channel/channel_comments_test.md` | FAIL | 380 s | 53.7 | bot did not reply "Thanks for the feedback" within 15 s |
| `group/group_membership_test.md` | FAIL | 329 s | 37.7 | "Telegram Web stayed on settings with an Updating status" — never opened the group |

What is known: the bot's Vercel logs for the whole window show updates arriving and **no errors** (the bot logs every
unhandled error via `bot.catch`), so none of these is a crash. `group_order` passing proves the bot gets group commands and
callbacks; `channel_edit_delete` passing proves `/special` posts to the channel. Each failure is therefore either the bot
replying differently from what the flow expects (a bot bug), or Telegram Web / the agent getting in the way (not a bot bug).
Not yet classified: the failure screenshots are on the developer machine. `botproof why <run-dir>` (added 22 Nov) extracts
them with Kane's failure record. Classification, then `botproof fix` for real bot bugs, is the next step. Group/channel
test chats share one group (`t.me/testingbotproofgroup` is both the test group and the channel's discussion group).

## Runs 6–8 — 22 Nov 2026, 16:14–16:29: inline keyboards and the main menu

One flow per command (a two-flow run earlier ran the machine out of memory).

| Flow | Result | Time | Credits | Pack |
|---|---|---|---|---|
| `private/menu_pagination_test.md` | **PASS** | 230 s | 80.5 | `84a3ebad-….evidence` |
| `private/item_details_test.md` | **PASS** | 63 s | 0 (pure replay from cache) | `743a9c56-….evidence` |
| `private/main_menu_test.md` | **PASS** | 391 s | 123.5 | `80c38596-….evidence` |

**Q2 answered: yes.** Kane tapped inline buttons, saw Next/Prev edit the same message, opened item details in place,
followed the URL button and read the callback alert. `item_details` replayed entirely from the recording made during the
interrupted run, at no credit cost: a recorded flow re-runs for free. Credits used so far on 22 Nov: about 380.

## Runs 4–5 — 22 Nov 2026, 15:22–15:41: CDP fix works, twice in a row

| Flow | Result | Time | Credits | New `kane-clean-*` temp profile? |
|---|---|---|---|---|
| `private/start_test.md` | **PASS** (4/4 steps) | 441 s | 56.2 | No |
| `private/start_test.md` (again) | **PASS** | 423 s | 27.4 | No |

Logs: `botproof/runs/run-2026-11-22T14-22-58/`, `botproof/runs/run-2026-11-22T14-32-28/`. The master profile was
untouched (43 entries) after both runs. **Q1 answered: yes**, with BotProof owning Chrome (copy of the master profile +
`--cdp-endpoint`). Run 2 cost about half of run 1; whether it replayed part of the flow is not checked yet.

Then `run menu_pagination item_details` was stopped part-way by the developer machine running out of memory (no result,
no summary). It left BotProof's Chrome running, because nothing stopped it when the run was killed. Fixed: BotProof now
stops its Chrome on exit and on SIGINT/SIGTERM, and before each flow it kills any Chrome still running on the scratch
profile (matched by its exact `--user-data-dir`, so the user's own Chrome is never touched). Verified on Linux: 8 orphaned
processes after a hard kill → 0 after the next flow's setup; 0 after SIGTERM.

## Third run — 22 Nov 2026, 15:12: Kane ignored the configured profile

| Flow | Result | Time | Credits | Notes |
|---|---|---|---|---|
| `private/start_test.md` | FAIL at step 1 | 76 s | 2.99 | Telegram's "Log in by QR Code" screen, although the master profile (43 entries, Telegram `user_auth` and auth keys in IndexedDB) and its copy `chrome-profile-run` were both logged in. |

Kane's config pointed at `chrome-profile-run`, but Chrome wrote nothing there. kane-cli instead started Chrome in a new
blank folder `%TEMP%\kane-clean-*` created at the time of the run. The same temp folders line up with the two earlier
failures (the heal's "fresh browser" at 14:56/14:57 and the stuck sample flow at 14:46/14:48). kane-cli 0.10.7's launcher
(`dist/chunk-IVES4QTY.js`) has two branches: a CDP endpoint is used as-is and returns early, otherwise it uses
`config.chrome_profile_path` or creates a `kane-clean-` temp dir. Why the temp-dir branch was taken with a profile
configured is not known (run 1 at 14:35 did get the logged-in profile).

**Fix (22 Nov):** BotProof no longer lets Kane launch Chrome. For each flow it copies the master profile, starts Chrome
itself on the copy with `--remote-debugging-port`, waits for `/json/version`, and runs
`kane-cli testmd run <flow> --cdp-endpoint http://127.0.0.1:<port>` (flag verified in `testmd run --help`; the CDP
branch in the launcher skips all profile handling). Chrome is stopped after the flow. Verified here on Linux: Chrome
starts on the copy, the endpoint answers, Kane is invoked with it, Chrome exits cleanly. Not yet verified: a logged-in
run through CDP on the developer's machine, and whether a heal stays on the CDP browser.

## Second run — 22 Nov 2026, 14:51: the Telegram login was wiped

| Flow | Result | Time | Credits | Notes |
|---|---|---|---|---|
| `private/start_test.md` (2nd run) | FAIL | 311 s | 9.68 | Kane planned a **pure replay** of the 6 recorded actions (hence ~7× cheaper than authoring). The replay could not find the chat; adaptive heal then opened a "fresh browser", which showed Telegram's "Log in by QR Code". Kane: "The replay environment was not signed in to Telegram." |

After the run, the configured profile `C:\Users\<user>\.botproof\chrome-profile` was **completely empty**:
the folder itself was emptied, not just signed out. Run 1 used the same folder logged in. What emptied it is not
confirmed (kane-cli's runner is a compressed binary; its launcher code only shows Chrome being started with
`--user-data-dir` and killed with SIGKILL). The timing points at the heal's "fresh browser". To report to the Kane team
(Slack / GitHub issue) with the run-2 evidence pack.

**Q1 answer so far: the session is NOT safely kept across runs when Kane owns the profile** (see the third run: Kane may not even use it).

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
| 1 | Kane opens Telegram Web with a saved, logged-in Chrome profile and stays logged in across runs | **YES, when BotProof owns Chrome** (master profile copy + `--cdp-endpoint`): 2 consecutive passes. When Kane launched Chrome itself it used a blank temp profile or emptied the given one | runs of 22 Nov 15:22 and 15:32 |
| 2 | Open a bot chat, send /start, read the reply, tap an inline button, see the message edit | **YES** | `start`, `menu_pagination`, `item_details`, `main_menu` PASS (22 Nov) |
| 3 | Interact with a Mini App in Telegram Web's iframe | **NOT RUN** | flow ready: `miniapp_checkout_test.md` |
| 4 | Open a group and a channel, find the bot's message, tap a button on a channel post | **Group: YES** (`group_order` PASS: tapped a button on the bot's group message, saw the edit). **Channel: posting yes** (`channel_edit_delete` PASS); tapping a vote on a post not yet passed | runs of 22 Nov 16:33–17:17 |
| 5 | Headless works? Time and credits per flow | Authoring 230–600 s / 56–124 credits per flow; a full cached replay 63 s / 0 credits; headless pending | `botproof run` prints both per flow (`test_md_done.duration_s`, summed `run_end.credits`) |

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
