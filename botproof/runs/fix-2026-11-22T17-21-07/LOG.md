# BotProof fix run `fix-2026-11-22T17-21-07` (agent-driven)

max 3 attempts · editable: `demo-bot/src/**`, `demo-bot/api/**`, `demo-bot/public/**`

## Initial run

| Flow | Result | Time | Credits | Evidence pack | Failure |
|---|---|---|---|---|---|
| botproof/flows/group/group_close_admin_test.md | failed | 500s | 65.0 | `f3e6429d-751f-4966-8317-292f721bb215.evidence` | step 1 "Open the test group": action_failed: click @ step 3 |

## Result: ⚠️ stopped — not bot failures

- `botproof\flows\group\group_close_admin_test.md`: Kane's triage: automation_bug — action_failed: click @ step 3

No patch requested and no attempt used: the cause is the test environment, not the bot.

