// Pure data + formatting helpers. No Telegram calls here, so they can be unit tested.

export interface Drink {
  id: string;
  name: string;
  emoji: string;
  price: number; // USD
  description: string;
  wiki: string;
}

export const DRINKS: Drink[] = [
  { id: "latte", name: "Latte", emoji: "🥛", price: 4.5, description: "Espresso with steamed milk and a thin layer of foam.", wiki: "https://en.wikipedia.org/wiki/Latte" },
  { id: "espresso", name: "Espresso", emoji: "☕", price: 3.0, description: "A short, strong shot of coffee.", wiki: "https://en.wikipedia.org/wiki/Espresso" },
  { id: "cappuccino", name: "Cappuccino", emoji: "☁️", price: 4.0, description: "Equal parts espresso, steamed milk and milk foam.", wiki: "https://en.wikipedia.org/wiki/Cappuccino" },
  { id: "mocha", name: "Mocha", emoji: "🍫", price: 4.75, description: "A latte with chocolate.", wiki: "https://en.wikipedia.org/wiki/Caff%C3%A8_mocha" },
  { id: "americano", name: "Americano", emoji: "💧", price: 3.25, description: "Espresso topped up with hot water.", wiki: "https://en.wikipedia.org/wiki/Caff%C3%A8_Americano" },
  { id: "chai", name: "Chai Latte", emoji: "🫖", price: 4.25, description: "Spiced black tea with steamed milk.", wiki: "https://en.wikipedia.org/wiki/Masala_chai" },
];

export const PAGE_SIZE = 3;
export const PAGE_COUNT = Math.ceil(DRINKS.length / PAGE_SIZE);

export function drinkById(id: string): Drink | undefined {
  return DRINKS.find((d) => d.id === id);
}

export function pageItems(page: number): Drink[] {
  const p = clampPage(page);
  return DRINKS.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
}

export function clampPage(page: number): number {
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(1, Math.trunc(page)), PAGE_COUNT);
}

export function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

/** Escape text for Telegram HTML parse mode. */
export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function menuText(page: number): string {
  return `<b>☕ Brew Bot menu</b> — page ${clampPage(page)}/${PAGE_COUNT}\nTap a drink to see details.`;
}

export function drinkText(d: Drink): string {
  return [
    `<b>${d.emoji} ${esc(d.name)}</b> — ${money(d.price)}`,
    esc(d.description),
    `<a href="${d.wiki}">Read about ${esc(d.name)}</a>`,
  ].join("\n");
}

// --- Conversation validation ---

export function validName(s: string): boolean {
  const t = s.trim();
  return t.length >= 2 && t.length <= 40 && /^[\p{L}][\p{L} .'-]*$/u.test(t);
}

/** Accepts +2348012345678, 08012345678, +1 555 123 4567 etc. Returns normalized digits with optional + or null. */
export function normalizePhone(s: string): string | null {
  const t = s.trim().replace(/[\s()-]/g, "");
  if (!/^\+?\d{7,15}$/.test(t)) return null;
  return t;
}

export interface Order {
  drinkId: string;
  qty: number;
  name?: string;
  phone?: string;
  number?: number;
}

export function orderTotal(o: Order): number {
  const d = drinkById(o.drinkId);
  return d ? d.price * o.qty : 0;
}

export function orderSummary(o: Order, shopUrl: string): string {
  const d = drinkById(o.drinkId)!;
  return [
    `<b>🧾 Order summary</b>`,
    `${o.qty} × ${esc(d.name)} — <b>${money(orderTotal(o))}</b>`,
    `Name: <b>${esc(o.name ?? "")}</b>`,
    `Phone: <code>${esc(o.phone ?? "")}</code>`,
    `Pickup at <a href="${shopUrl}">Brew Bot Café</a>`,
  ].join("\n");
}

// --- Group order ---

export interface GroupOrder {
  open: boolean;
  entries: { userId: number; name: string; drinkId: string }[];
}

export function groupOrderText(g: GroupOrder): string {
  const head = g.open ? "<b>🧾 Group order</b> (open)" : "<b>🧾 Group order</b> (closed)";
  if (g.entries.length === 0) return `${head}\nNo drinks yet. Tap a drink to add yours.`;
  const lines = g.entries.map((e) => `• ${esc(e.name)} — ${esc(drinkById(e.drinkId)?.name ?? e.drinkId)}`);
  return `${head}\n${lines.join("\n")}\nTotal: ${g.entries.length} drink${g.entries.length === 1 ? "" : "s"}`;
}

/** One drink per person: tapping again replaces your drink. */
export function addToGroupOrder(g: GroupOrder, userId: number, name: string, drinkId: string): GroupOrder {
  const entries = g.entries.filter((e) => e.userId !== userId);
  entries.push({ userId, name, drinkId });
  return { ...g, entries };
}

// --- Channel votes ---

export interface Votes {
  up: number[];
  down: number[];
}

export function vote(v: Votes, userId: number, dir: "up" | "down"): Votes {
  const up = v.up.filter((u) => u !== userId);
  const down = v.down.filter((u) => u !== userId);
  (dir === "up" ? up : down).push(userId);
  return { up, down };
}

export const SPECIALS = [
  "Maple Cinnamon Latte",
  "Iced Honey Oat Cappuccino",
  "Dark Chocolate Mocha",
  "Cardamom Chai Latte",
  "Orange Espresso Tonic",
  "Vanilla Bean Americano",
  "Hazelnut Flat White",
];

export function specialFor(date: Date): string {
  return SPECIALS[date.getUTCDay() % SPECIALS.length];
}

export function specialText(name: string, date: Date): string {
  const day = date.toISOString().slice(0, 10);
  return `<b>☕ Today's special</b> (${day})\n<i>${esc(name)}</i>\n\nVote below 👇`;
}
