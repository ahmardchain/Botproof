# BotProof fix request — attempt 1 of 3

Kane CLI drove the real Telegram Web client (logged in as a test account) through the flows below and they failed.
Fix the **bot code** so the flows pass. Rules:
- You may only edit files matching: `demo-bot/src/**`, `demo-bot/api/**`, `demo-bot/public/**`.
- Never edit flow files (`*_test.md`), BotProof (`cli/`, `botproof/`) or agent config. Edits there are refused and reverted.
- Do not weaken the flows' expectations; make the bot do what the flow describes.
- Keep the change minimal. When done, reply with one paragraph: root cause and what you changed.

## Failure 1: `botproof\flows\group\group_close_admin_test.md`

Failed at step 1 **"Open the test group"**.

Kane's remark: action_failed: click @ step 2

### Flow (plain English, what a user does)

```markdown
---
mode: testing
url: https://web.telegram.org/k/
tags: [group, admin]
max_steps: 40
local_context: botproof/telegram-context.md
---

# Admin-only /close closes the group order

## Open the test group
Open {{group_link}} in Telegram Web (or https://web.telegram.org/k/ and open the group from the chat list) and wait until the group chat is open with the message input box visible.

## Start a group order and add a drink
Type /grouporder@{{bot_username}} and press Enter, then click "☕ Espresso" under the new group order message. Verify the message lists "— Espresso".

## Close as the group owner
Type /close@{{bot_username}} and press Enter. The test account owns the group, so it is an admin. Verify the group order message now says "Group order (closed)", its drink buttons are gone, and the bot posts "Group order closed by" with "1 drink(s)".
```

### Evidence
Pack: `C:\Users\Lenovo\.testmuai\kaneai\sessions\a877e747-7fa4-4f12-b33d-2b592fa6bbad\evidence\b531f78f-ed2b-4caf-820f-9d256337ac8c.evidence` (open with `kane-cli evidence serve C:\Users\Lenovo\.testmuai\kaneai\sessions\a877e747-7fa4-4f12-b33d-2b592fa6bbad\evidence\b531f78f-ed2b-4caf-820f-9d256337ac8c.evidence`)

Kane's failure record:

```yaml
step: 0-1
status: broken
error:
  message: 'action_failed: click @ step 2'
  type: replay_failure
page_state:
  url: https://web.telegram.org/k/
  screenshot: steps/1-0-1/screenshot.jpg
locator_context:
  replay_reason: 'action_failed: click @ step 2'
console_at_failure:
  ref: logs/0-console.ndjson
  step: 0-1
network_at_failure:
  ref: logs/0-network.har
  step: 0-1
title: Appearance tip blocked group-opening click
triage:
  status: triaged
  by:
    kind: agent
    id: v16-investigation/replay
    at: '2026-11-22T16:55:53.798755+00:00'
  rca:
    root_cause: Telegram Web was showing an appearance tip overlay instead of an unobstructed
      chat screen. The recording did not account for or dismiss that temporary screen
      before trying to open the group.
    category: automation_bug/state_transition_bug
    confidence: 0.96
  verification:
    status: not_verified
  severity: minor
  suggested_fix:
    summary: Update the recording to wait for onboarding overlays to disappear or
      dismiss the Appearance tip before locating and opening the group.
```

## Bot sources
Start with these files (read others under the allowlist as needed):
- `demo-bot/src/bot.ts`
- `demo-bot/src/menu.ts`
- `demo-bot/public/checkout.html`
