// One-time Telegram setup for a deployed Brew Bot:
// webhook, command list, and the menu button that opens the Mini App.
// Usage: BOT_TOKEN=... PUBLIC_URL=https://<deploy> [WEBHOOK_SECRET=...] npm run setup
import { Api } from "grammy";
import { publicUrlFromEnv } from "../src/runtime.js";

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("Set BOT_TOKEN first (from @BotFather).");
  process.exit(1);
}
const url = publicUrlFromEnv();
if (!url.startsWith("https://")) {
  console.error(`PUBLIC_URL must be https (got ${url}).`);
  process.exit(1);
}
const api = new Api(token);
const me = await api.getMe();

await api.setWebhook(`${url}/api/webhook`, {
  secret_token: process.env.WEBHOOK_SECRET || undefined,
  allowed_updates: ["message", "callback_query", "my_chat_member", "chat_member", "inline_query"],
  drop_pending_updates: true,
});
await api.setMyCommands([
  { command: "start", description: "Welcome" },
  { command: "menu", description: "Browse drinks" },
  { command: "cancel", description: "Cancel the current order" },
  { command: "grouporder", description: "Start a group order (groups)" },
  { command: "close", description: "Close the group order (admins)" },
  { command: "special", description: "Post today's special (channel admins)" },
  { command: "help", description: "All commands" },
]);
await api.setChatMenuButton({ menu_button: { type: "web_app", text: "Checkout", web_app: { url: `${url}/checkout.html?src=menu` } } });

const info = await api.getWebhookInfo();
console.log(`@${me.username}: webhook ${info.url}, pending ${info.pending_update_count}, last error: ${info.last_error_message ?? "none"}`);
console.log(`Privacy mode: ${me.can_read_all_group_messages ? "OFF (reads all group messages)" : "ON (commands, mentions, replies only)"}`);
console.log(`Inline mode: ${me.supports_inline_queries ? "on" : "off — enable with /setinline in @BotFather for the inline flow"}`);
