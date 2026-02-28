"""CLI: read raw_vectors, compute one record per closing bar + scoring, write to classified/."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

# Attributes to drop from each vector record before writing
VEC_DROP_ATTRS = frozenset({
    "slope_pctPerMin", "atrNow", "atrBase", "shockScore", "shockDir",
    "tShockScoreTot", "tShockDirTot", "tTrendAbs", "trendDir", "inTrendScore",
    "smaCrossDirInd", "smaCrossDirHTF", "htfSmaFastDir", "REV_avwap", "TRADE_avwap",
    "open", "high", "low", "hlc3", "ohlc4", "FSM_State", "prev_state", "new_state",
    "noneDir", "noneScore", "tPreDir", "tPreCAbs", "tPeakDir", "htf", "htf2",
})

# Keys to copy from next vector's last bar into current record with next_ prefix
NEXT_SOURCE_ATTRS = ("profit_score", "entry_score", "maintain_score", "tradeability_score", "delta_pct", "tier")

from .calc import (
    add_scoring_to_records,
    compute_records_for_segment,
    load_segment,
    parse_raw_filename,
)


def _add_next_vector_fields(classified_dir: Path) -> None:
    """For each classified file, add next_* from the last record of the next vector (same ticker, date, tf)."""
    paths = list(classified_dir.glob("*.jsonl"))
    if not paths:
        return
    # Group by (ticker, date, tf), sort by start_hhmm
    groups: dict[tuple[str, str, str], list[Path]] = {}
    for p in paths:
        try:
            ticker, date, tf, start_hhmm, _ = parse_raw_filename(p)
        except ValueError:
            continue
        key = (ticker, date, tf)
        groups.setdefault(key, []).append((start_hhmm, p))
    for key, items in groups.items():
        items.sort(key=lambda x: x[0])
        ordered_paths = [p for _start, p in items]
        for i, path in enumerate(ordered_paths):
            next_path = ordered_paths[i + 1] if i + 1 < len(ordered_paths) else None
            if next_path is None:
                continue
            # Last record of next file
            lines = next_path.read_text(encoding="utf-8").strip().splitlines()
            if not lines:
                continue
            last_rec = json.loads(lines[-1])
            next_vals = {f"next_{k}": last_rec.get(k) for k in NEXT_SOURCE_ATTRS}
            # Load current file, add next_* to every record, write back
            lines_cur = path.read_text(encoding="utf-8").strip().splitlines()
            out_lines = []
            for line in lines_cur:
                rec = json.loads(line)
                rec.update(next_vals)
                out_lines.append(json.dumps(rec, ensure_ascii=False))
            path.write_text("\n".join(out_lines) + "\n", encoding="utf-8")


def round_floats(obj: Any, ndigits: int = 3) -> Any:
    """Return a copy of obj with all floats rounded to ndigits."""
    if isinstance(obj, float):
        return round(obj, ndigits) if obj == obj else obj  # keep nan
    if isinstance(obj, dict):
        return {k: round_floats(v, ndigits) for k, v in obj.items()}
    if isinstance(obj, list):
        return [round_floats(v, ndigits) for v in obj]
    return obj


def main() -> None:
    p = argparse.ArgumentParser(description="Compute vector features from raw_vectors (one record per closing bar, scoring).")
    p.add_argument(
        "--raw-dir",
        default=os.environ.get("RAW_VECTORS_DIR", ""),
        help="Path to raw_vectors folder (default: RAW_VECTORS_DIR).",
    )
    p.add_argument(
        "--classified-dir",
        default="",
        help="Optional explicit output dir (default: sibling 'classified' next to raw_dir).",
    )
    p.add_argument(
        "--date",
        default="",
        help="Process only this YYMMDD; if set, do not clear classified, only overwrite matching files.",
    )
    args = p.parse_args()

    if not args.raw_dir:
        p.error("Set --raw-dir or RAW_VECTORS_DIR")
    raw_dir = Path(args.raw_dir)
    if not raw_dir.is_dir():
        p.error(f"raw_dir not found: {raw_dir}")

    classified_dir = Path(args.classified_dir) if args.classified_dir else raw_dir.parent / "classified"
    classified_dir.mkdir(parents=True, exist_ok=True)
    date_filter = args.date.strip() if args.date else None
    if not date_filter:
        for f in classified_dir.iterdir():
            if f.is_file():
                f.unlink()

    raw_paths = sorted(raw_dir.glob("*.json"))
    if date_filter:
        raw_paths = [p for p in raw_paths if f"_{date_filter}_" in p.stem or p.stem.endswith(f"_{date_filter}")]
    if not raw_paths:
        print(f"No raw vector files in {raw_dir}")
        return

    total = 0
    for path in raw_paths:
        try:
            ticker, date, tf, _start, _end = parse_raw_filename(path)
        except ValueError:
            continue
        segment_id = path.stem
        df = load_segment(path)
        records = compute_records_for_segment(df, ticker, tf, date, segment_id)
        if not records:
            continue
        add_scoring_to_records(records)
        out_path = classified_dir / f"{segment_id}.jsonl"
        with out_path.open("w", encoding="utf-8") as f:
            for rec in records:
                rec = round_floats(rec, ndigits=3)
                for k in VEC_DROP_ATTRS:
                    rec.pop(k, None)
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        total += len(records)
        print(f"{path.name} -> {out_path.name} ({len(records)} records)")

    # Post-pass: add next_* from last bar of following vector (same ticker, date, tf)
    _add_next_vector_fields(classified_dir)

    print(f"Wrote {total} classified records into {classified_dir}")


if __name__ == "__main__":
    main()
