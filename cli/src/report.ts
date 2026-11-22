import type { FlowResult } from "./kane.js";

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code: string, s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
export const green = (s: string) => c("32", s);
export const red = (s: string) => c("31", s);
export const yellow = (s: string) => c("33", s);
export const dim = (s: string) => c("2", s);
export const bold = (s: string) => c("1", s);

export function icon(status: FlowResult["status"]): string {
  return status === "passed" ? green("✔ PASS") : status === "failed" ? red("✘ FAIL") : yellow(`! ${status.toUpperCase()}`);
}

export function printResult(r: FlowResult) {
  const meta = [r.durationS != null ? `${Math.round(r.durationS)}s` : "", r.credits != null ? `${r.credits} credits` : ""].filter(Boolean).join(", ");
  console.log(`${icon(r.status)}  ${r.flow}${meta ? dim(`  (${meta})`) : ""}`);
  if (r.failure) {
    console.log(`        step ${r.failure.stepIndex} "${r.failure.heading}"`);
    console.log(`        Kane: ${r.failure.remark}`);
  }
  if (r.errorMessage && r.status !== "passed") console.log(`        ${r.errorMessage}`);
  if (r.evidencePath) console.log(dim(`        evidence: kane-cli evidence serve ${r.evidencePath}`));
  if (r.shareUrl) console.log(dim(`        share: ${r.shareUrl}`));
}

export function printSummary(results: FlowResult[]) {
  const passed = results.filter((r) => r.status === "passed").length;
  const credits = results.reduce((n, r) => n + (r.credits ?? 0), 0);
  const secs = results.reduce((n, r) => n + (r.durationS ?? 0), 0);
  const line = `${passed}/${results.length} flows passed · ${Math.round(secs)}s${credits ? ` · ${credits} credits` : ""}`;
  console.log("");
  console.log(passed === results.length ? green(bold(line)) : red(bold(line)));
}

export function resultsMarkdown(results: FlowResult[]): string {
  const rows = results.map((r) => {
    const why = r.failure ? `step ${r.failure.stepIndex} "${r.failure.heading}": ${r.failure.remark}` : r.errorMessage ?? "";
    return `| ${r.flow} | ${r.status} | ${r.durationS != null ? Math.round(r.durationS) + "s" : "–"} | ${r.credits ?? "–"} | ${r.evidencePath ? "`" + r.evidencePath + "`" : "–"} | ${why.replace(/\|/g, "\\|").replace(/\n/g, " ")} |`;
  });
  return ["| Flow | Result | Time | Credits | Evidence pack | Failure |", "|---|---|---|---|---|---|", ...rows].join("\n");
}
