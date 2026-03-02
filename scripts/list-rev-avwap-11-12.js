#!/usr/bin/env node
/**
 * List REV_avwap from raw_vectors for bars between 11:00 and 12:00.
 * Usage: node list-rev-avwap-11-12.js [DATA_BASE]
 *   DATA_BASE = data root (default: process.env.DATA_BASE || process.env.FIN_DATA || ~/Fin/Data).
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

function resolveDir(p) {
  if (!p) return null;
  const expanded = (p.startsWith("~") ? path.join(os.homedir(), p.slice(1).replace(/^\//, "")) : p);
  return path.resolve(expanded);
}

const DATA_BASE = resolveDir(process.env.DATA_BASE || process.env.FIN_DATA) || path.join(os.homedir(), "Fin", "Data");

function getRawDirs() {
  const out = [];
  if (process.env.RAW_VECTORS_DIR) out.push(resolveDir(process.env.RAW_VECTORS_DIR));
  out.push(path.join(DATA_BASE, "raw_vectors"));
  return out.filter(Boolean);
}

function parseTimeToMin(t) {
  if (t == null || typeof t !== "string") return null;
  const s = t.trim();
  const full = s.match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{1,2}):(\d{2})/);
  if (full) return parseInt(full[4], 10) * 60 + parseInt(full[5], 10);
  const hm = s.match(/^(\d{1,2}):(\d{2})/);
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);
  return null;
}

function parseJsonlLine(line) {
  try {
    const normalized = (line && typeof line === "string" ? line : "").replace(/\bNaN\b/g, "null");
    return JSON.parse(normalized);
  } catch {
    return null;
  }
}

const START_MIN = 11 * 60;   // 660 = 11:00
const END_MIN   = 12 * 60;   // 720 = 12:00 (exclusive)

const dirs = getRawDirs();
const seen = new Set();

for (const dir of dirs) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  for (const f of files.sort()) {
    const fp = path.join(dir, f);
    if (seen.has(fp)) continue;
    seen.add(fp);
    const content = fs.readFileSync(fp, "utf8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    for (let i = 0; i < lines.length; i++) {
      const rec = parseJsonlLine(lines[i]);
      if (!rec || typeof rec !== "object") continue;
      const t = rec.time || rec.Time;
      const min = parseTimeToMin(t);
      if (min == null || min < START_MIN || min >= END_MIN) continue;
      const rev = rec.REV_avwap != null ? Number(rec.REV_avwap) : NaN;
      const revStr = Number.isFinite(rev) ? String(rev) : "NaN";
      const timeStr = t != null ? String(t) : "—";
      console.log(f + "\t" + timeStr + "\t" + revStr);
    }
  }
}
