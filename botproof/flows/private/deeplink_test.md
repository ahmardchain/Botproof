---
mode: testing
url: https://web.telegram.org/k/
tags: [commands, deeplink]
max_steps: 30
local_context: botproof/telegram-context.md
---

# Deep link t.me/<bot>?start=promo applies the promo

## Open the deep link
Open https://web.telegram.org/k/#?tgaddr=tg%3A%2F%2Fresolve%3Fdomain%3D{{bot_username}}%26start%3Dpromo and wait for the chat with {{bot_username}} to open. If Telegram shows a "Start" or "Restart" button at the bottom instead of the input box, click it.

## Check the promo welcome
Verify the newest bot message contains "Welcome to Brew Bot" and also "Promo applied: 10% off your first order".
