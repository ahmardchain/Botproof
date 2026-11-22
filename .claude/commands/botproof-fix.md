---
description: Run BotProof flows in real Telegram Web and fix the bot until they pass (max 3 attempts)
argument-hint: "[flow names or --tag <tag>]"
---

Use the botproof skill. Run `botproof fix --step $ARGUMENTS` (from the repo root; use `node cli/dist/index.js` if `botproof` is not on PATH).
Loop on its exit code exactly as the skill says: 10 → read the brief and the screenshot it names, patch only bot code, run `botproof fix --step` again; 0 → done; 1 → escalate with a summary; 2 → stop and report the setup problem.
