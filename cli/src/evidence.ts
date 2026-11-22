// Minimal reader for Kane evidence packs. A pack is a standard zip
// (kane-cli docs/user-guide/evidence.md, "Inside the pack"); we only need to list
// entries and pull out the failing step's failure.yaml and screenshot for the agent.
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  localHeaderOffset: number;
}

export function listZip(buf: Buffer): ZipEntry[] {
  // End of central directory record: signature 0x06054b50, search backwards (comment up to 64 KiB).
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip file (no end-of-central-directory record)");
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error("corrupt central directory");
    const method = buf.readUInt16LE(off + 10);
    const compressedSize = buf.readUInt32LE(off + 20);
    const size = buf.readUInt32LE(off + 24);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localHeaderOffset = buf.readUInt32LE(off + 42);
    const name = buf.toString("utf8", off + 46, off + 46 + nameLen);
    entries.push({ name, method, compressedSize, size, localHeaderOffset });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export function readZipEntry(buf: Buffer, e: ZipEntry): Buffer {
  const o = e.localHeaderOffset;
  if (buf.readUInt32LE(o) !== 0x04034b50) throw new Error(`bad local header for ${e.name}`);
  const start = o + 30 + buf.readUInt16LE(o + 26) + buf.readUInt16LE(o + 28);
  const data = buf.subarray(start, start + e.compressedSize);
  if (e.method === 0) return Buffer.from(data);
  if (e.method === 8) return inflateRawSync(data);
  throw new Error(`unsupported zip method ${e.method} for ${e.name}`);
}

export interface FailureDetail {
  failureYaml?: string;
  stepDir?: string;
  screenshot?: Buffer;
  annotated?: Buffer;
}

/** Find the first failed step in a pack: tests/<id>/steps/<ordinal>-<step>/failure.yaml (+ screenshot.png / annotated.png). */
export function extractFailure(packPath: string): FailureDetail {
  const buf = readFileSync(packPath);
  const entries = listZip(buf);
  const fail = entries.filter((e) => /\/steps\/[^/]+\/failure\.yaml$/.test(e.name)).sort((a, b) => a.name.localeCompare(b.name))[0];
  const runFailure = entries.find((e) => e.name === "failure.yaml");
  if (!fail) return { failureYaml: runFailure ? readZipEntry(buf, runFailure).toString("utf8") : undefined };
  const stepDir = fail.name.replace(/failure\.yaml$/, "");
  const get = (n: string) => {
    const e = entries.find((x) => x.name === stepDir + n);
    return e ? readZipEntry(buf, e) : undefined;
  };
  return { failureYaml: readZipEntry(buf, fail).toString("utf8"), stepDir, screenshot: get("screenshot.png"), annotated: get("annotated.png") };
}
