---
mode: testing
url: https://web.telegram.org/k/
tags: [keyboard, inline]
max_steps: 40
local_context: botproof/telegram-context.md
---

# /start main-menu buttons each do their job

## Open the bot chat
Open https://web.telegram.org/k/#@{{bot_username}} and wait until the chat with {{bot_username}} is open and the message input box is visible.

## Show the main menu
Type /start and press Enter. Verify the newest bot message "Welcome to Brew Bot" has the inline buttons "📋 Open menu", "💳 Checkout", "❓ Help", "🛑 Cancel order" and "👥 Add me to a group".

## Help button
Click "❓ Help" under that welcome message. Verify the bot sends a message "Brew Bot commands" listing /menu and /grouporder, with a "📋 Open menu" button.

## Open menu from the help message
Click "📋 Open menu" under the help message. Verify that message changes into "Brew Bot menu — page 1/2" with drink buttons.

## Cancel button
Scroll to the welcome message and click "🛑 Cancel order". Verify the bot replies "Order cancelled".

## Checkout button opens the Mini App
Click "💳 Checkout" under the welcome message. Verify the "Brew Bot Checkout" Mini App opens inside Telegram with a Pay button at the bottom. Close the Mini App without paying.
