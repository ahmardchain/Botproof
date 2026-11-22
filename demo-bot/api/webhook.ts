import { webhookCallback } from "grammy";
import { getBot } from "../src/runtime.js";

let handler: ((req: Request) => Promise<Response>) | undefined;

export async function POST(req: Request): Promise<Response> {
  if (!handler) {
    const { bot } = getBot();
    handler = webhookCallback(bot, "std/http", {
      secretToken: process.env.WEBHOOK_SECRET || undefined,
      timeoutMilliseconds: 9000,
    });
  }
  return handler(req);
}

export function GET(): Response {
  return new Response("Brew Bot webhook. Telegram POSTs updates here.", { status: 200 });
}
