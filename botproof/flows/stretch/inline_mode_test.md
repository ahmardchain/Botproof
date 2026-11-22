---
mode: testing
url: https://web.telegram.org/k/
tags: [stretch, inline-mode]
max_steps: 40
local_context: botproof/telegram-context.md
---

# Inline mode: @bot query in another chat

## Open Saved Messages
Open https://web.telegram.org/k/ and open "Saved Messages" from the chat list (or the menu).

## Query the bot inline
In the message box type "@{{bot_username}} mocha" and wait for a results list to pop up above the input. Verify it shows "🍫 Mocha — $4.75".

## Send the result
Click that result. Verify a message "Mocha — $4.75" with "A latte with chocolate." is sent into Saved Messages "via @{{bot_username}}".
