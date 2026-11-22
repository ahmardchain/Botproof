# Demo video script (3–5 min)

Record only real runs. The failure in 2:15 is a **regression replay** from the `demo/regressions` branch, which
reintroduces a bug that Kane really caught during the build (from [caught.md](caught.md)). Say so on screen.
If caught.md is still empty when recording, skip the replay and show a live `botproof fix` on whatever really fails.

| Time | Screen | Voice-over |
|---|---|---|
| 0:00 | Phone/Telegram: tapping /start, menu, Next, Add, typing a phone number… by hand | "This is how Telegram bots get tested: by hand, after every change. Unit tests mock the Bot API; they never see what the user sees." |
| 0:30 | Terminal: `botproof init` (checks pass, test account login, group/channel links) then `cat botproof/flows/private/menu_pagination_test.md` | "BotProof: you write flows in plain English. Kane CLI runs them in real Telegram Web, logged in as a test account." |
| 1:00 | Split: terminal `botproof run --tag smoke` + Chrome showing Kane driving Telegram Web: /start, Next/Prev editing in place, quantity keyboard, name/phone with a bad input, confirm + photo, Checkout Mini App, Pay | "Commands, inline keyboards editing in place, the reply keyboard, the conversation re-asking on bad input, and the Mini App: Kane taps them like a person." |
| 1:45 | Kane in the test group: `/grouporder`, tap Latte → message shows the name. Channel: 👍 0 → 👍 1 | "Same bot in a group and a channel: the group order updates with who tapped; channel votes edit the post." |
| 2:15 | Title card **"Regression replay: <bug> (real bug from day N, re-introduced on demo/regressions)"**. `botproof fix <flow>`: FAIL, Kane's remark, screenshot | "Here a real bug from the build is back. Kane sees it in Telegram…" |
| 2:45 | Claude Code receiving the brief, editing `demo-bot/src/bot.ts`; a blocked edit to a flow file (hook message) | "…Claude gets the failing step, Kane's remark and the screenshot. It may only touch bot code; editing the test is refused." |
| 3:10 | Bot restarts, Kane re-runs → PASS; `botproof/runs/<id>/LOG.md` with the diff | "Kane re-runs the flow. Green. Every attempt, diff and re-run is logged; after three tries it stops and asks a human." |
| 3:30 | `botproof run` summary: all areas, credits, time; `kane-cli evidence serve` viewer; docs/caught.md | "Every area of the bot UI, with a sealed evidence pack per flow, and the bugs Kane caught while we built it." |
| 4:15 | Belief line on screen | "Your bot works on your laptop. BotProof proves it works in Telegram." |
