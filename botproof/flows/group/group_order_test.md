---
mode: testing
url: https://web.telegram.org/k/
tags: [group]
max_steps: 40
local_context: botproof/telegram-context.md
---

# Group order: tapping a drink edits the message with the tapper's name

## Open the test group
Open {{group_link}} in Telegram Web (or https://web.telegram.org/k/ and open the group from the chat list) and wait until the group chat is open with the message input box visible.

## Start a group order
Type /grouporder@{{bot_username}} and press Enter. Verify the bot posts "Group order (open)" with "No drinks yet" and drink buttons including "🥛 Latte" and "🍫 Mocha".

## Tap Latte
Click "🥛 Latte" under that group order message. Verify the same message is edited to list the test account's display name followed by "— Latte" and "Total: 1 drink", and a short notice "Added Latte for" appears.

## Change to Mocha
Click "🍫 Mocha" under the same message. Verify the list still has exactly one entry for the test account, now "— Mocha", and still "Total: 1 drink".
