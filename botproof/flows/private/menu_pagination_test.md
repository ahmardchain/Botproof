---
mode: testing
url: https://web.telegram.org/k/
tags: [smoke, keyboard, inline]
max_steps: 35
local_context: botproof/telegram-context.md
---

# Inline menu paginates by editing the same message

## Open the bot chat
Open https://web.telegram.org/k/#@{{bot_username}} and wait until the chat is open and the message input box is visible.

## Open the menu
Type /menu and press Enter. Verify a bot message "Brew Bot menu — page 1/2" appears with inline buttons for Latte, Espresso and Cappuccino, and a "Next ▶️" button.

## Next page
Click the "Next ▶️" button under that menu message. Verify the same message now reads "page 2/2" and shows buttons for Mocha, Americano and Chai Latte plus a "◀️ Prev" button, and that no new bot message was added below it.

## Previous page
Click "◀️ Prev". Verify the same message is back to "page 1/2" with the Latte button visible.
