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
