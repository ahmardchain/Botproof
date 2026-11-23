---
mode: testing
url: https://web.telegram.org/k/
tags: [group, membership]
max_steps: 60
local_context: botproof/telegram-context.md
---

# Bot handles being removed and re-added

## Open the test group
Open https://web.telegram.org/k/#@{{group_username}} and wait until the group chat is open with the message input box visible.

## Remove the bot
Open the group info (click the group name at the top), find {{bot_username}} in the members list and remove it from the group. Verify the members list no longer shows the bot.

## Add the bot back
In the group info, use "Add members" (or the add-member button), search for {{bot_username}} and add it. Return to the chat.

## Check the greeting
Verify the bot posts "Thanks for adding me!" in the group.

## Make the bot admin again
Make the bot admin again: group info → Edit → Administrators → Add Admin, pick {{bot_username}}, save. Verify the bot is listed under Administrators.
