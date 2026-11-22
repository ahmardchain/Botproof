// Unit tests. The NDJSON below is a hand-written fixture following the documented
// testmd stream contract, used only to test the parser. It is not a Kane result.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";
import { checkEdit, globToRegExp } from "./guard.js";
import { parseTags, selectFlows } from "./flows.js";
import { evidenceFromStderr, parseNdjson, summarize } from "./kane.js";
import { extractFailure } from "./evidence.js";

test("globs", () => {
  assert.ok(globToRegExp("demo-bot/src/**").test("demo-bot/src/bot.ts"));
  assert.ok(globToRegExp("demo-bot/src/**").test("demo-bot/src/a/b.ts"));
  assert.ok(globToRegExp("**/*_test.md").test("botproof/flows/start_test.md"));
  assert.ok(globToRegExp("**/*_test.md").test("start_test.md"));
  assert.ok(!globToRegExp("demo-bot/src/*").test("demo-bot/src/a/b.ts"));
});

test("allowlist: bot code yes, flows and BotProof no, outside repo no", () => {
  const ed = ["demo-bot/src/**", "demo-bot/api/**"];
  const root = "/repo";
  assert.equal(checkEdit("/repo/demo-bot/src/bot.ts", ed, root).allowed, true);
  assert.equal(checkEdit("demo-bot/src/bot.ts", ed, root).allowed, true);
  assert.equal(checkEdit("/repo/botproof/flows/start_test.md", ed, root).allowed, false);
  assert.equal(checkEdit("/repo/demo-bot/src/menu_test.md", ed, root).allowed, false);
  assert.equal(checkEdit("/repo/cli/src/fix.ts", ed, root).allowed, false);
  assert.equal(checkEdit("/repo/README.md", ed, root).allowed, false);
  assert.equal(checkEdit("/etc/passwd", ed, root).allowed, false);
});

test("tags in all three frontmatter shapes", () => {
  assert.deepEqual(parseTags("---\ntags: [Smoke, keyboard]\n---\n"), ["smoke", "keyboard"]);
  assert.deepEqual(parseTags("---\ntags: smoke, miniapp\n---\n"), ["smoke", "miniapp"]);
  assert.deepEqual(parseTags("---\nmode: testing\ntags:\n  - group\n  - smoke\nurl: x\n---\n"), ["group", "smoke"]);
  assert.deepEqual(parseTags("# no frontmatter"), []);
});

test("flow selection by name and tag", () => {
  const flows = [
    { path: "f/start_test.md", name: "start", title: "", tags: ["smoke"] },
    { path: "f/menu_test.md", name: "menu", title: "", tags: ["keyboard"] },
  ];
  assert.equal(selectFlows(flows, [], ["smoke"]).length, 1);
  assert.equal(selectFlows(flows, ["menu"], []).length, 1);
  assert.equal(selectFlows(flows, [], []).length, 2);
});

test("summarize a failed saved-test stream", () => {
  const stream = [
    { type: "stream_start", surface: "testmd" },
    { type: "test_md_step_start", step_index: 1, heading: "Open the bot chat" },
    { type: "run_end", status: "passed", credits: 2 },
    { type: "test_md_step_end", step_index: 1, status: "passed", duration_s: 9 },
    { type: "test_md_step_start", step_index: 2, heading: "Tap Next" },
    { step: 1, status: "failed", remark: "Message text did not change after tapping Next" },
    { type: "run_end", status: "failed", reason: "Assertion failed: menu still shows page 1/2", credits: 3 },
    { type: "test_md_step_end", step_index: 2, status: "failed", duration_s: 14 },
    { type: "test_md_done", overall_status: "failed", duration_s: 23, session_id: "s1" },
  ]
    .map((e) => JSON.stringify(e))
    .join("\n");
  const r = summarize("f/menu_test.md", parseNdjson(stream + "\nnot json\n"), 1, "evidence: view locally with `kane-cli evidence serve /tmp/x.evidence`\n");
  assert.equal(r.status, "failed");
  assert.equal(r.credits, 5);
  assert.equal(r.durationS, 23);
  assert.deepEqual(r.failure, { stepIndex: 2, heading: "Tap Next", remark: "Assertion failed: menu still shows page 1/2" });
  assert.equal(r.evidencePath, "/tmp/x.evidence");
});

test("exit code wins over stream", () => {
  assert.equal(summarize("x", [], 2).status, "error");
  assert.equal(summarize("x", [], 3).status, "cancelled");
  assert.equal(evidenceFromStderr("nothing"), undefined);
});

function makeZip(files: Record<string, Buffer>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let off = 0;
  for (const [name, data] of Object.entries(files)) {
    const comp = deflateRawSync(data);
    const n = Buffer.from(name);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(n.length, 28);
    ch.writeUInt32LE(off, 42);
    locals.push(lh, n, comp);
    centrals.push(ch, n);
    off += 30 + n.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(files).length, 8);
  eocd.writeUInt16LE(Object.keys(files).length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

test("extract failure.yaml and screenshot from a pack", () => {
  const dir = mkdtempSync(join(tmpdir(), "bp-"));
  const p = join(dir, "x.evidence");
  writeFileSync(
    p,
    makeZip({
      "run.yaml": Buffer.from("status: failed"),
      "tests/t1/steps/001-a/step.json": Buffer.from("{}"),
      "tests/t1/steps/002-b/failure.yaml": Buffer.from("error: menu did not change"),
      "tests/t1/steps/002-b/screenshot.png": Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    }),
  );
  const f = extractFailure(p);
  assert.equal(f.failureYaml, "error: menu did not change");
  assert.equal(f.stepDir, "tests/t1/steps/002-b/");
  assert.deepEqual([...f.screenshot!], [0x89, 0x50, 0x4e, 0x47]);
});
