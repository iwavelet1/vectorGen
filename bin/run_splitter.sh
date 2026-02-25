#!/usr/bin/env bash
# Run daily_alerts_splitter from vectorGen project root.

cd "$(dirname "$0")/.." || exit 1

if [[ "$1" == "--info" ]]; then
  echo "Task: Split daily alert JSONL files into raw_vectors by revDir edges."
  echo "      Reads alerts from a folder; writes one JSONL file per vector segment"
  echo "      to raw_vectors (adjacent to alerts). Cleans raw_vectors each run."
  echo ""
  echo "Usage: $0 [--alerts-dir /path/to/Alerts]"
  echo "       Or set ALERTS_DIR in the environment."
  echo "       Requires --alerts-dir or ALERTS_DIR."
  exit 0
fi

exec python3 -m daily_alerts_splitter "$@"
