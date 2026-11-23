---
mode: testing
url: https://web.telegram.org/k/
tags: [stretch, stale]
max_steps: 50
local_context: botproof/telegram-context.md
---

# Stale and double-tapped buttons are handled

## Open the bot chat
Open https://web.telegram.org/k/#@{{bot_username}} and wait until the chat is open and the message input box is visible.

## Reach the summary
Type /cancel and press Enter. Type /menu and press Enter. Click "☕ Espresso · $3.00", "➕ Add Espresso", close the alert with OK, click "1", type {{customer_name}} and press Enter, type {{customer_phone}} and press Enter. Verify an "Order summary" with a "✅ Confirm" button appears.

## Make the button stale
Type /cancel and press Enter. Verify the bot replies "Order cancelled".

## Tap the stale Confirm
Scroll up to the "Order summary" message and click its "✅ Confirm" button. Verify a Telegram popup appears whose text contains "This order has expired".

## Nothing was confirmed
Click OK on that popup. Verify that the newest message in the chat is still the bot's "Order cancelled" reply, and that no "Confirmed" text and no drink photo appeared below it.
