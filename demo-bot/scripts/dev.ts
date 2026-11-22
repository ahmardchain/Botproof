// Local development: long polling, in-memory store unless Upstash env is set.
// Usage: BOT_TOKEN=... PUBLIC_URL=https://<your-deploy> npm run dev
import { createBot } from "../src/bot.js";
import { storeFromEnv } from "../src/store.js";
import { publicUrlFromEnv } from "../src/runtime.js";

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("Set BOT_TOKEN first (from @BotFather).");
  process.exit(1);
}
const bot = createBot(token, { store: storeFromEnv(), publicUrl: publicUrlFromEnv(), channelId: process.env.CHANNEL_ID });
await bot.api.deleteWebhook(); // long polling and webhooks are mutually exclusive
console.log("Brew Bot polling… (Ctrl-C to stop)");
await bot.start({ allowed_updates: ["message", "callback_query", "my_chat_member", "chat_member", "inline_query"] });
