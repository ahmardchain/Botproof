---
name: botproof
description: Test and fix a Telegram bot end to end in real Telegram Web with BotProof and Kane CLI. Use when the user asks to test the bot, check a Telegram flow, or fix a failing BotProof flow.
---

# BotProof: test the bot in real Telegram, fix what fails

BotProof wraps Kane CLI (`kane-cli testmd run … --agent`). Kane drives the real Telegram Web
client, logged in as a dedicated test account, through plain-English flows in `botproof/flows/**/_test.md`.
This skill follows the Kane skill's rules (one saved test per flow, parse the completion event and exit code,
never fake a result). If the Kane skill is installed (`npx @testmuai/kane-cli-skill`), its rules apply too.

## Run flows

```bash
botproof list                    # flows and tags
botproof run start               # one flow by name
botproof run --tag smoke         # by tag
```

Exit 0 = all passed, 1 = a flow failed (Kane saw the bot misbehave), 2 = Kane/setup error (not logged in,
Chrome, timeout). Report the per-flow lines as printed. On exit 2 do NOT touch bot code: tell the user what
setup is missing.

## Fix loop (agent-driven)

Run `botproof fix --step [flow…|--tag t]` and act on its exit code:

- **0**: everything passes. Report the log path it prints (`botproof/runs/<id>/LOG.md`).
- **10**: a patch is needed. The output is a brief: the failing flow, the step Kane failed on, Kane's remark,
  the evidence pack, a screenshot path (read it) and the bot sources. Fix the **bot** so the flow passes, then
  run `botproof fix --step` again (no arguments needed; state is kept). Up to 3 attempts.
- **1**: escalated after 3 attempts. Stop. Summarise for the human what failed and what you tried.
- **2**: Kane could not run (not a bot bug). Stop and report.

Rules while a fix is in progress (enforced by the PreToolUse hook and by `botproof fix`, which reverts violations):

- Only edit paths in `fix.editable` of `botproof/botproof.config.json` (bot code).
- Never edit `*_test.md` flows, `botproof/`, `cli/` or `.claude/`. Never weaken a flow to make it pass.
- Never claim a pass that `botproof` did not report.

## Autonomous loop

`botproof fix` (without `--step`) runs the same loop on its own, invoking `fix.agentCommand`
(default `claude -p …`) with the brief on stdin, restarting the bot via `fix.botCommand` after each patch.
