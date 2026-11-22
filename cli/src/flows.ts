import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

export interface Flow {
  path: string; // project-relative
  name: string; // file stem without _test.md
  title: string;
  tags: string[];
}

/** Read `tags:` from frontmatter: YAML list, [a, b] inline list, or "a, b". Mirrors Kane's accepted shapes. */
export function parseTags(src: string): string[] {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
  if (!fm) return [];
  const lines = fm[1].split(/\r?\n/);
  const i = lines.findIndex((l) => /^tags\s*:/.test(l));
  if (i < 0) return [];
  const rest = lines[i].replace(/^tags\s*:\s*/, "").trim();
  let tags: string[] = [];
  if (rest.startsWith("[")) tags = rest.replace(/^\[|\]$/g, "").split(",");
  else if (rest) tags = rest.split(",");
  else {
    for (const l of lines.slice(i + 1)) {
      const m = /^\s*-\s*(.+)$/.exec(l);
      if (!m) break;
      tags.push(m[1]);
    }
  }
  return [...new Set(tags.map((t) => t.trim().replace(/^["']|["']$/g, "").toLowerCase()).filter(Boolean))];
}

export function parseTitle(src: string, fallback: string): string {
  const m = /^#\s+(.+)$/m.exec(src.replace(/^---[\s\S]*?\n---/, ""));
  return m ? m[1].trim() : fallback;
}

function walk(dir: string, out: string[]) {
  for (const e of readdirSync(dir)) {
    if (e.startsWith("output-") || e === "node_modules" || e.startsWith(".")) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith("_test.md")) out.push(p);
  }
}

export function discoverFlows(flowsDir: string, cwd = process.cwd()): Flow[] {
  const files: string[] = [];
  walk(join(cwd, flowsDir), files);
  return files.sort().map((f) => {
    const src = readFileSync(f, "utf8");
    const name = basename(f).replace(/_test\.md$/, "");
    return { path: relative(cwd, f), name, title: parseTitle(src, name), tags: parseTags(src) };
  });
}

/** Select by flow name/path and/or tags (ANY match, like `kane-cli testrun --tags`). No selector = all. */
export function selectFlows(all: Flow[], names: string[], tags: string[]): Flow[] {
  const want = tags.map((t) => t.toLowerCase());
  return all.filter((f) => {
    const byName = names.length === 0 || names.some((n) => f.name === n || f.path === n || f.path.endsWith(n));
    const byTag = want.length === 0 || f.tags.some((t) => want.includes(t));
    return byName && byTag;
  });
}
