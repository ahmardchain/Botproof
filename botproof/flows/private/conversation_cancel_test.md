---
mode: testing
url: https://web.telegram.org/k/
tags: [conversation]
max_steps: 45
local_context: botproof/telegram-context.md
---

# Cancelling mid-conversation ends the order and stale Confirm buttons are refused

## Open the bot chat
Open https://web.telegram.org/k/#@{{bot_username}} and wait until the chat with {{bot_username}} is open and the message input box is visible.

## Reset any order in progress
Type /cancel in the message box and press Enter. Verify the bot replies with a message containing "Order cancelled".

## Start an order
Type /menu and press Enter. Click "☕ Espresso · $3.00", then "➕ Add Espresso", close the alert with OK, click "1" on the custom keyboard, type {{customer_name}} and press Enter.

## Cancel mid-way
When the bot asks for a phone number, type /cancel and press Enter. Verify the bot replies "Order cancelled. Send /menu to start again."

## Bot no longer expects a phone
Type {{customer_phone}} and press Enter. Verify the bot does NOT reply with an "Order summary" within 10 seconds.
