---
mode: testing
url: https://web.telegram.org/k/
tags: [miniapp, menu-button]
max_steps: 50
local_context: botproof/telegram-context.md
---

# Menu button opens the Mini App; paying from it reaches the bot

## Open the bot chat
Open https://web.telegram.org/k/#@{{bot_username}} and wait until the chat is open and the message input box is visible.

## Open the menu button
Click the bot's menu button labelled "Checkout" at the left of the message input. Verify the "Brew Bot Checkout" Mini App opens inside Telegram.

## Pay
In the Mini App choose Drink "Mocha", quantity 1, then click the "Pay $4.75" main button at the bottom. Verify the Mini App shows "Paid" or closes, and the chat receives a bot message "Payment received" with "$4.75".
