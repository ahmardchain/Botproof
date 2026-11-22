---
mode: testing
url: https://web.telegram.org/k/
tags: [rendering]
max_steps: 60
local_context: botproof/telegram-context.md
---

# Order summary renders formatting, no raw markup leaks

## Open the bot chat
Open https://web.telegram.org/k/#@{{bot_username}} and wait until the chat with {{bot_username}} is open and the message input box is visible.

## Reset any order in progress
Type /cancel in the message box and press Enter. Verify the bot replies with a message containing "Order cancelled".

## Reach the summary
Type /menu and press Enter. Click the "☁️ Cappuccino · $4.00" button on page 1 of the menu, then click "➕ Add Cappuccino", close the alert with OK, click "1", type {{customer_name}} and press Enter, then type {{customer_phone}} and press Enter.

## Check the formatting
In the "Order summary" message verify: "Order summary" and "$4.00" are shown in bold, the phone number is shown in a monospace/code style, and "Brew Bot Café" is a clickable link. Verify the message contains none of these raw characters: "<b>", "</b>", "**", "\\", "&lt;", and that Telegram did not show "message is empty".
