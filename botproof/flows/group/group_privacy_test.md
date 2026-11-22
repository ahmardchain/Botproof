---
mode: testing
url: https://web.telegram.org/k/
tags: [group, privacy]
max_steps: 40
local_context: botproof/telegram-context.md
---

# Privacy mode: plain messages are ignored, mentions and replies answered

## Open the test group
Open https://web.telegram.org/k/#@{{group_username}} and wait until the group chat is open with the message input box visible.

## Plain message is ignored
Send the message "anyone up for coffee?" in the group. Wait 10 seconds and verify the bot does NOT reply to it.

## Mention is answered
Send the message "@{{bot_username}} hello". Verify the bot replies to that message with "You called".

## Reply is answered
```yaml
optional: true
```
Right-click the bot's "You called" message and choose "Reply" in the menu that opens. A bar saying "Reply to" with the bot's name appears just above the message box. Then type "what's good today?" and press Enter. Verify the new message is shown as a reply quoting the bot's message, and that the bot replies again with "You called".
