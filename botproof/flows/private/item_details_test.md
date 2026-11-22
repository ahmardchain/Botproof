---
mode: testing
url: https://web.telegram.org/k/
tags: [keyboard, inline]
max_steps: 40
local_context: botproof/telegram-context.md
---

# Item details edit in place, URL button and callback alert

## Open the bot chat
Open https://web.telegram.org/k/#@{{bot_username}} and wait until the chat is open and the message input box is visible.

## Open the menu
Type /menu and press Enter and wait for the menu message with the Latte button.

## Open Latte
Click the "🥛 Latte · $4.50" button. Verify the same message is edited to show "Latte — $4.50" in bold, the description "Espresso with steamed milk", and buttons "➕ Add Latte", "📖 About Latte" and "⬅️ Back to menu".

## URL button target
Click the "📖 About Latte" button. Verify Telegram asks to open a link, or opens a page, whose address contains "wikipedia.org/wiki/Latte". Close any new tab or dismiss the popup and return to the chat.

## Add shows an alert
Click "➕ Add Latte". Verify a popup alert appears with the text "Latte added to your order". Click OK to close it.
