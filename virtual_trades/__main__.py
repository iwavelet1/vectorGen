"""CLI: scan raw_vectors, find virtual trades, write to virtual_trades dir.

Usage:
  python -m virtual_trades [--raw-dir DIR] [--date YYMMDD]
"""
from __future__ import annotations

import argparse
import json
import os
import re
from collections import defaultdict
from pathlib import Path

from .finder import find_trades_for_segment, get_deadline_for_current_vec

STEM_RE = re.compile(r"^([A-Z]+)_(\d{6})_(\w+)_(\d{4})_(\d{4})$")


def _load_bars(path: Path) -> list[dict]:
    bars = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            bars.append(json.loads(line.replace("NaN", "null")))
        except json.JSONDecodeError:
            continue
    return bars


def main() -> None:
    data_base = os.environ.get("DATA_BASE") or os.environ.get("FIN_DATA") or os.path.expanduser("~/Fin/Data")
    default_raw = os.environ.get("RAW_VECTORS_DIR") or os.path.join(data_base, "raw_vectors")

    parser = argparse.ArgumentParser(description="Find virtual trades in raw vectors.")
    parser.add_argument("--raw-dir", default=default_raw, help="Raw vectors directory")
    parser.add_argument("--date", default=None, metavar="YYMMDD", help="Only process this date")
    args = parser.parse_args()

    raw_dir = Path(args.raw_dir)
    out_dir = raw_dir.parent / "virtual_trades"
    out_dir.mkdir(parents=True, exist_ok=True)

    groups: dict[tuple[str, str, str], list[Path]] = defaultdict(list)
    for fp in sorted(raw_dir.glob("*.jsonl")):
        m = STEM_RE.match(fp.stem)
        if not m:
            continue
        asset, date, tf, start_hm, end_hm = m.groups()
        if args.date and date != args.date:
            continue
        groups[(asset, date, tf)].append(fp)

    for (asset, date, tf), files in sorted(groups.items()):
        files.sort(key=lambda p: p.stem)
        all_bars = [_load_bars(f) for f in files]
        vector_ids = [f.stem for f in files]
        trades = []

        for i, (bars, vid) in enumerate(zip(all_bars, vector_ids)):
            next_bars = all_bars[i + 1] if i + 1 < len(all_bars) else None
            deadline = get_deadline_for_current_vec(bars, next_bars)
            trade = find_trades_for_segment(bars, deadline, vid, asset, date, tf)
            if trade is not None:
                trades.append(trade)

        out_path = out_dir / f"{asset}_{date}_{tf}.jsonl"
        with open(out_path, "w", encoding="utf-8") as f:
            for t in trades:
                f.write(json.dumps(t, ensure_ascii=False) + "\n")
        if trades:
            print(f"{asset}_{date}_{tf}.jsonl: {len(trades)} trades")


if __name__ == "__main__":
    main()
