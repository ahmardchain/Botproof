import { Bot, Context, InlineKeyboard, Keyboard, InlineQueryResultBuilder } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import {
  DRINKS,
  PAGE_COUNT,
  addToGroupOrder,
  clampPage,
  drinkById,
  drinkText,
  esc,
  groupOrderText,
  menuText,
  money,
  normalizePhone,
  orderSummary,
  orderTotal,
  pageItems,
  specialFor,
  specialText,
  validName,
  vote,
  type GroupOrder,
  type Order,
  type Votes,
} from "./menu.js";
import type { Store } from "./store.js";

export interface BotOptions {
  store: Store;
  /** Public base URL of the deployment, e.g. https://brewbot.vercel.app */
  publicUrl: string;
  /** Channel for "today's special", e.g. @brewbot_specials or -100123... */
  channelId?: string;
  botInfo?: UserFromGetMe;
}

type Step = "qty" | "name" | "phone" | "confirm" | "checkout";
interface Conv {
  step: Step;
  order: Order;
}

const CONV_TTL = 60 * 60; // 1 hour
const HTML = { parse_mode: "HTML" as const };

const convKey = (chatId: number, userId: number) => `conv:${chatId}:${userId}`;
const goKey = (chatId: number, msgId: number) => `go:${chatId}:${msgId}`;
const goLatestKey = (chatId: number) => `golatest:${chatId}`;
const votesKey = (chatId: number, msgId: number) => `votes:${chatId}:${msgId}`;
const lastSpecialKey = "special:last";

export function menuKeyboard(page: number): InlineKeyboard {
  const p = clampPage(page);
  const kb = new InlineKeyboard();
  for (const d of pageItems(p)) kb.text(`${d.emoji} ${d.name} · ${money(d.price)}`, `item:${d.id}:${p}`).row();
  if (p > 1) kb.text("◀️ Prev", `menu:${p - 1}`);
  kb.text(`${p}/${PAGE_COUNT}`, "noop");
  if (p < PAGE_COUNT) kb.text("Next ▶️", `menu:${p + 1}`);
  return kb;
}

function quantityKeyboard(): Keyboard {
  return new Keyboard().text("1").text("2").text("3").row().text("Cancel").oneTime().resized();
}

function checkoutUrl(publicUrl: string, o: Order, src: "kb" | "menu"): string {
  const q = new URLSearchParams({
    src,
    order: String(o.number ?? ""),
    drink: o.drinkId,
    qty: String(o.qty),
    name: o.name ?? "",
  });
  return `${publicUrl}/checkout.html?${q.toString()}`;
}

function displayName(u: { first_name: string; last_name?: string }): string {
  return [u.first_name, u.last_name].filter(Boolean).join(" ");
}

async function isAdmin(ctx: Context, chatId: number | string, userId: number): Promise<boolean> {
  const m = await ctx.api.getChatMember(chatId, userId);
  return m.status === "administrator" || m.status === "creator";
}

export function createBot(token: string, opts: BotOptions): Bot {
  const { store, publicUrl } = opts;
  const bot = new Bot(token, opts.botInfo ? { botInfo: opts.botInfo } : undefined);

  // ---------- Commands & deep links ----------

  bot.command("start", async (ctx) => {
    const payload = ctx.match.trim();
    const name = ctx.from ? esc(ctx.from.first_name) : "there";
    const lines = [`<b>Welcome to Brew Bot, ${name}!</b> ☕`, "Order coffee without leaving Telegram."];
    if (payload === "promo") lines.push("", "🎉 <b>Promo applied:</b> 10% off your first order.");
    lines.push("", "Send /menu to see drinks or /help for all commands.");
    await ctx.reply(lines.join("\n"), {
      ...HTML,
      reply_markup: startKeyboard(ctx.me.username, ctx.chat.type === "private"),
    });
    // Deep link straight into ordering a drink, e.g. t.me/<bot>?start=order_latte
    const m = /^order_([a-z]+)$/.exec(payload);
    if (m && drinkById(m[1]) && ctx.chat.type === "private" && ctx.from) {
      await startQuantity(ctx, m[1]);
    }
  });

  // Main menu: every action reachable with a tap. Web App buttons only work in private chats.
  function startKeyboard(username: string, isPrivate: boolean): InlineKeyboard {
    const kb = new InlineKeyboard().text("📋 Open menu", "menu:1");
    if (isPrivate) kb.webApp("💳 Checkout", `${publicUrl}/checkout.html?src=menu`);
    kb.row().text("❓ Help", "help").text("🛑 Cancel order", "cancel");
    kb.row().url("👥 Add me to a group", `https://t.me/${username}?startgroup=true`);
    if (opts.channelId?.startsWith("@")) kb.row().url("📢 Today's special", `https://t.me/${opts.channelId.slice(1)}`);
    return kb;
  }

  const HELP_TEXT = [
    "<b>Brew Bot commands</b>",
    "/menu — browse drinks",
    "/cancel — cancel the current order",
    "/grouporder — start a group order (groups)",
    "/close — close the group order (group admins only)",
    "/special — post today's special to the channel (channel admins)",
    "/help — this message",
  ].join("\n");

  bot.command("help", (ctx) => ctx.reply(HELP_TEXT, { ...HTML, reply_markup: new InlineKeyboard().text("📋 Open menu", "menu:1") }));

  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(HELP_TEXT, { ...HTML, reply_markup: new InlineKeyboard().text("📋 Open menu", "menu:1") });
  });

  bot.callbackQuery("cancel", async (ctx) => {
    if (ctx.chat && ctx.from) await store.del(convKey(ctx.chat.id, ctx.from.id));
    await ctx.answerCallbackQuery({ text: "Order cancelled" });
    await ctx.reply("Order cancelled. Send /menu to start again.", { reply_markup: { remove_keyboard: true } });
  });

  bot.command("menu", (ctx) => ctx.reply(menuText(1), { ...HTML, reply_markup: menuKeyboard(1) }));

  bot.command("cancel", async (ctx) => {
    if (!ctx.from) return;
    await store.del(convKey(ctx.chat.id, ctx.from.id));
    await ctx.reply("Order cancelled. Send /menu to start again.", { reply_markup: { remove_keyboard: true } });
  });

  // ---------- Inline keyboards: pagination, edit in place, alerts, URL buttons ----------

  bot.callbackQuery("noop", (ctx) => ctx.answerCallbackQuery());

  bot.callbackQuery(/^menu:(\d+)$/, async (ctx) => {
    const page = clampPage(Number(ctx.match[1]));
    await ctx.editMessageText(menuText(page), { ...HTML, reply_markup: menuKeyboard(page) });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^item:([a-z]+):(\d+)$/, async (ctx) => {
    const d = drinkById(ctx.match[1]);
    if (!d) return ctx.answerCallbackQuery({ text: "That drink is no longer on the menu." });
    const kb = new InlineKeyboard()
      .text(`➕ Add ${d.name}`, `add:${d.id}`)
      .row()
      .url(`📖 About ${d.name}`, d.wiki)
      .row()
      .text("⬅️ Back to menu", `menu:${ctx.match[2]}`);
    await ctx.editMessageText(drinkText(d), { ...HTML, reply_markup: kb, link_preview_options: { is_disabled: true } });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^add:([a-z]+)$/, async (ctx) => {
    const d = drinkById(ctx.match[1]);
    if (!d || !ctx.chat) return ctx.answerCallbackQuery({ text: "That drink is no longer on the menu." });
    if (ctx.chat.type !== "private") {
      await ctx.answerCallbackQuery({
        text: `Order ${d.name} in a private chat with me: open t.me/${ctx.me.username}?start=order_${d.id}`,
        show_alert: true,
      });
      return;
    }
    await ctx.answerCallbackQuery({ text: `${d.name} added to your order ✅`, show_alert: true });
    await startQuantity(ctx, d.id);
  });

  async function startQuantity(ctx: Context, drinkId: string) {
    const d = drinkById(drinkId)!;
    await store.set<Conv>(convKey(ctx.chat!.id, ctx.from!.id), { step: "qty", order: { drinkId, qty: 0 } }, CONV_TTL);
    await ctx.reply(`How many ${d.name}s would you like?`, { reply_markup: quantityKeyboard() });
  }

  // ---------- Conversation: qty -> name -> phone -> confirm ----------

  bot.chatType("private").on("message:text", async (ctx, next) => {
    const key = convKey(ctx.chat.id, ctx.from.id);
    const conv = await store.get<Conv>(key);
    const text = ctx.message.text;
    if (!conv || text.startsWith("/")) return next();

    if (text.trim().toLowerCase() === "cancel") {
      await store.del(key);
      return ctx.reply("Order cancelled. Send /menu to start again.", { reply_markup: { remove_keyboard: true } });
    }

    switch (conv.step) {
      case "qty": {
        const n = Number(text.trim());
        if (!Number.isInteger(n) || n < 1 || n > 9) {
          return ctx.reply("Please pick a quantity from 1 to 9.", { reply_markup: quantityKeyboard() });
        }
        conv.order.qty = n;
        conv.step = "name";
        await store.set(key, conv, CONV_TTL);
        const d = drinkById(conv.order.drinkId)!;
        return ctx.reply(`Got it: ${n} × ${d.name}.\nWhat name should we put on the cup?`, {
          reply_markup: { remove_keyboard: true },
        });
      }
      case "name": {
        if (!validName(text)) return ctx.reply("Please send a real name (letters only, 2–40 characters).");
        conv.order.name = text.trim();
        conv.step = "phone";
        await store.set(key, conv, CONV_TTL);
        return ctx.reply(`Thanks, ${conv.order.name}! What's your phone number? (e.g. +2348012345678)`);
      }
      case "phone": {
        const phone = normalizePhone(text);
        if (!phone) {
          return ctx.reply("That doesn't look like a phone number. Please send digits only, e.g. +2348012345678.");
        }
        conv.order.phone = phone;
        conv.step = "confirm";
        await store.set(key, conv, CONV_TTL);
        return ctx.reply(orderSummary(conv.order, publicUrl), {
          ...HTML,
          link_preview_options: { is_disabled: true },
          reply_markup: new InlineKeyboard().text("✅ Confirm", "order:confirm").text("❌ Cancel", "order:cancel"),
        });
      }
      default:
        return next();
    }
  });

  bot.callbackQuery(/^order:(confirm|cancel)$/, async (ctx) => {
    if (!ctx.chat || !ctx.from) return ctx.answerCallbackQuery();
    const key = convKey(ctx.chat.id, ctx.from.id);
    const conv = await store.get<Conv>(key);
    if (!conv || conv.step !== "confirm") {
      return ctx.answerCallbackQuery({ text: "This order has expired. Send /menu to start again.", show_alert: true });
    }
    if (ctx.match[1] === "cancel") {
      await store.del(key);
      await ctx.editMessageText("Order cancelled. Send /menu to start again.");
      return ctx.answerCallbackQuery({ text: "Order cancelled" });
    }
    conv.order.number = 1000 + Math.floor(Math.random() * 9000);
    conv.step = "checkout";
    await store.set(key, conv, CONV_TTL);
    await ctx.editMessageText(`${orderSummary(conv.order, publicUrl)}\n\n✅ <b>Confirmed</b> — order #${conv.order.number}`, {
      ...HTML,
      link_preview_options: { is_disabled: true },
    });
    await ctx.answerCallbackQuery({ text: "Order confirmed" });
    const d = drinkById(conv.order.drinkId)!;
    await ctx.replyWithPhoto(`${publicUrl}/img/${d.id}.jpg`, {
      ...HTML,
      caption: `Your <b>${esc(d.name)}</b> is on its way ☕ — order #${conv.order.number}`,
    });
    await ctx.reply(`Tap <b>💳 Checkout</b> below to pay ${money(orderTotal(conv.order))}.`, {
      ...HTML,
      reply_markup: new Keyboard().webApp("💳 Checkout", checkoutUrl(publicUrl, conv.order, "kb")).resized(),
    });
  });

  // ---------- Mini App: data sent back via Telegram.WebApp.sendData ----------

  bot.on("message:web_app_data", async (ctx) => {
    let data: { order?: string; total?: number; pickup?: string };
    try {
      data = JSON.parse(ctx.message.web_app_data.data);
    } catch {
      return ctx.reply("⚠️ Checkout sent data I could not read. Please try again.");
    }
    await store.del(convKey(ctx.chat.id, ctx.from!.id));
    await ctx.reply(
      `✅ <b>Payment received</b> for order #${esc(String(data.order ?? "?"))} — ${money(Number(data.total ?? 0))}.\nPickup at <b>${esc(data.pickup ?? "the counter")}</b>.`,
      { ...HTML, reply_markup: { remove_keyboard: true } },
    );
  });

  // ---------- Groups ----------

  bot.chatType(["group", "supergroup"]).command("grouporder", async (ctx) => {
    const g: GroupOrder = { open: true, entries: [] };
    const msg = await ctx.reply(groupOrderText(g), { ...HTML, reply_markup: groupKeyboard() });
    await store.set(goKey(ctx.chat.id, msg.message_id), g, 24 * 3600);
    await store.set(goLatestKey(ctx.chat.id), msg.message_id, 24 * 3600);
  });

  bot.callbackQuery(/^go:([a-z]+)$/, async (ctx) => {
    const msg = ctx.callbackQuery.message;
    const d = drinkById(ctx.match[1]);
    if (!msg || !d) return ctx.answerCallbackQuery();
    const key = goKey(msg.chat.id, msg.message_id);
    const g = await store.get<GroupOrder>(key);
    if (!g || !g.open) return ctx.answerCallbackQuery({ text: "This group order is closed.", show_alert: true });
    const name = displayName(ctx.from);
    const next = addToGroupOrder(g, ctx.from.id, name, d.id);
    await store.set(key, next, 24 * 3600);
    await ctx.editMessageText(groupOrderText(next), { ...HTML, reply_markup: groupKeyboard() });
    await ctx.answerCallbackQuery({ text: `Added ${d.name} for ${name}` });
  });

  bot.chatType(["group", "supergroup"]).command("close", async (ctx) => {
    // An anonymous admin posts as the group itself: from is @GroupAnonymousBot, sender_chat is the group.
    const anonymousAdmin = ctx.msg.sender_chat?.id === ctx.chat.id;
    if (!anonymousAdmin && !(await isAdmin(ctx, ctx.chat.id, ctx.from.id))) {
      return ctx.reply("⛔ Only group admins can close the order.", { reply_parameters: { message_id: ctx.msg.message_id } });
    }
    const msgId = await store.get<number>(goLatestKey(ctx.chat.id));
    const g = msgId ? await store.get<GroupOrder>(goKey(ctx.chat.id, msgId)) : undefined;
    if (!msgId || !g || !g.open) return ctx.reply("There is no open group order. Start one with /grouporder.");
    const closed = { ...g, open: false };
    await store.set(goKey(ctx.chat.id, msgId), closed, 24 * 3600);
    await ctx.api.editMessageText(ctx.chat.id, msgId, groupOrderText(closed), HTML);
    await ctx.reply(`Group order closed by ${esc(displayName(ctx.from))}: ${closed.entries.length} drink(s).`, HTML);
  });

  bot.on("message:new_chat_members", async (ctx) => {
    for (const m of ctx.message.new_chat_members) {
      if (m.id === ctx.me.id) continue; // our own join is handled by my_chat_member
      await ctx.reply(`👋 Welcome, ${esc(displayName(m))}! Send /menu@${ctx.me.username} to see today's drinks.`, HTML);
    }
  });

  bot.on("my_chat_member", async (ctx) => {
    const { old_chat_member: before, new_chat_member: after } = ctx.myChatMember;
    const wasIn = ["member", "administrator", "creator"].includes(before.status);
    const isIn = ["member", "administrator"].includes(after.status);
    if (!wasIn && isIn && ctx.chat.type !== "channel" && ctx.chat.type !== "private") {
      await ctx.reply(`Thanks for adding me! ☕ Try /menu@${ctx.me.username} or /grouporder.`);
    }
    // When removed (left/kicked) we can no longer post; just log it.
    if (wasIn && !isIn) console.log(`removed from chat ${ctx.chat.id} (${after.status})`);
  });

  // Discussion-group comments under a channel post (bot must be admin in the discussion group).
  bot.chatType("supergroup").on("message", async (ctx, next) => {
    const parent = ctx.message.reply_to_message;
    if (parent?.is_automatic_forward && ctx.from && !ctx.from.is_bot) {
      return ctx.reply(`Thanks for the feedback, ${esc(ctx.from.first_name)}! ☕`, {
        ...HTML,
        reply_parameters: { message_id: ctx.message.message_id },
      });
    }
    return next();
  });

  // Mentions and replies to the bot in groups. Plain messages are ignored (privacy mode).
  bot.chatType(["group", "supergroup"]).on("message:text", async (ctx) => {
    const text = ctx.message.text;
    const mentioned = text.toLowerCase().includes(`@${ctx.me.username.toLowerCase()}`);
    const repliedToMe = ctx.message.reply_to_message?.from?.id === ctx.me.id;
    if (!mentioned && !repliedToMe) return;
    await ctx.reply(`You called, ${esc(ctx.from.first_name)}? ☕ Send /menu@${ctx.me.username} to see drinks.`, {
      ...HTML,
      reply_parameters: { message_id: ctx.message.message_id },
    });
  });

  // ---------- Channel: today's special with votes ----------

  bot.chatType("private").command(["special", "special_edit", "special_delete"], async (ctx) => {
    if (!opts.channelId) return ctx.reply("No channel configured (set CHANNEL_ID).");
    if (!(await isAdmin(ctx, opts.channelId, ctx.from.id))) {
      return ctx.reply("⛔ Only admins of the specials channel can do that.");
    }
    const cmd = ctx.message.text.split(/[\s@]/)[0].slice(1);
    const last = await store.get<{ chatId: number; messageId: number; name: string }>(lastSpecialKey);
    if (cmd === "special") {
      const post = await postSpecial(bot, opts, store);
      return ctx.reply(`Posted today's special (${esc(post.name)}) to the channel.`, HTML);
    }
    if (!last) return ctx.reply("I haven't posted a special yet. Send /special first.");
    if (cmd === "special_edit") {
      await ctx.api.editMessageText(last.chatId, last.messageId, `${specialText(last.name, new Date())}\n\n<i>Updated: now 20% off!</i>`, {
        ...HTML,
        reply_markup: voteKeyboard((await store.get<Votes>(votesKey(last.chatId, last.messageId))) ?? { up: [], down: [] }),
      });
      return ctx.reply("Edited the latest special.");
    }
    await ctx.api.deleteMessage(last.chatId, last.messageId);
    await store.del(lastSpecialKey);
    return ctx.reply("Deleted the latest special.");
  });

  bot.callbackQuery(/^v:(up|down)$/, async (ctx) => {
    const msg = ctx.callbackQuery.message;
    if (!msg) return ctx.answerCallbackQuery();
    const key = votesKey(msg.chat.id, msg.message_id);
    const v = vote((await store.get<Votes>(key)) ?? { up: [], down: [] }, ctx.from.id, ctx.match[1] as "up" | "down");
    await store.set(key, v, 7 * 24 * 3600);
    await ctx.editMessageReplyMarkup({ reply_markup: voteKeyboard(v) });
    await ctx.answerCallbackQuery({ text: ctx.match[1] === "up" ? "You voted 👍" : "You voted 👎" });
  });

  // ---------- Inline mode (stretch): @bot latte in any chat ----------

  bot.on("inline_query", async (ctx) => {
    const q = ctx.inlineQuery.query.trim().toLowerCase();
    const results = DRINKS.filter((d) => !q || d.name.toLowerCase().includes(q)).map((d) =>
      InlineQueryResultBuilder.article(`drink-${d.id}`, `${d.emoji} ${d.name} — ${money(d.price)}`, {
        description: d.description,
      }).text(`${d.emoji} <b>${esc(d.name)}</b> — ${money(d.price)}\n${esc(d.description)}`, HTML),
    );
    await ctx.answerInlineQuery(results, { cache_time: 10 });
  });

  // ---------- Stale or unknown buttons ----------

  bot.on("callback_query:data", (ctx) =>
    ctx.answerCallbackQuery({ text: "This button has expired. Send /menu to start again.", show_alert: true }),
  );

  bot.catch((err) => {
    console.error(`update ${err.ctx.update.update_id} failed:`, err.error);
  });

  return bot;
}

export function groupKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  DRINKS.slice(0, 4).forEach((d, i) => {
    kb.text(`${d.emoji} ${d.name}`, `go:${d.id}`);
    if (i % 2 === 1) kb.row();
  });
  return kb;
}

export function voteKeyboard(v: Votes): InlineKeyboard {
  return new InlineKeyboard().text(`👍 ${v.up.length}`, "v:up").text(`👎 ${v.down.length}`, "v:down");
}

export async function postSpecial(bot: Bot, opts: BotOptions, store: Store) {
  const now = new Date();
  const name = specialFor(now);
  const msg = await bot.api.sendMessage(opts.channelId!, specialText(name, now), {
    ...HTML,
    reply_markup: voteKeyboard({ up: [], down: [] }),
  });
  await store.set(lastSpecialKey, { chatId: msg.chat.id, messageId: msg.message_id, name }, 30 * 24 * 3600);
  return { name, messageId: msg.message_id };
}
