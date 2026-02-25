"""Run daily_alerts_splitter: clean raw_vectors, then split each alerts file by revDir edges."""
import argparse
import os
import sys
from pathlib import Path

from .splitter import run_file

DEFAULT_ALERTS = os.environ.get("ALERTS_DIR", "")


def main() -> None:
    p = argparse.ArgumentParser(description="Split alerts JSONL into raw_vectors by revDir edges.")
    p.add_argument(
        "--alerts-dir",
        default=DEFAULT_ALERTS,
        help="Path to alerts folder (or set ALERTS_DIR)",
    )
    args = p.parse_args()
    if not args.alerts_dir:
        p.error("Set --alerts-dir or ALERTS_DIR")
    alerts_dir = Path(args.alerts_dir)
    if not alerts_dir.is_dir():
        print(f"Alerts dir not found: {alerts_dir}", file=sys.stderr)
        sys.exit(1)
    raw_vectors_dir = alerts_dir.parent / "raw_vectors"
    # Clean raw_vectors
    if raw_vectors_dir.exists():
        for f in raw_vectors_dir.iterdir():
            if f.is_file():
                f.unlink()
    else:
        raw_vectors_dir.mkdir(parents=True, exist_ok=True)
    total = 0
    for path in sorted(alerts_dir.glob("*.json")):
        written = run_file(path, raw_vectors_dir, path.stem)
        total += len(written)
        if written:
            print(f"{path.name} -> {len(written)} vectors")
    print(f"Wrote {total} vector files to {raw_vectors_dir}")


if __name__ == "__main__":
    main()
