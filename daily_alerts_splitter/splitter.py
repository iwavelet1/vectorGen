"""Split one alerts JSONL file into vector files by revDir edges. No feature calc."""
import json
import math
import re
import sys
from datetime import datetime
from pathlib import Path

# Alert time format: "yyyy-MM-dd HH:mm:ss z" e.g. "2026-02-22 14:30:00 UTC"
TIME_PATTERN = re.compile(r"^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})")


def _parse_time(s: str) -> datetime | None:
    if not s or not isinstance(s, str):
        return None
    m = TIME_PATTERN.match(s.strip())
    if not m:
        return None
    y, mo, d, h, mi, sec = map(int, m.groups())
    return datetime(y, mo, d, h, mi, sec)


def _time_to_hhmm(dt: datetime) -> str:
    return dt.strftime("%H%M")


def is_edge(bar: dict) -> bool:
    """Bar is a reversal edge iff revDir != 0 (1 = up, -1 = down)."""
    r = bar.get("revDir")
    if r is None:
        return False
    try:
        return int(r) != 0
    except (TypeError, ValueError):
        return False


def load_bars(path: Path) -> list[dict]:
    """Load JSONL file; return list of bar dicts sorted by time (then bar_index)."""
    bars = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                bars.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    # Sort by time, then bar_index
    def key(b):
        t = _parse_time(b.get("time"))
        bi = b.get("bar_index")
        return (t or datetime.min, bi if isinstance(bi, int) else 0)

    bars.sort(key=key)
    return bars


def edge_indices(bars: list[dict]) -> list[int]:
    """Return indices of bars where revDir != 0."""
    return [i for i, b in enumerate(bars) if is_edge(b)]


def segments_from_edges(bars: list[dict], edge_ix: list[int]) -> list[list[dict]]:
    """Build segments: a segment runs from an edge bar until the next edge where
    revDir != 0 and revDir != starting revDir (closing edge). If revDir == start_dir
    it is the same edge (same direction), so we do not close there.
    """
    if not edge_ix:
        return [bars] if bars else []
    segments = []
    k = 0
    while k < len(edge_ix):
        start_ix = edge_ix[k]
        start_dir = _rev_dir(bars[start_ix])
        end_ix = start_ix
        for j in range(k + 1, len(edge_ix)):
            if _rev_dir(bars[edge_ix[j]]) != start_dir:
                end_ix = edge_ix[j]
                break
        else:
            end_ix = len(bars) - 1
        segments.append(bars[start_ix : end_ix + 1])
        if end_ix == start_ix:
            k += 1
        else:
            for j in range(k + 1, len(edge_ix)):
                if edge_ix[j] == end_ix:
                    k = j
                    break
            else:
                # Ran to end of bars (no opposite edge found); don't start a new segment at next same-dir edge
                k = len(edge_ix)
    return segments


def _rev_dir(bar: dict) -> int | None:
    """revDir as int (1 or -1) or None if missing/invalid."""
    r = bar.get("revDir")
    if r is None:
        return None
    try:
        v = int(r)
        return v if v in (1, -1) else None
    except (TypeError, ValueError):
        return None


def _rev_avwap(bar: dict) -> float | None:
    """REV_avwap as float or None if missing/NaN."""
    v = bar.get("REV_avwap")
    if v is None:
        return None
    try:
        f = float(v)
        return f if math.isfinite(f) else None
    except (TypeError, ValueError):
        return None


def sanity_check_segment(
    seg: list[dict],
    out_name: str,
    log_err: None = None,
) -> None:
    """Log if (1) start revDir is not opposite of end revDir, or (2) REV_avwap diff does not match dir (up: start < end, down: start > end)."""
    if log_err is None:
        log_err = lambda msg: print(msg, file=sys.stderr)
    if len(seg) < 2:
        return
    first, last = seg[0], seg[-1]
    start_dir = _rev_dir(first)
    end_dir = _rev_dir(last)
    # 1. start and end revDir should be opposite
    if start_dir is not None and end_dir is not None and start_dir == end_dir:
        log_err(f"[sanity] {out_name}: revDir start ({start_dir}) should be opposite of end ({end_dir})")
    # 2. Anchor rev price diff should match dir: up (revDir=1) => start < end, down (revDir=-1) => start > end
    start_avwap = _rev_avwap(first)
    end_avwap = _rev_avwap(last)
    if start_avwap is not None and end_avwap is not None and start_dir is not None:
        if start_dir == 1 and start_avwap >= end_avwap:
            log_err(f"[sanity] {out_name}: up vector (revDir=1) but REV_avwap start ({start_avwap}) >= end ({end_avwap})")
        elif start_dir == -1 and start_avwap <= end_avwap:
            log_err(f"[sanity] {out_name}: down vector (revDir=-1) but REV_avwap start ({start_avwap}) <= end ({end_avwap})")


def run_file(alerts_path: Path, raw_vectors_dir: Path, parent_basename: str) -> list[Path]:
    """Split one alerts file into vector files. Returns paths written."""
    bars = load_bars(alerts_path)
    if not bars:
        return []
    edge_ix = edge_indices(bars)
    if not edge_ix:
        # No edges: one segment = full day
        segs = [bars]
    else:
        segs = segments_from_edges(bars, edge_ix)
    written = []
    raw_vectors_dir.mkdir(parents=True, exist_ok=True)
    for seg in segs:
        if not seg:
            continue
        t0 = _parse_time(seg[0].get("time"))
        t1 = _parse_time(seg[-1].get("time"))
        start_hhmm = _time_to_hhmm(t0) if t0 else "0000"
        end_hhmm = _time_to_hhmm(t1) if t1 else "0000"
        out_name = f"{parent_basename}_{start_hhmm}_{end_hhmm}.jsonl"
        sanity_check_segment(seg, out_name)
        out_path = raw_vectors_dir / out_name
        with open(out_path, "w", encoding="utf-8") as f:
            for obj in seg:
                f.write(json.dumps(obj, ensure_ascii=False) + "\n")
        written.append(out_path)
    return written
