#!/usr/bin/env python3
"""Compare raw_vectors and classified dirs: same stems, same line counts.
Reports why they might not match (extension, parse, path).
Usage: python3 check_raw_classified_match.py [RAW_DIR [CLASSIFIED_DIR]]
  Defaults: RAW_VECTORS_DIR or $DATA_BASE/raw_vectors, $DATA_BASE/classified.
"""
import os
import sys
from pathlib import Path


def main():
    data_base = os.environ.get("DATA_BASE") or os.environ.get("FIN_DATA") or os.path.expanduser("~/Fin/Data")
    raw_dir = Path(sys.argv[1] if len(sys.argv) > 1 else os.environ.get("RAW_VECTORS_DIR", data_base + "/raw_vectors"))
    classified_dir = Path(sys.argv[2] if len(sys.argv) > 2 else data_base + "/classified")

    if not raw_dir.is_dir():
        print(f"Raw dir not found: {raw_dir}", file=sys.stderr)
        sys.exit(1)
    if not classified_dir.is_dir():
        print(f"Classified dir not found: {classified_dir}", file=sys.stderr)
        sys.exit(1)

    def line_count(p: Path) -> int:
        try:
            return sum(1 for line in p.read_text().splitlines() if line.strip())
        except Exception:
            return -1

    # vector_calc globs "*.jsonl". Splitter writes .jsonl. Both use .jsonl.
    raw_stems = {}
    for f in raw_dir.iterdir():
        if not f.is_file() or f.suffix.lower() != ".jsonl":
            continue
        raw_stems[f.stem] = line_count(f)

    classified = {}
    for f in classified_dir.iterdir():
        if f.is_file() and f.suffix.lower() == ".jsonl":
            classified[f.stem] = line_count(f)

    in_raw_not_classified = set(raw_stems) - set(classified)
    in_classified_not_raw = set(classified) - set(raw_stems)
    count_mismatch = [(s, raw_stems[s], classified[s]) for s in set(raw_stems) & set(classified) if raw_stems[s] != classified[s]]

    print("Raw dir:", raw_dir)
    print("  *.jsonl:", len(raw_stems))
    print("Classified dir:", classified_dir)
    print("  *.jsonl:", len(classified))
    print()

    if in_raw_not_classified:
        print("In raw (*.jsonl) but NO classified:", len(in_raw_not_classified))
        for s in sorted(in_raw_not_classified)[:25]:
            print(f"  {s}.jsonl ({raw_stems[s]} lines)")
        if len(in_raw_not_classified) > 25:
            print(f"  ... and {len(in_raw_not_classified) - 25} more")
        print("  Why: parse_raw_filename(stem) failed (need 4 or 5 parts), or file empty -> no records.")
        print()
    if in_classified_not_raw:
        print("In classified but NO raw (*.jsonl):", len(in_classified_not_raw))
        for s in sorted(in_classified_not_raw)[:25]:
            print(f"  {s}.jsonl")
        if len(in_classified_not_raw) > 25:
            print(f"  ... and {len(in_classified_not_raw) - 25} more")
        print("  Why: raw file missing or deleted.")
        print()
    if count_mismatch:
        print("Same stem but line count mismatch:", len(count_mismatch))
        for s, rn, cn in sorted(count_mismatch)[:25]:
            print(f"  {s}: raw {rn} vs classified {cn}")
        if len(count_mismatch) > 25:
            print(f"  ... and {len(count_mismatch) - 25} more")
        print("  Why: raw has malformed lines or empty -> pandas/load_segment dropped rows or failed.")
        print()

    if not in_raw_not_classified and not in_classified_not_raw and not count_mismatch:
        print("OK: same stems and same line counts (1:1).")
    else:
        print("Fix: run bin/run_split_then_classify.sh (same DATA_BASE); splitter and classifier use .jsonl.")


if __name__ == "__main__":
    main()
