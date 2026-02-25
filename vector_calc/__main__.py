"""CLI: read raw_vectors, compute per-vector features, write per-(ticker,tf) files into vector/."""

from __future__ import annotations

import argparse
import json
import os
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Tuple

from .calc import build_vector_keys, compute_vector_features, load_segment


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
    p = argparse.ArgumentParser(description="Compute vector features from raw_vectors.")
    p.add_argument(
        "--raw-dir",
        default=os.environ.get("RAW_VECTORS_DIR", ""),
        help="Path to raw_vectors folder (default: RAW_VECTORS_DIR).",
    )
    p.add_argument(
        "--vector-dir",
        default="",
        help="Optional explicit output dir for vector files (default: sibling 'vector' next to raw_dir).",
    )
    args = p.parse_args()

    if not args.raw_dir:
        p.error("Set --raw-dir or RAW_VECTORS_DIR")
    raw_dir = Path(args.raw_dir)
    if not raw_dir.is_dir():
        p.error(f"raw_dir not found: {raw_dir}")

    vector_dir = Path(args.vector_dir) if args.vector_dir else raw_dir.parent / "vector"
    vector_dir.mkdir(parents=True, exist_ok=True)
    # Clear vector dir on every run so output reflects only current raw_vectors
    for f in vector_dir.iterdir():
        if f.is_file():
            f.unlink()

    raw_paths = sorted(raw_dir.glob("*.json"))
    if not raw_paths:
        print(f"No raw vector files in {raw_dir}")
        return

    path_keys = build_vector_keys(raw_paths)

    # Group feature records by (ticker, tf)
    grouped: Dict[Tuple[str, str], List[dict]] = defaultdict(list)
    for path, vkey in path_keys:
        df = load_segment(path)
        rec = compute_vector_features(df, vkey)
        if not rec:
            continue
        rec = round_floats(rec, ndigits=3)
        grouped[(vkey.ticker, vkey.tf)].append(rec)

    # Write one JSONL file per (ticker, tf)
    total = 0
    for (ticker, tf), records in grouped.items():
        # Sort by date then ordinal
        records.sort(key=lambda r: (r.get("date", ""), int(r.get("ordinal", 0))))
        if not records:
            continue
        first = records[0]
        last = records[-1]
        first_suffix = f"{first.get('date','')}_{first.get('ordinal',0)}"
        last_suffix = f"{last.get('date','')}_{last.get('ordinal',0)}"
        base_name = f"{ticker.lower()}_{tf}_{first_suffix}_{last_suffix}.jsonl"
        out_path = vector_dir / base_name
        with out_path.open("w", encoding="utf-8") as f:
            for rec in records:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        total += len(records)
        print(f"{ticker}_{tf}: wrote {len(records)} vectors -> {out_path.name}")

    print(f"Wrote {total} vector records into {vector_dir}")


if __name__ == "__main__":
    main()

