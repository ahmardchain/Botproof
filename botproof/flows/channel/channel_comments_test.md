---
mode: testing
url: https://web.telegram.org/k/
tags: [channel, comments]
max_steps: 60
local_context: botproof/telegram-context.md
---

# Comments in the linked discussion group reach the bot

## Open the bot chat
Open https://web.telegram.org/k/#@{{bot_username}} and wait until the chat is open and the message input box is visible.

## Post a special
Type /special and press Enter. Verify the bot replies "Posted today's special".

## Comment on the post
Open https://web.telegram.org/k/#@{{channel_username}} and wait until the channel's posts are shown (not a t.me preview page). Under the newest "Today's special" post click "Leave a comment" (or the comments counter) to open its comment thread, type "looks delicious" and send it.

## Bot answers the comment
Verify that within 15 seconds the bot replies to that comment with "Thanks for the feedback".
