---
mode: testing
url: https://web.telegram.org/k/
tags: [group, membership]
max_steps: 60
local_context: botproof/telegram-context.md
---

# Bot handles being removed and re-added

## Open the test group
Open {{group_link}} in Telegram Web (or https://web.telegram.org/k/ and open the group from the chat list) and wait until the group chat is open with the message input box visible.

## Remove the bot
Open the group info (click the group name at the top), find {{bot_username}} in the members list and remove it from the group. Verify the members list no longer shows the bot.

## Add the bot back
In the group info, use "Add members" (or the add-member button), search for {{bot_username}} and add it. Return to the chat.

## Check the greeting
Verify the bot posts "Thanks for adding me!" in the group.
