# BotProof fix request — attempt 1 of 3

Kane CLI drove the real Telegram Web client (logged in as a test account) through the flows below and they failed.
Fix the **bot code** so the flows pass. Rules:
- You may only edit files matching: `demo-bot/src/**`, `demo-bot/api/**`, `demo-bot/public/**`.
- Never edit flow files (`*_test.md`), BotProof (`cli/`, `botproof/`) or agent config. Edits there are refused and reverted.
- Do not weaken the flows' expectations; make the bot do what the flow describes.
- Keep the change minimal. When done, reply with one paragraph: root cause and what you changed.

## Failure 1: `botproof\flows\group\group_close_admin_test.md`

Failed at step 3 **"Close as the group owner"**.

Kane's remark: The command was sent, but the bot replied that only group admins can close the order.

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
Pack: `C:\Users\Lenovo\.testmuai\kaneai\sessions\98cf589b-9034-4d1e-8dbd-bbcbe75e39e4\evidence\42fbcfdb-9eab-4ac5-9c03-4891bb61a251.evidence` (open with `kane-cli evidence serve C:\Users\Lenovo\.testmuai\kaneai\sessions\98cf589b-9034-4d1e-8dbd-bbcbe75e39e4\evidence\42fbcfdb-9eab-4ac5-9c03-4891bb61a251.evidence`)

Kane's failure record:

```yaml
step: 2-3
status: broken
error:
  message: The command was sent, but the bot replied that only group admins can close
    the order.
page_state:
  url: https://web.telegram.org/k/#@testingbotproofgroup
  screenshot: steps/20-2-3/screenshot.jpg
console_at_failure:
  ref: logs/2-console.ndjson
  step: 2-3
network_at_failure:
  ref: logs/2-network.har
  step: 2-3
title: Close command sent anonymously instead of by the admin account
triage:
  status: triaged
  by:
    kind: agent
    id: v16-investigation/terminal
    at: '2026-11-22T18:32:24.770679+00:00'
  rca:
    root_cause: The message box was in anonymous-send mode. The command was therefore
      sent as the group rather than as the account that owns the group.
    category: automation_bug/state_transition_bug
    confidence: 0.98
  verification:
    status: not_verified
  severity: major
  suggested_fix:
    summary: Before sending /close, switch the Telegram composer from “Send anonymously”
      to the admin test account and verify the sender identity.
  known_bug_id: BUG-10
```

## Bot sources
Start with these files (read others under the allowlist as needed):
- `demo-bot/src/bot.ts`
- `demo-bot/src/menu.ts`
- `demo-bot/public/checkout.html`
