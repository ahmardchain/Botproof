---
mode: testing
url: https://web.telegram.org/k/
tags: [conversation, smoke]
max_steps: 60
local_context: botproof/telegram-context.md
---

# Order conversation validates input and confirms with a photo

## Open the bot chat
Open https://web.telegram.org/k/#@{{bot_username}} and wait until the chat with {{bot_username}} is open and the message input box is visible.

## Reset any order in progress
Type /cancel in the message box and press Enter. Verify the bot replies with a message containing "Order cancelled".

## Choose a drink and quantity
Type /menu and press Enter. Click "🥛 Latte · $4.50", then "➕ Add Latte", close the alert with OK, and click "2" on the custom keyboard. Verify the bot asks "What name should we put on the cup?"

## Bad name is re-asked
Type 1234 and press Enter. Verify the bot replies "Please send a real name".

## Good name
Type {{customer_name}} and press Enter. Verify the bot replies "Thanks, {{customer_name}}! What's your phone number?"

## Bad phone is re-asked
Type call me maybe and press Enter. Verify the bot replies "That doesn't look like a phone number".

## Good phone shows the summary
Type {{customer_phone}} and press Enter. Verify the bot replies with an "Order summary" message showing "2 × Latte" and "$9.00", the name {{customer_name}}, and "✅ Confirm" and "❌ Cancel" buttons.

## Confirm
Click "✅ Confirm". Verify the summary message now says "Confirmed" with an order number like "order #1234", and the bot sends a photo whose caption says "Your Latte is on its way" with the same order number.
