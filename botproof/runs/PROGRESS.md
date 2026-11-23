# Every finished flow, in order (written as each flow ends)

| When | Flow | Result | Time | Credits | Evidence pack | Failure |
|---|---|---|---|---|---|---|
| 2026-11-22 20:40 | botproof/flows/private/miniapp_checkout_test.md | failed | 415s | 68.1 | `35f6bb44-b5cb-49a4-95fd-09f74d9384f2.evidence` | step 3 "Confirm an order": Final verification failed: "Verify the bot says "Tap 💳 Checkout below to pay $9.00."" |
| 2026-11-22 21:05 | botproof/flows/private/reply_keyboard_test.md | error | – | – | – | error: failed to start: connect_over_cdp: connect ECONNREFUSED 127.0.0.1:56386 |
| 2026-11-22 21:12 | botproof/flows/private/formatting_test.md | passed | 282s | 68.4 | `7a8d1e3e-62e1-44db-b410-8cb1d62a9e56.evidence` |  |
| 2026-11-22 21:14 | botproof/flows/channel/channel_special_vote_test.md | error | – | – | – | error: failed to start: connect_over_cdp: connect ECONNREFUSED 127.0.0.1:52257 |
| 2026-11-22 21:15 | botproof/flows/private/start_test.md | error | – | – | – | error: failed to start: connect_over_cdp: connect ECONNREFUSED 127.0.0.1:59174 |
| 2026-11-22 21:16 | botproof/flows/channel/channel_comments_test.md | error | – | – | – | error: Chrome launch failed: fetch failed |
| 2026-11-22 21:17 | botproof/flows/private/menu_pagination_test.md | error | – | – | – | error: Chrome launch failed: fetch failed |
| 2026-11-22 21:24 | botproof/flows/private/start_test.md | failed | 292s | 0.8 | `1a2600d1-efed-4ed5-933b-bc842eadb6ec.evidence` | step 2 "Reset any order in progress": AP produced no action for 3 consecutive steps |
| 2026-11-22 21:33 | botproof/flows/private/menu_pagination_test.md | passed | 365s | 60.5 | `34773f18-adfa-4bd4-8f46-5bf91537fad6.evidence` |  |
| 2026-11-22 21:42 | botproof/flows/private/item_details_test.md | passed | 402s | 80.0 | `b3d0caf4-d30c-4db1-b3d8-420a93f9305b.evidence` |  |
| 2026-11-22 21:50 | botproof/flows/group/group_order_test.md | passed | 335s | 80.2 | `91eea916-6c38-4e74-91d0-409daf80b98e.evidence` |  |
| 2026-11-22 22:08 | botproof/flows/group/group_close_admin_test.md | passed | 374s | 51.0 | `55946049-5b1d-4529-8145-8108d23d49f6.evidence` |  |
| 2026-11-22 22:26 | botproof/flows/private/miniapp_checkout_test.md | failed | 670s | 93.0 | `1939899b-a9a0-4d2c-9c45-767dafb859ad.evidence` | step 4 "Open the Mini App": Final verification failed: "A Mini App titled "Brew Bot Checkout" opens inside Telegram showing Drink "Latte" and quantity 2." |
| 2026-11-22 22:51 | botproof/flows/private/miniapp_checkout_test.md | passed | 1192s | 120.9 | `8e67fd7d-3364-4fb6-8e08-0cba90fd027d.evidence` |  |
| 2026-11-23 14:19 | botproof/flows/private/menu_pagination_test.md | passed | 388s | 46.9 | `1b365dd7-a46a-426f-aed8-873748dfdb06.evidence` |  |
| 2026-11-23 14:31 | botproof/flows/group/group_close_admin_test.md | passed | 498s | 66.5 | `674ba060-4122-4522-bab9-c3c15c29a419.evidence` |  |
| 2026-11-23 15:54 | botproof/flows/private/help_test.md | passed | 153s | 39.6 | `385d344d-832e-43d8-92e0-30b7ef3df550.evidence` |  |
| 2026-11-23 15:58 | botproof/flows/private/deeplink_test.md | passed | 137s | 35.5 | `f1958bda-350f-486d-8854-3ccdcbb91053.evidence` |  |
| 2026-11-23 16:06 | botproof/flows/private/reply_keyboard_test.md | failed | 337s | 76.5 | `9c360769-a73f-4d22-87c3-4607caf489fe.evidence` | step 4 "Keyboard appears": Final verification failed: "the bot asks "How many Lattes would you like?" and a custom keyboard with the buttons 1, 2, 3 and Cancel is shown below the message input" |
| 2026-11-23 16:12 | botproof/flows/private/reply_keyboard_test.md | failed | 275s | 34.2 | `ca267048-5634-4aaf-b250-cd41d69236fb.evidence` | step 4 "Keyboard appears": Final verification failed: "the bot asks "How many Lattes would you like?" and a custom keyboard with the buttons 1, 2, 3 and Cancel is shown below the message input" |
| 2026-11-23 16:27 | botproof/flows/private/conversation_test.md | passed | 667s | 141.6 | `274e1e7a-e98e-458e-9840-125e17a50a7a.evidence` |  |
| 2026-11-23 16:35 | botproof/flows/stretch/stale_button_test.md | failed | 382s | 106.4 | `8aa44df1-6fea-41e3-9363-8ca4e738fd66.evidence` | step 4 "Tap the stale Confirm": Final verification failed: "A popup says "This order has expired" and no photo or "Confirmed" text is produced." |
| 2026-11-23 16:45 | botproof/flows/stretch/stale_button_test.md | failed | 450s | 63.4 | `57166ef4-c882-4814-809d-6507884aef54.evidence` | step 2 "Reach the summary": Final verification failed: "an "Order summary" with a "✅ Confirm" button appears." |
| 2026-11-23 16:51 | botproof/flows/private/menu_button_test.md | passed | 223s | 48.5 | `018b430d-7c97-40ec-b9da-d3e7dba34ccb.evidence` |  |
| 2026-11-23 16:55 | botproof/flows/stretch/inline_mode_test.md | passed | 182s | 51.8 | `103b0411-7d30-4c56-9367-0ac82257111a.evidence` |  |
| 2026-11-23 17:00 | botproof/flows/channel/channel_special_vote_test.md | failed | 224s | 39.6 | `615151c4-844e-4bd8-b5b6-de7486758d5e.evidence` | step 3 "Find the post": Checkpoint assertion failed: "You are in the CHANNEL: its header shows the channel name with a "subscribers" count, and there is no message box for typing." |
| 2026-11-23 17:11 | botproof/flows/channel/channel_special_vote_test.md | passed | 483s | 111.7 | `61f54ea3-4aa3-4ed9-b769-bfdf42976d33.evidence` |  |
| 2026-11-23 17:16 | botproof/flows/channel/channel_comments_test.md | failed | 234s | 44.8 | `1b440056-3da2-47b9-81ff-c31b6ee5fa21.evidence` | step 3 "Comment on the post": Checkpoint assertion failed: "You are in the CHANNEL: its header shows "Testing" with a "subscribers" count, and the bottom bar says "Broadcast" or has no message box." |
| 2026-11-23 17:22 | botproof/flows/channel/channel_comments_test.md | failed | 294s | 37.9 | `220c8920-0767-4e08-9d3b-d27e7c06434c.evidence` | step 3 "Comment on the post": Checkpoint assertion failed: "You are in the CHANNEL: its header shows "Testing" with a "subscribers" count, and the bottom bar says "Broadcast" or has no message box." |
| 2026-11-23 17:36 | botproof/flows/group/group_privacy_test.md | passed | 691s | 103.3 | `511648ef-09b5-4ab2-bef2-acd26e3f5225.evidence` |  |
