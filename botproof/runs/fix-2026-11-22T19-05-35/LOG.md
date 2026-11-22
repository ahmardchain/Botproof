# BotProof fix run `fix-2026-11-22T19-05-35` (agent-driven)

max 3 attempts · editable: `demo-bot/src/**`, `demo-bot/api/**`, `demo-bot/public/**`

## Initial run

| Flow | Result | Time | Credits | Evidence pack | Failure |
|---|---|---|---|---|---|
| botproof/flows/channel/channel_comments_test.md | failed | 274s | 34.7 | `9a71819a-0775-44d2-8ccd-a707c3fb7496.evidence` | step 4 "Bot answers the comment": Final verification failed: "the bot replies to that comment with "Thanks for the feedback" within 15 seconds" |
| botproof/flows/channel/channel_special_vote_test.md | failed | 146s | 15.9 | `db45b300-0fac-49e7-80b6-0b1cc2913d7d.evidence` | step 3 "Find the post": The current Telegram landing page does not display any channel posts or reaction buttons. |
| botproof/flows/group/group_menu_test.md | failed | 247s | 48.4 | `207100ef-2b5d-44ae-b304-6c7b3ac7c1b6.evidence` | step 3 "Check the menu": Final verification failed: "A message from {{global.bot_username}} appears in the group with "Brew Bot menu — page 1/2" and inline drink buttons." |
| botproof/flows/group/group_privacy_test.md | failed | 644s | 118.1 | `84020bc7-3891-484c-badc-f844d8ea9c08.evidence` | step 4 "Reply is answered": Telegram exposed no Reply control, and the sent text was not attached as a reply or answered by the bot. |

## Result: ⚠️ stopped — not bot failures

- `botproof\flows\channel\channel_comments_test.md`: Kane's triage: automation_bug — Final verification failed: "the bot replies to that comment with "Thanks for the feedback" within 15 seconds"
- `botproof\flows\channel\channel_special_vote_test.md`: Kane's triage: automation_bug — The current Telegram landing page does not display any channel posts or reaction buttons.
- `botproof\flows\group\group_menu_test.md`: Kane's triage: automation_bug — Final verification failed: "A message from {{global.bot_username}} appears in the group with "Brew Bot menu — page 1/2" and inline drink buttons."
- `botproof\flows\group\group_privacy_test.md`: Kane's triage: automation_bug — Telegram exposed no Reply control, and the sent text was not attached as a reply or answered by the bot.

No patch requested and no attempt used: the cause is the test environment, not the bot.

