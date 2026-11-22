---
mode: testing
url: https://web.telegram.org/k/
tags: [keyboard, reply-keyboard]
max_steps: 40
local_context: botproof/telegram-context.md
---

# Reply keyboard for quantity appears, sends the right text, then disappears

## Open the bot chat
Open https://web.telegram.org/k/#@{{bot_username}} and wait until the chat with {{bot_username}} is open and the message input box is visible.

## Reset any order in progress
Type /cancel in the message box and press Enter. Verify the bot replies with a message containing "Order cancelled".

## Add a Latte
Type /menu and press Enter. Click the "🥛 Latte · $4.50" button, then click "➕ Add Latte" and close the popup alert with OK.

## Keyboard appears
Verify the bot asks "How many Lattes would you like?" and a custom keyboard with the buttons 1, 2, 3 and Cancel is shown below the message input.

## Tap 2
Click the "2" button on that custom keyboard. Verify a message "2" is sent from the test account and the bot replies "Got it: 2 × Latte."

## Keyboard removed
Verify the custom keyboard with 1, 2, 3, Cancel is no longer shown below the message input.
