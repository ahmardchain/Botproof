---
mode: testing
url: https://web.telegram.org/k/
tags: [commands]
max_steps: 25
local_context: botproof/telegram-context.md
---

# /help lists every command

## Open the bot chat
Open https://web.telegram.org/k/#@{{bot_username}} and wait until the chat is open and the message input box is visible.

## Send /help
Type /help and press Enter.

## Check the command list
Verify the bot's reply lists /menu, /cancel, /grouporder, /close and /special, each with a short description.
