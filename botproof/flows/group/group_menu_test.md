---
mode: testing
url: https://web.telegram.org/k/
tags: [group, smoke]
max_steps: 30
local_context: botproof/telegram-context.md
---

# /menu@bot in a group posts the menu

## Open the test group
Open {{group_link}} in Telegram Web (or https://web.telegram.org/k/ and open the group from the chat list) and wait until the group chat is open with the message input box visible.

## Send /menu@bot
Type /menu@{{bot_username}} and press Enter.

## Check the menu
Verify a message from {{bot_username}} appears in the group with "Brew Bot menu — page 1/2" and inline drink buttons.
