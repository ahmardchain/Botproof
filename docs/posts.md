# Public posts (drafts for the user to publish)

Numbers below are from the real runs (11 of 22 flows passing live, 1 real bug caught). Post the X and LinkedIn ones, then put their links in docs/submission.md.

## X / Twitter

> I built BotProof for #KaneCLIHackDay: @testmuai's Kane CLI tests a Telegram bot in real Telegram Web, and Claude Code fixes what fails.
>
> 11 flows green. It caught a real bug the unit tests never would.
>
> https://youtu.be/mY_bRyfb-SE
> https://github.com/ahmardchain/Botproof

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
> 11 flows pass live: commands, inline keyboards editing in place, message formatting, a Mini App checkout, group orders and channel posts. While building the demo bot, Kane caught a real bug: the bot refused /close from the group's own owner when they posted as an anonymous admin. Claude Code fixed it in one attempt and Kane confirmed the fix.
>
> Video: https://youtu.be/mY_bRyfb-SE · Code: https://github.com/ahmardchain/Botproof

## Reddit (r/TelegramBots) / Hacker News (Show HN)

**Title:** Show HN: BotProof – end-to-end tests for Telegram bots in real Telegram Web

> I kept testing my Telegram bots by tapping through them by hand. BotProof lets you write a flow in plain English;
> Kane CLI (TestMu AI's browser agent) runs it in Telegram Web logged in as a dedicated test account, so it sees exactly what a user sees: inline keyboards editing in place, reply keyboards, Mini Apps, group and channel behaviour.
>
> A fix loop hands failures to a coding agent, which may only edit the bot's code, then re-runs the flow (max 3 attempts, everything logged).
>
> Limits, honestly: needs a test Telegram account and Chrome, Telegram Web K only, flows run sequentially (one logged-in profile), and multi-account group tests aren't built yet.
>
> Repo: https://github.com/ahmardchain/Botproof · Video: https://youtu.be/mY_bRyfb-SE. Built for the KaneCLI hackathon.
