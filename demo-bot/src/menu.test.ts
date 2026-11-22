import { test } from "node:test";
import assert from "node:assert/strict";
import { addToGroupOrder, clampPage, esc, groupOrderText, normalizePhone, orderSummary, pageItems, validName, vote } from "./menu.js";
import { verifyInitData } from "./webapp.js";
import { createHmac } from "node:crypto";

test("pagination clamps and slices", () => {
  assert.equal(clampPage(0), 1);
  assert.equal(clampPage(99), 2);
  assert.deepEqual(pageItems(2).map((d) => d.id), ["mocha", "americano", "chai"]);
});

test("phone validation", () => {
  assert.equal(normalizePhone("+234 801 234 5678"), "+2348012345678");
  assert.equal(normalizePhone("abc"), null);
  assert.equal(normalizePhone("12"), null);
});

test("name validation", () => {
  assert.ok(validName("Ada Lovelace"));
  assert.ok(!validName("x"));
  assert.ok(!validName("1234"));
});

test("HTML escaping keeps user text from breaking formatting", () => {
  assert.equal(esc("<b>&"), "&lt;b&gt;&amp;");
  const s = orderSummary({ drinkId: "latte", qty: 2, name: "A<b>", phone: "+1555" }, "https://x");
  assert.ok(s.includes("A&lt;b&gt;"));
  assert.ok(s.includes("$9.00"));
});

test("group order: one drink per person, names listed", () => {
  let g = { open: true, entries: [] as { userId: number; name: string; drinkId: string }[] };
  g = addToGroupOrder(g, 1, "Ada", "latte");
  g = addToGroupOrder(g, 2, "Bo", "mocha");
  g = addToGroupOrder(g, 1, "Ada", "espresso");
  const t = groupOrderText(g);
  assert.ok(t.includes("Ada — Espresso") && t.includes("Bo — Mocha") && t.includes("Total: 2 drinks"));
});

test("votes: switching moves the vote", () => {
  let v = vote({ up: [], down: [] }, 1, "up");
  v = vote(v, 1, "down");
  assert.deepEqual(v, { up: [], down: [1] });
});

test("initData verification", () => {
  const token = "123:abc";
  const fields: Record<string, string> = { auth_date: String(Math.floor(Date.now() / 1000)), user: '{"id":42}', query_id: "q" };
  const dcs = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secret).update(dcs).digest("hex");
  const initData = new URLSearchParams({ ...fields, hash }).toString();
  assert.ok(verifyInitData(initData, token));
  assert.equal(verifyInitData(initData, "123:wrong"), null);
});
