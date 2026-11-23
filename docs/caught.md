# Bugs Kane caught

Every entry here is a real bug in the demo bot that a BotProof flow caught while Kane drove real Telegram Web.
Each one links the flow, what Kane saw, the fix commit and the passing re-run. Staged bugs never go here.

### 1. Anonymous group admins can't close a group order: the bot says "Only group admins"

- **Flow:** [`botproof/flows/group/group_close_admin_test.md`](../botproof/flows/group/group_close_admin_test.md), step 3 "Close as the group owner"
- **What Kane saw:** *"The command was sent, but the bot replied that only group admins can close the order."* The failure
  screenshot shows the group owner, posting as the group ("Send anonymously"), sending `/close@botproofbot` at 19:21 and the
  bot answering "⛔ Only group admins can close the order." Evidence pack `42fbcfdb-9eab-4ac5-9c03-4891bb61a251`.
- **Root cause:** when an admin has "Remain anonymous" on, Telegram delivers their messages from the placeholder user
  `@GroupAnonymousBot` with `sender_chat` set to the group. The bot asked `getChatMember` whether that placeholder is an
  admin, which it never is, so it refused the group's own owner. Unit tests and a mocked Bot API would not see this: it
  only appears with a real admin account that posts anonymously.
- **How it was found:** not staged. The test account happened to have "Remain anonymous" on; the first group runs failed,
  the chat history showed the refusal, and Kane reproduced it in the fix loop on 22 Nov.
- **Fix:** [`80593e8`](https://github.com/ahmardchain/Botproof/commit/80593e8): treat `sender_chat.id === chat.id`
  (only admins can post as the group) as an admin before calling `isAdmin()`. Patch written by Claude Code from BotProof's
  brief, inside the editable allowlist.
- **Passing re-run:** same fix loop, after the automatic Vercel redeploy: PASS in 185 s, 20.4 credits, evidence pack
  `28a588a6-84f5-43f4-a0f8-9da0c2515eab`. Full log: [`botproof/runs/fix-2026-11-22T18-25-38/LOG.md`](../botproof/runs/fix-2026-11-22T18-25-38/LOG.md).
- **Found by:** the `botproof fix` loop, attempt 1 of 3.

## Template

### N. <one-line symptom a user would see>

- **Flow:** [`botproof/flows/…/<name>_test.md`](../botproof/flows/) step "<heading>"
- **What Kane saw:** "<Kane's failure remark, verbatim>" — evidence pack `<execution id>`, screenshot `<path>`
- **Root cause:** <one or two sentences>
- **Fix:** <commit link>
- **Passing re-run:** `botproof/runs/<id>/SUMMARY.md` (evidence pack `<execution id>`)
- **Found by:** first run of the flow / the `botproof fix` loop (attempt n) / manual fix after a BotProof failure
