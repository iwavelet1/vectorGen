#!/usr/bin/env node
/**
 * Generate classified-manifest.json from a directory of classified *.jsonl files.
 * Usage: node gen-classified-manifest.js [CLASSIFIED_DIR]
 *   CLASSIFIED_DIR defaults to same dir as this script (.). Writes manifest to classified-manifest.json in cwd.
 */
const fs = require("fs");
const path = require("path");

const dir = path.resolve(process.argv[2] || __dirname);
const assets = new Set();
const dates = new Set();
const tfSet = new Set();

try {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  for (const f of files) {
    const stem = f.slice(0, -6);
    const parts = stem.split("_");
    if (parts.length === 5) {
      assets.add(parts[0]);
      dates.add(parts[1]);
      tfSet.add(parts[2]);
    } else if (parts.length === 4) {
      assets.add(parts[0]);
      dates.add(parts[1]);
      tfSet.add("D");
    }
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const manifest = {
  assets: [...assets].sort(),
  dates: [...dates].sort(),
  tf: [...tfSet].sort(),
};

const outPath = path.join(dir, "classified-manifest.json");
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), "utf8");
console.log("Wrote", outPath);
