---
mode: testing
url: https://web.telegram.org/k/
tags: [smoke, commands]
max_steps: 25
local_context: botproof/telegram-context.md
---

# /start replies with a formatted welcome

## Open the bot chat
Open https://web.telegram.org/k/#@{{bot_username}} and wait until the chat with {{bot_username}} is open and the message input box is visible.

## Reset any order in progress
Type /cancel in the message box and press Enter. Verify the bot replies with a message containing "Order cancelled".

## Send /start
Type /start in the message box and press Enter.

## Check the welcome
Verify a new bot message appears that starts with "Welcome to Brew Bot" in bold text, has an inline button "📋 Open menu" under it, and shows no raw HTML tags such as "<b>".
