// Checkout submitted from the Mini App when it was opened from the menu button
// (Telegram.WebApp.sendData only works for Mini Apps opened from a reply-keyboard button).
import { getBot } from "../src/runtime.js";
import { verifyInitData } from "../src/webapp.js";
import { esc, money } from "../src/menu.js";

export async function POST(req: Request): Promise<Response> {
  const token = process.env.BOT_TOKEN;
  if (!token) return Response.json({ ok: false, error: "not configured" }, { status: 500 });
  let body: { initData?: string; order?: string; total?: number; pickup?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const params = verifyInitData(body.initData ?? "", token);
  if (!params) return Response.json({ ok: false, error: "invalid initData" }, { status: 401 });
  const user = JSON.parse(params.get("user") ?? "{}") as { id?: number };
  if (!user.id) return Response.json({ ok: false, error: "no user" }, { status: 400 });
  const { bot } = getBot();
  await bot.api.sendMessage(
    user.id,
    `✅ <b>Payment received</b> for order #${esc(String(body.order || "M" + Date.now().toString().slice(-4)))} — ${money(Number(body.total ?? 0))}.\nPickup at <b>${esc(body.pickup ?? "the counter")}</b>.`,
    { parse_mode: "HTML" },
  );
  return Response.json({ ok: true });
}
