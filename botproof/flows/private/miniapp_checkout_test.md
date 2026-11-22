---
mode: testing
url: https://web.telegram.org/k/
tags: [miniapp, smoke]
max_steps: 70
local_context: botproof/telegram-context.md
---

# Checkout Mini App opens from the keyboard and its data reaches the bot

## Open the bot chat
Open https://web.telegram.org/k/#@{{bot_username}} and wait until the chat with {{bot_username}} is open and the message input box is visible.

## Reset any order in progress
Type /cancel in the message box and press Enter. Verify the bot replies with a message containing "Order cancelled".

## Confirm an order
Type /menu and press Enter. Click "🥛 Latte · $4.50", then "➕ Add Latte", close the alert with OK, click "2", type {{customer_name}} and press Enter, type {{customer_phone}} and press Enter, then click "✅ Confirm". Verify the bot says "Tap 💳 Checkout below to pay $9.00."

## Open the Mini App
Click the "💳 Checkout" button on the custom keyboard below the message input. Verify a Mini App titled "Brew Bot Checkout" opens inside Telegram showing Drink "Latte" and quantity 2.

## Use the form
Inside the Mini App, set "Pickup time" to "In 20 minutes". Verify the total shows "$9.00" and Telegram's main button at the bottom of the Mini App reads "Pay $9.00".

## Pay with the main button
Click the "Pay $9.00" main button. Verify the Mini App closes and the bot replies in the chat "Payment received" with "$9.00" and "Pickup at In 20 minutes".
