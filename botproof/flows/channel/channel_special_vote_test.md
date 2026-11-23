---
mode: testing
url: https://web.telegram.org/k/
tags: [channel, smoke]
max_steps: 50
local_context: botproof/telegram-context.md
---

# Bot posts today's special to the channel; votes edit the counts

## Open the bot chat
Open https://web.telegram.org/k/#@{{bot_username}} and wait until the chat is open and the message input box is visible.

## Ask for the special
Type /special and press Enter. Verify the bot replies "Posted today's special".

## Find the post
Open https://web.telegram.org/k/#@{{channel_username}}. If that does not show the channel, open https://web.telegram.org/k/ and click the chat named exactly "Testing" with the orange "T" avatar in the chat list. Do NOT open "Testing g" (the green "TG" avatar): that is the discussion group, which also shows copies of the channel posts. Check you are in the CHANNEL: its header shows "Testing" with a "subscribers" count, and the bottom bar says "Broadcast" or has no message box (the group shows "members" and "Send anonymously"). Verify the newest post is "Today's special" in bold with today's drink in italics and two buttons "👍 0" and "👎 0".

## Vote up
Click "👍 0" under that post. Verify the button changes to "👍 1" on the same post and a notice "You voted 👍" appears.

## Switch the vote
Click "👎 0" under the same post. Verify the buttons now read "👍 0" and "👎 1".
