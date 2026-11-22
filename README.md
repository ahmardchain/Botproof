# BotProof

**Your bot works on your laptop. BotProof proves it works in Telegram.**

BotProof runs plain-English test flows against your Telegram bot in the real Telegram Web client, driven by
[Kane CLI](https://github.com/LambdaTest/kane-cli), and hands every failure to your coding agent to fix until the flow passes.

[Demo video](#) _(coming)_ · [Demo bot](#demo-bot) · [Evidence packs](#evidence-packs) · [Install](#install-and-run)

> **Status (22 Nov 2026):** the CLI, the demo bot, 22 flows and the fix loop are built and unit-tested. The first
> live Kane run passed on 22 Nov (`start`: Kane in real Telegram Web, logged in as the test account); the rest of the
> spike is in progress, see [docs/FINDINGS.md](docs/FINDINGS.md). A flow is marked passing only with its evidence pack.

<!-- GIF: Kane tapping through Brew Bot in Telegram Web (added after the first green run) -->

## The problem

Telegram bots are tested by hand: open Telegram, send `/start`, tap a button, scroll, repeat after every change.
Unit tests mock the Bot API, so they never see what a user sees: a button that does nothing, a message that fails to
render, a keyboard that never goes away, a Mini App that opens blank.

## For judges: start here

Telegram is a third-party login we can't hand over, so per the rules' fallback clause every flow ships with a
**recorded run**: its sealed Kane evidence pack (step 1, no login needed) and the demo video.

| Do this | You'll see |
|---|---|
| 1. **No login needed:** download a pack from [Evidence packs](#evidence-packs), then `npx @testmuai/kane-cli evidence serve <pack>.evidence` | Kane's run step by step: screenshots of Telegram Web, what it tapped, what it checked |
| 2. Read one flow, e.g. [`menu_pagination_test.md`](botproof/flows/private/menu_pagination_test.md) | The whole test is plain English |
| 3. Read [a real fix-loop log](#the-closed-loop) | Kane fails a flow → Claude patches the bot → Kane re-runs → pass |
| 4. Open the demo bot in Telegram and send `/start`, then `/menu` | The bot under test, live |
| 5. Run it yourself with your own **test** Telegram account: [Install and run](#install-and-run) | `botproof run --tag smoke` prints PASS/FAIL per flow with an evidence link |

## What BotProof tests

Every row is a `_test.md` flow Kane runs in Telegram Web against the demo bot. "Pack" links are added when a run passes.

| Area | What is checked | Flow | Pack |
|---|---|---|---|
| Commands & deep links | `/start` welcome renders with a main menu of buttons (menu, checkout, help, cancel, add to group); `/help` lists commands; `t.me/<bot>?start=promo` applies the promo | [start](botproof/flows/private/start_test.md) · [main_menu](botproof/flows/private/main_menu_test.md) · [help](botproof/flows/private/help_test.md) · [deeplink](botproof/flows/private/deeplink_test.md) | – |
| Inline keyboards | next/prev edits the same message; item opens details in place; URL button target; callback alert | [menu_pagination](botproof/flows/private/menu_pagination_test.md) · [item_details](botproof/flows/private/item_details_test.md) | – |
| Reply keyboards | custom keyboard appears, sends "2", one-time keyboard is gone afterwards | [reply_keyboard](botproof/flows/private/reply_keyboard_test.md) | – |
| Conversations | name → phone, re-asks on bad input, confirm; `/cancel` mid-way | [conversation](botproof/flows/private/conversation_test.md) · [conversation_cancel](botproof/flows/private/conversation_cancel_test.md) | – |
| Message rendering | bold, code and link render; no raw `<b>`, `**`, `\` or "message is empty" | [formatting](botproof/flows/private/formatting_test.md) | – |
| Media | order photo arrives with the right caption and order number | [conversation](botproof/flows/private/conversation_test.md) | – |
| Mini App | opens inside Telegram, form + Telegram main button work, data reaches the bot | [miniapp_checkout](botproof/flows/private/miniapp_checkout_test.md) | – |
| Menu button | opens the Mini App; paying from it reaches the bot | [menu_button](botproof/flows/private/menu_button_test.md) | – |
| Groups | `/menu@bot`; group order edited with who tapped; admin `/close`; privacy mode (plain ignored, mention/reply answered); removed and re-added | [group_menu](botproof/flows/group/group_menu_test.md) · [group_order](botproof/flows/group/group_order_test.md) · [group_close_admin](botproof/flows/group/group_close_admin_test.md) · [group_privacy](botproof/flows/group/group_privacy_test.md) · [group_membership](botproof/flows/group/group_membership_test.md) | – |
| Channels | posts "today's special"; 👍/👎 votes edit the post; bot edits and deletes its post; comments in the discussion group reach the bot | [channel_special_vote](botproof/flows/channel/channel_special_vote_test.md) · [channel_edit_delete](botproof/flows/channel/channel_edit_delete_test.md) · [channel_comments](botproof/flows/channel/channel_comments_test.md) | – |
| Stretch | inline mode; stale buttons after cancel | [inline_mode](botproof/flows/stretch/inline_mode_test.md) · [stale_button](botproof/flows/stretch/stale_button_test.md) | – |

Not built: tests that need a second Telegram account (new-member welcome, non-admin `/close` refusal, "only A can tap A's
buttons"). They are possible with a second Chrome profile but were left out to keep the single-account flows reliable.

## The closed loop

```
 botproof fix
     │
     ▼
 Kane runs the flows in Telegram Web ──── all pass ──► done (log written)
     │ a flow fails
     ▼
 brief for the agent: flow file · failing step · Kane's remark ·
 evidence pack · failure screenshot · bot sources
     │
     ▼
 Claude Code patches the bot ──► edits outside the allowlist are blocked (PreToolUse hook)
     │                            and reverted (git snapshot check)
     ▼
 bot restarted / redeployed ──► Kane re-runs only the failed flows
     │
     └── still failing after 3 attempts ──► stop, escalate to a human with the full log
```

- Editable paths come from `fix.editable` in [`botproof/botproof.config.json`](botproof/botproof.config.json)
  (default: `demo-bot/src/**`, `demo-bot/api/**`, `demo-bot/public/**`). Flow files, `botproof/`, `cli/` and `.claude/`
  are always protected.
- Every attempt is logged to `botproof/runs/<id>/LOG.md`: what failed, Kane's remark, the agent's explanation, the diff, the re-run.
- Two ways to drive it: `botproof fix` runs the agent itself (`claude -p …`); inside Claude Code, `/botproof-fix` uses the
  [skill](.claude/skills/botproof/SKILL.md) and `botproof fix --step`, one attempt per call.

_A real run log goes here after the first live fix._

## Bugs Kane caught

See [docs/caught.md](docs/caught.md). Only bugs Kane actually caught while building the demo bot are listed; none yet.

## Demo bot

`demo-bot/` is **Brew Bot**, a coffee-order bot ([grammY](https://grammy.dev)) built to exercise every area above:
paginated inline menu, callback alerts, quantity reply keyboard, a /start main menu of buttons, a validated order conversation, an HTML-formatted
summary and photo, a checkout Mini App (`public/checkout.html`) with Telegram's main button, a menu button, group
orders with admin-only `/close`, and a channel "today's special" with votes and comment replies.

It runs on Vercel: `https://brewbot-botproof.vercel.app` (webhook `/api/webhook`, Mini App `/checkout.html`).
Bot username, public test group and channel: _added once the bot token is set_.

## Evidence packs

_Sealed packs for every passing flow go in the release attached to this repo once the spike has run. Each is checked
for session data before publishing: packs contain screenshots of the test account's Telegram Web, never of a personal account._

## Install and run

Needs Node 20+, Google Chrome, a TestMu AI account, and a **dedicated test Telegram account** (never your personal one).

```bash
npm install -g @testmuai/kane-cli && kane-cli login
```
```bash
git clone https://github.com/ahmardchain/Botproof && cd Botproof && npm install
```
```bash
node cli/dist/index.js init        # checks Chrome + Kane, logs the test account into Telegram Web, asks for bot/group/channel
```
```bash
node cli/dist/index.js run --tag smoke
```
```bash
node cli/dist/index.js fix --tag smoke
```

To test your own bot instead of Brew Bot: point `bot_username` at it in `botproof/botproof.config.json`, write flows in
`botproof/flows/`, and set `fix.editable` to your bot's source folders.

## Limits

- Needs a dedicated test Telegram account and Chrome on the machine running Kane. Its Telegram Web session lives in a
  Chrome profile outside the repo (`~/.botproof/chrome-profile`); never commit or share it. Kane runs on a fresh copy of
  it per flow, because a Kane replay heal was seen to empty the profile it was given ([FINDINGS](docs/FINDINGS.md)).
- Telegram Web K only (`web.telegram.org/k/`); the official apps are not tested.
- Flows run one after another, not in parallel: `kane-cli testrun` gives each worker a fresh Chrome profile, which has no
  Telegram session ([FINDINGS](docs/FINDINGS.md#design-decision-from-the-docs-testmd-run-per-flow-not-testrun)).
- Multi-account group tests are not built.
- The live spike has not run yet; see [docs/FINDINGS.md](docs/FINDINGS.md) for what is verified and what is not.

## Repo map

```
cli/                 the botproof CLI (TypeScript): init, run, fix, hook
botproof/flows/      22 plain-English Kane flows (*_test.md)
botproof/botproof.config.json   variables, editable allowlist, agent command
demo-bot/            Brew Bot + Mini App, deployed on Vercel
.claude/             Claude Code skill, /botproof-fix command, edit-guard hook
docs/                FINDINGS (spike), caught bugs, demo script, posts, submission
```

Built for the [KaneCLI Online Hackathon](https://www.kaneclihack.sh) by TestMu AI.
