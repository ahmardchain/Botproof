# Submission form text (draft)

Submit early on 26 Nov (deadline 11:59 PM IST = 18:29 UTC).

**Project name:** BotProof

**One line:** Your bot works on your laptop. BotProof proves it works in Telegram.

**What it is:**
BotProof is end-to-end testing for Telegram bots. You write plain-English flows (Kane `_test.md` files), one per user
journey. Kane CLI runs them in the real Telegram Web client in Chrome, logged in as a dedicated test account, and checks
what a user sees: commands and deep links, inline keyboards that edit in place, callback alerts, reply keyboards,
multi-step conversations, message formatting, photos, a Mini App with Telegram's main button, the menu button, group
behaviour (mentions, privacy mode, admin-only commands, a shared group order) and channel posts with vote buttons and comments.
A demo coffee-order bot (Brew Bot) exercises all of it.

**Which coding agent:** Claude Code. It is integrated through a skill and a `/botproof-fix` command, and through
`botproof fix`, which calls `claude -p` directly.

**What Kane does:**
Kane is the only thing that touches Telegram. `botproof run` calls `kane-cli testmd run <flow> --agent` per flow, reads the
NDJSON stream (`test_md_step_end`, `test_md_done`, exit code) and reports pass/fail with the evidence pack.
In the closed loop, Kane's failure (failing step, Kane's remark, failure record and screenshot from the evidence pack) is
handed to Claude Code, which patches the bot code only (allowlist enforced by a PreToolUse hook and a git-snapshot revert);
the bot restarts and Kane re-runs the failed flow, up to 3 attempts, then escalates to a human. Every attempt is logged with its diff.

**What Kane caught/proved:** 1 real bug caught while building the demo bot: anonymous group admins couldn't close a
group order (the bot told the group's own owner "Only group admins"). Kane caught it in real Telegram Web, the fix loop
handed it to Claude Code, which patched one condition; BotProof redeployed and Kane passed the re-run (docs/caught.md,
botproof/runs/fix-2026-11-22T18-25-38/LOG.md). 11 of 22 flows pass live, across commands, inline keyboards, the
conversation's cancel path, message formatting, the Mini App checkout, groups and channels.

**Links:** repo https://github.com/ahmardchain/Botproof · video https://youtu.be/mY_bRyfb-SE · demo bot https://t.me/botproofbot · posts <X link>, <LinkedIn link>
