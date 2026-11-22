# BotProof fix run `fix-2026-11-22T18-11-20` (agent-driven)

max 3 attempts · editable: `demo-bot/src/**`, `demo-bot/api/**`, `demo-bot/public/**`

## Initial run

| Flow | Result | Time | Credits | Evidence pack | Failure |
|---|---|---|---|---|---|
| botproof/flows/group/group_close_admin_test.md | failed | 604s | 77.2 | `3cdc4144-81dc-4435-96d4-debff2aa11e0.evidence` | step 1 "Open the test group": action_failed: click @ step 2 |

## Result: ⚠️ stopped — not bot failures

- `botproof\flows\group\group_close_admin_test.md`: Kane's triage: automation_bug — action_failed: click @ step 2

No patch requested and no attempt used: the cause is the test environment, not the bot.

