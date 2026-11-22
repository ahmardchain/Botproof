---
mode: testing
url: https://web.telegram.org/k/
tags: [channel]
max_steps: 60
local_context: botproof/telegram-context.md
---

# Bot edits and deletes its own channel post

## Open the bot chat
Open https://web.telegram.org/k/#@{{bot_username}} and wait until the chat is open and the message input box is visible.

## Post a special
Type /special and press Enter. Verify the bot replies "Posted today's special".

## Edit it
Type /special_edit and press Enter. Verify the bot replies "Edited the latest special". Open {{channel_link}} and verify the newest "Today's special" post now also says "Updated: now 20% off!" and still has the 👍 and 👎 buttons.

## Delete it
Go back to the chat with {{bot_username}} (https://web.telegram.org/k/#@{{bot_username}}), type /special_delete and press Enter. Verify the bot replies "Deleted the latest special". Open {{channel_link}} again and verify that post with "Updated: now 20% off!" is no longer shown.
