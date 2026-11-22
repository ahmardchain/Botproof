// Daily "today's special" post, triggered by Vercel Cron (see vercel.json).
import { getBot } from "../src/runtime.js";
import { postSpecial } from "../src/bot.js";

export async function GET(req: Request): Promise<Response> {
  // Vercel sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const { bot, opts, store } = getBot();
  if (!opts.channelId) return new Response("CHANNEL_ID not set", { status: 200 });
  const post = await postSpecial(bot, opts, store);
  return Response.json({ ok: true, ...post });
}
