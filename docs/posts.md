# Public posts (drafts for the user to publish)

Fill every `<…>` with real numbers from your runs before posting. Don't post claims the runs don't back.

## X / Twitter

> Telegram bots get tested by hand: send /start, tap a button, repeat after every change.
>
> I built BotProof for the #KaneCLIHack: plain-English flows that @TestMuAI's Kane CLI runs in real Telegram Web, logged in as a test account. When a flow fails, Claude Code gets the failure and fixes the bot. Kane re-runs until green.
>
> <n> flows: commands, inline + reply keyboards, a conversation, a Mini App, groups, channels.
> <video link> · <repo link>

## LinkedIn

> **Your bot works on your laptop. Does it work in Telegram?**
>
> Telegram bot testing is still manual: open the app, send /start, tap through menus, after every change. Unit tests
> mock the Bot API, so they never catch a button that does nothing, formatting that leaks raw `*` characters, or a Mini App that opens blank.
>
> For the KaneCLI Online Hackathon by TestMu AI I built **BotProof**:
> • Flows are plain English, one per user journey ("tap Next, check the same message now says page 2/2").
> • Kane CLI drives the real Telegram Web client in Chrome and checks what a user would see.
> • When a flow fails, the failing step, Kane's remark and a screenshot go to Claude Code, which patches the bot (only the bot: the tests are locked), and Kane re-runs. Three tries, then it asks a human.
>
> It covers <list the areas that pass>. While building the demo bot, Kane caught <n> real bugs: <one example>.
>
> Video: <link> · Code: <link>

## Reddit (r/TelegramBots) / Hacker News (Show HN)

**Title:** Show HN: BotProof – end-to-end tests for Telegram bots in real Telegram Web

> I kept testing my Telegram bots by tapping through them by hand. BotProof lets you write a flow in plain English;
> Kane CLI (TestMu AI's browser agent) runs it in Telegram Web logged in as a dedicated test account, so it sees exactly what a user sees: inline keyboards editing in place, reply keyboards, Mini Apps, group and channel behaviour.
>
> A fix loop hands failures to a coding agent, which may only edit the bot's code, then re-runs the flow (max 3 attempts, everything logged).
>
> Limits, honestly: needs a test Telegram account and Chrome, Telegram Web K only, flows run sequentially (one logged-in profile), <spike limits>.
>
> Repo: <link>. Built for the KaneCLI hackathon.
