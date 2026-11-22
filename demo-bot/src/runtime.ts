import type { Bot } from "grammy";
import { createBot, type BotOptions } from "./bot.js";
import { storeFromEnv, type Store } from "./store.js";

let cached: { bot: Bot; store: Store; opts: BotOptions } | undefined;

export function publicUrlFromEnv(env = process.env): string {
  if (env.PUBLIC_URL) return env.PUBLIC_URL.replace(/\/$/, "");
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** One bot per warm serverless instance. */
export function getBot() {
  if (cached) return cached;
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is not set");
  const store = storeFromEnv();
  const opts: BotOptions = { store, publicUrl: publicUrlFromEnv(), channelId: process.env.CHANNEL_ID || undefined };
  cached = { bot: createBot(token, opts), store, opts };
  return cached;
}
