---
mode: testing
url: https://web.telegram.org/k/
tags: [group, privacy]
max_steps: 40
local_context: botproof/telegram-context.md
---

# Privacy mode: plain messages are ignored, mentions and replies answered

## Open the test group
Open {{group_link}} in Telegram Web (or https://web.telegram.org/k/ and open the group from the chat list) and wait until the group chat is open with the message input box visible.

## Plain message is ignored
Send the message "anyone up for coffee?" in the group. Wait 10 seconds and verify the bot does NOT reply to it.

## Mention is answered
Send the message "@{{bot_username}} hello". Verify the bot replies to that message with "You called".

## Reply is answered
Reply to the bot's "You called" message (right-click or hover it and choose Reply) with the text "what's good today?". Verify the bot replies again with "You called".
