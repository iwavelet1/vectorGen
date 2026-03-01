#!/usr/bin/env node
/**
 * Serve UI and /api/classified-meta, /api/raw/alerts, /api/raw/trades.
 * Usage: node server.js [PORT]
 *   DATA_BASE or FIN_DATA = data root for all UI (alerts, trades, classified, etc.). Default: ~/Fin/Data.
 *   PORT from env or first arg (default 8000).
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const os = require("os");

const port = Number(process.env.PORT || process.argv[2] || 8000);
const uiDir = path.resolve(__dirname);

function resolveDir(p) {
  if (!p) return null;
  const expanded = (p.startsWith("~") ? path.join(os.homedir(), p.slice(1).replace(/^\//, "")) : p);
  return path.resolve(expanded);
}

// Global data base for all UI: alerts, trades, classified, raw_vectors. One env to rule them all.
const DATA_BASE = resolveDir(process.env.DATA_BASE || process.env.FIN_DATA) || path.join(os.homedir(), "Fin", "Data");

const classifiedDirRaw = process.env.CLASSIFIED_DIR ? resolveDir(process.env.CLASSIFIED_DIR) : null;
const classifiedDir = classifiedDirRaw || (function () {
  const lower = path.join(DATA_BASE, "classified");
  const upper = path.join(DATA_BASE, "Classified");
  if (fs.existsSync(lower)) return lower;
  if (fs.existsSync(upper)) return upper;
  return lower;
})();

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    return lines.length;
  } catch {
    return 0;
  }
}

function sortAndStrip(files) {
  files.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
  return files.map(({ name, count }) => ({ name, count }));
}

function getDirsForKind(kind) {
  const base = DATA_BASE;
  const out = [];
  if (kind === "classified") return [classifiedDir];
  if (kind === "raw_vectors") {
    if (process.env.RAW_VECTORS_DIR) out.push(resolveDir(process.env.RAW_VECTORS_DIR));
    out.push(path.join(base, "raw_vectors"));
    return out;
  }
  if (kind === "alerts") {
    if (process.env.ALERTS_DIR) out.push(resolveDir(process.env.ALERTS_DIR));
    out.push(path.join(base, "Alerts"), path.join(base, "alerts"), base);
    if (process.env.ALERTS_FILE) out.unshift(path.dirname(resolveDir(process.env.ALERTS_FILE)));
    return out;
  }
  if (kind === "trades") {
    if (process.env.TRADES_DIR) out.push(resolveDir(process.env.TRADES_DIR));
    out.push(path.join(base, "Trades"), path.join(base, "trades"), base);
    if (process.env.TRADES_FILE) out.unshift(path.dirname(resolveDir(process.env.TRADES_FILE)));
    return out;
  }
  return [];
}

function listRawFilesInDir(dirPath) {
  const result = [];
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return result;
  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".jsonl") || f.endsWith(".json"));
  for (const f of files) {
    const fp = path.join(dirPath, f);
    if (fs.statSync(fp).isFile()) {
      const stat = fs.statSync(fp);
      result.push({ name: f, count: countLines(fp), mtime: stat.mtimeMs });
    }
  }
  result.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
  return result;
}

function listRawFiles(kind) {
  const result = [];
  const base = DATA_BASE;
  const alertsDirEnv = process.env.ALERTS_DIR && resolveDir(process.env.ALERTS_DIR);
  const alertsFileEnv = process.env.ALERTS_FILE && resolveDir(process.env.ALERTS_FILE);
  const tradesDirEnv = process.env.TRADES_DIR && resolveDir(process.env.TRADES_DIR);
  const tradesFileEnv = process.env.TRADES_FILE && resolveDir(process.env.TRADES_FILE);

  if (kind === "alerts") {
    if (alertsFileEnv && fs.existsSync(alertsFileEnv) && fs.statSync(alertsFileEnv).isFile()) {
      const stat = fs.statSync(alertsFileEnv);
      result.push({ name: path.basename(alertsFileEnv), count: countLines(alertsFileEnv), mtime: stat.mtimeMs });
      result.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
      return result.map(({ name, count }) => ({ name, count }));
    }
    if (alertsDirEnv) {
      result.push(...listRawFilesInDir(alertsDirEnv));
      if (result.length) return sortAndStrip(result);
    }
    for (const dirName of ["Alerts", "alerts"]) {
      const dir = path.join(base, dirName);
      result.push(...listRawFilesInDir(dir));
      if (result.length) return sortAndStrip(result);
    }
    for (const fileName of ["alerts.jsonl", "Alerts.jsonl"]) {
      const fp = path.join(base, fileName);
      if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
        const stat = fs.statSync(fp);
        result.push({ name: fileName, count: countLines(fp), mtime: stat.mtimeMs });
        return sortAndStrip(result);
      }
    }
    result.push(...listRawFilesInDir(base));
  } else if (kind === "trades") {
    if (tradesFileEnv && fs.existsSync(tradesFileEnv) && fs.statSync(tradesFileEnv).isFile()) {
      const stat = fs.statSync(tradesFileEnv);
      result.push({ name: path.basename(tradesFileEnv), count: countLines(tradesFileEnv), mtime: stat.mtimeMs });
      return sortAndStrip(result);
    }
    if (tradesDirEnv) {
      result.push(...listRawFilesInDir(tradesDirEnv));
      if (result.length) return sortAndStrip(result);
    }
    for (const dirName of ["Trades", "trades"]) {
      const dir = path.join(base, dirName);
      result.push(...listRawFilesInDir(dir));
      if (result.length) return sortAndStrip(result);
    }
    for (const fileName of ["trades.jsonl", "Trades.jsonl"]) {
      const fp = path.join(base, fileName);
      if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
        const stat = fs.statSync(fp);
        result.push({ name: fileName, count: countLines(fp), mtime: stat.mtimeMs });
        return sortAndStrip(result);
      }
    }
    result.push(...listRawFilesInDir(base));
  } else if (kind === "raw_vectors") {
    const rawDir = process.env.RAW_VECTORS_DIR ? resolveDir(process.env.RAW_VECTORS_DIR) : null;
    const dir = rawDir || path.join(base, "raw_vectors");
    result.push(...listRawFilesInDir(dir));
  } else if (kind === "classified") {
    result.push(...listRawFilesInDir(classifiedDir));
  }
  return sortAndStrip(result);
}

function extractClassifiedMeta(dir) {
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
    console.warn("extractClassifiedMeta:", e.message);
  }
  return {
    assets: [...assets].sort(),
    dates: [...dates].sort(),
    tf: [...tfSet].sort(),
  };
}

// Session 08:30–17:30 in minutes from midnight
const SESSION_START_MIN = 8 * 60 + 30;  // 510
const SESSION_END_MIN = 17 * 60 + 30;   // 1050
const SESSION_LEN_MIN = SESSION_END_MIN - SESSION_START_MIN;  // 540

function tfToMinutes(tf) {
  if (tf === "D" || tf === "d") return SESSION_LEN_MIN;
  const n = parseInt(tf, 10);
  return isNaN(n) ? 5 : n;
}

function parseStartTimeToMin(startTimeStr) {
  if (!startTimeStr || typeof startTimeStr !== "string") return null;
  const s = startTimeStr.trim().slice(0, 19);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{1,2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[4], 10);
  const min = parseInt(m[5], 10);
  return h * 60 + min;
}

function hmToMin(hm) {
  if (!hm || typeof hm !== "string" || hm.length < 3) return null;
  const h = parseInt(hm.slice(0, 2), 10);
  const m = parseInt(hm.slice(2, 4), 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function findAlertFilePath(asset, date, tf) {
  const stems = [];
  if (tf && tf !== "D" && tf !== "d") stems.push(`${asset}_${date}_${tf}`);
  stems.push(`${asset}_${date}`);
  const dirs = getDirsForKind("alerts");
  for (const dir of dirs) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
    const names = fs.readdirSync(dir);
    for (const name of names) {
      if (name.startsWith(".")) continue;
      const base = path.basename(name, path.extname(name));
      for (const stem of stems) {
        if (base === stem || base.startsWith(stem + "_")) {
          const fp = path.join(dir, name);
          if (fs.statSync(fp).isFile()) return fp;
        }
      }
    }
  }
  return null;
}

function getAlertsBars(asset, date, tf, startHm, endHm) {
  const bars = [];
  if (!asset || !date) return { bars, file: null, error: "asset and date required" };
  const fp = findAlertFilePath(asset, date, tf);
  if (!fp) return { bars, file: null, error: "no alert file for " + asset + " / " + date + (tf ? " / " + tf : "") };
  let content;
  try {
    content = fs.readFileSync(fp, "utf8");
  } catch (e) {
    return { bars, file: path.basename(fp), error: e.message };
  }
  const startMin = startHm ? hmToMin(startHm) : null;
  const endMin = endHm ? hmToMin(endHm) : null;
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  for (const line of lines) {
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    const t = rec.time || rec.Time;
    const barMin = t ? parseStartTimeToMin(t) : null;
    if (barMin != null && startMin != null && barMin < startMin) continue;
    if (barMin != null && endMin != null && barMin > endMin) continue;
    bars.push(rec);
  }
  return { bars, file: path.basename(fp) };
}

function getRawVectorBars(asset, date, tf) {
  const bars = [];
  const dirs = getDirsForKind("raw_vectors");
  if (!asset || !date || !tf || !dirs.length) return bars;
  const prefix = asset + "_" + date + "_" + tf + "_";
  for (const dir of dirs) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
    const names = fs.readdirSync(dir).filter((f) => (f.endsWith(".json") || f.endsWith(".jsonl")) && f.startsWith(prefix));
    for (const name of names.sort()) {
      const fp = path.join(dir, name);
      if (!fs.statSync(fp).isFile()) continue;
      let content;
      try {
        content = fs.readFileSync(fp, "utf8");
      } catch {
        continue;
      }
      const lines = content.split("\n").filter((line) => line.trim().length > 0);
      for (const line of lines) {
        let rec;
        try {
          rec = JSON.parse(line);
        } catch {
          continue;
        }
        bars.push(rec);
      }
    }
  }
  return bars;
}

function getClassifiedRecords(asset, date, tf, startHm, endHm) {
  const records = [];
  if (!asset || !date || !tf) return { records, files: [] };
  let files = [];
  try {
    const all = fs.readdirSync(classifiedDir).filter((f) => f.endsWith(".jsonl"));
    const prefix = asset + "_" + date + "_" + tf + "_";
    files = all.filter((f) => f.startsWith(prefix)).sort();
  } catch {
    return { records, files: [] };
  }
  for (const f of files) {
    const fp = path.join(classifiedDir, f);
    if (!fs.statSync(fp).isFile()) continue;
    let content;
    try {
      content = fs.readFileSync(fp, "utf8");
    } catch {
      continue;
    }
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    for (const line of lines) {
      try {
        records.push(JSON.parse(line));
      } catch {}
    }
  }
  return { records, files };
}

function getPlotVectors(asset, date, tf) {
  const segments = [];
  if (!asset || !date || !tf) return { segments, barsInDay: 0, sessionStartMin: SESSION_START_MIN, sessionEndMin: SESSION_END_MIN };
  let files = [];
  try {
    const all = fs.readdirSync(classifiedDir).filter((f) => f.endsWith(".jsonl"));
    if (tf === "D" || tf === "d") {
      files = all.filter((f) => {
        const stem = f.replace(/\.jsonl$/, "");
        const parts = stem.split("_");
        return parts.length === 4 && parts[0] === asset && parts[1] === date;
      });
    } else {
      const prefix = asset + "_" + date + "_" + tf + "_";
      files = all.filter((f) => f.startsWith(prefix));
    }
  } catch {
    return { segments, barsInDay: 0, sessionStartMin: SESSION_START_MIN, sessionEndMin: SESSION_END_MIN };
  }
  const tfMin = tfToMinutes(tf);
  const barsInDay = Math.floor(SESSION_LEN_MIN / tfMin);
  for (const f of files.sort()) {
    const fp = path.join(classifiedDir, f);
    if (!fs.statSync(fp).isFile()) continue;
    const content = fs.readFileSync(fp, "utf8");
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length === 0) continue;
    const lastRec = JSON.parse(lines[lines.length - 1]);
    const startTime = lastRec.start_time;
    const durationMin = lastRec.duration_min;
    const p0 = lastRec.p0_close;
    const p1 = lastRec.p1_close;
    const startMin = parseStartTimeToMin(startTime);
    if (startMin == null || typeof durationMin !== "number" || !Number.isFinite(p0) || !Number.isFinite(p1)) continue;
    const endMin = startMin + durationMin;
    const tier = lastRec.tier != null ? lastRec.tier : "";
    segments.push({
      segment_id: lastRec.segment_id || f.replace(/\.jsonl$/, ""),
      start_min: startMin,
      end_min: endMin,
      start_hm: String(Math.floor(startMin / 60)).padStart(2, "0") + ":" + String(startMin % 60).padStart(2, "0"),
      end_hm: String(Math.floor(endMin / 60)).padStart(2, "0") + ":" + String(endMin % 60).padStart(2, "0"),
      close_first: p0,
      close_last: p1,
      tier: tier,
    });
  }
  segments.sort((a, b) => a.start_min - b.start_min);

  const rev_avwap_series = [];
  const alertRes = getAlertsBars(asset, date, tf, null, null);
  if (alertRes.bars && alertRes.bars.length > 0) {
    for (const b of alertRes.bars) {
      const t = b.time || b.Time;
      const barMin = t ? parseStartTimeToMin(t) : null;
      const v = b.REV_avwap;
      if (barMin != null && v != null && Number.isFinite(Number(v))) {
        rev_avwap_series.push({ min: barMin, value: Number(v) });
      }
    }
    rev_avwap_series.sort((a, b) => a.min - b.min);
  }

  const htf_vwap_series = [];
  const atrnow_upper_series = [];
  const atrnow_lower_series = [];
  const rawBars = getRawVectorBars(asset, date, tf);
  for (const b of rawBars) {
    const t = b.time || b.Time;
    const barMin = t ? parseStartTimeToMin(t) : null;
    if (barMin == null) continue;
    const htf = b.htfVwap != null ? Number(b.htfVwap) : NaN;
    const atr = b.atrNow != null ? Number(b.atrNow) : (b.atrnow != null ? Number(b.atrnow) : NaN);
    if (Number.isFinite(htf)) {
      htf_vwap_series.push({ min: barMin, value: htf });
      if (Number.isFinite(atr)) {
        atrnow_upper_series.push({ min: barMin, value: htf + atr });
        atrnow_lower_series.push({ min: barMin, value: htf - atr });
      }
    }
  }
  htf_vwap_series.sort((a, b) => a.min - b.min);
  atrnow_upper_series.sort((a, b) => a.min - b.min);
  atrnow_lower_series.sort((a, b) => a.min - b.min);

  return {
    segments,
    barsInDay,
    sessionStartMin: SESSION_START_MIN,
    sessionEndMin: SESSION_END_MIN,
    rev_avwap_series,
    htf_vwap_series,
    atrnow_upper_series,
    atrnow_lower_series,
  };
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath);
  const types = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".ico": "image/x-icon",
  };
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader("Content-Type", types[ext] || "application/octet-stream");
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const base = "http://" + (req.headers.host || "localhost");
  const url = new URL(req.url || "/", base);
  if (req.method === "GET" && url.pathname === "/api/classified-meta") {
    const meta = extractClassifiedMeta(classifiedDir);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(meta));
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/raw/file") {
    const kind = url.searchParams.get("kind");
    const name = url.searchParams.get("name");
    if (!kind || !name || !["alerts", "trades", "raw_vectors", "classified"].includes(kind)) {
      res.writeHead(400);
      res.end();
      return;
    }
    const baseName = path.basename(name);
    if (baseName !== name || baseName.includes("..")) {
      res.writeHead(400);
      res.end();
      return;
    }
    const dirs = getDirsForKind(kind);
    let filePath = null;
    for (const dir of dirs) {
      const resolvedDir = path.resolve(dir);
      if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) continue;
      const fp = path.join(resolvedDir, baseName);
      const relative = path.relative(resolvedDir, fp);
      const underDir = relative && !relative.startsWith("..") && !path.isAbsolute(relative);
      if (underDir && fs.existsSync(fp) && fs.statSync(fp).isFile()) {
        filePath = fp;
        break;
      }
    }
    if (!filePath) {
      res.writeHead(404);
      res.end();
      return;
    }
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end();
        return;
      }
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(data);
    });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/classified/records") {
    const asset = url.searchParams.get("asset") || "";
    const date = url.searchParams.get("date") || "";
    const tf = url.searchParams.get("tf") || "";
    const startHm = url.searchParams.get("start_hm") || "";
    const endHm = url.searchParams.get("end_hm") || "";
    const data = getClassifiedRecords(asset, date, tf, startHm, endHm);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(data));
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/alerts/bars") {
    const asset = url.searchParams.get("asset") || "";
    const date = url.searchParams.get("date") || "";
    const tf = url.searchParams.get("tf") || "";
    const startHm = url.searchParams.get("start_hm") || "";
    const endHm = url.searchParams.get("end_hm") || "";
    const data = getAlertsBars(asset, date, tf, startHm, endHm);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(data));
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/plot/vectors") {
    const asset = url.searchParams.get("asset") || "";
    const date = url.searchParams.get("date") || "";
    const tf = url.searchParams.get("tf") || "";
    const data = getPlotVectors(asset, date, tf);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(data));
    return;
  }
  if (req.method === "GET" && url.pathname.startsWith("/api/raw/")) {
    const kind = url.pathname.slice("/api/raw/".length);
    if (!["alerts", "trades", "raw_vectors", "classified"].includes(kind)) {
      res.writeHead(404);
      res.end();
      return;
    }
    const files = listRawFiles(kind);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ files }));
    return;
  }
  let filePath = path.join(uiDir, url.pathname === "/" ? "index.html" : url.pathname);
  if (!filePath.startsWith(uiDir)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(filePath, res);
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(port, () => {
  const exists = fs.existsSync(classifiedDir);
  const meta = extractClassifiedMeta(classifiedDir);
  console.log("VectorGen UI at http://localhost:" + port);
  console.log("DATA_BASE:", DATA_BASE);
  console.log("Classified dir:", classifiedDir, exists ? "" : "(directory missing)");
  console.log("Options found:", meta.assets.length, "assets,", meta.dates.length, "dates,", meta.tf.length, "tf");
});
