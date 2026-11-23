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
Open https://web.telegram.org/k/#@{{channel_username}}. If that does not show the channel, open https://web.telegram.org/k/ and click the chat named exactly "Testing" with the orange "T" avatar in the chat list. Do NOT open "Testing g" (the green "TG" avatar): that is the discussion group, which also shows copies of the channel posts. Check you are in the CHANNEL: its header shows "Testing" with a "subscribers" count, and the bottom bar says "Broadcast" or has no message box (the group shows "members" and "Send anonymously"). At the bottom of the newest "Today's special" post bubble, click the "Leave a comment" bar (or "N comments"). A comments view opens that shows that post at the top and has its own message box. Type "looks delicious" in THAT comments view and send it. Verify your comment appears in the thread under the post, not as a normal message in a chat.

## Bot answers the comment
Verify that within 15 seconds the bot replies to that comment with "Thanks for the feedback".
