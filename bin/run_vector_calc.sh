#!/usr/bin/env bash
# Run vector_calc from vectorGen project root.

cd "$(dirname "$0")/.." || exit 1

if [[ "$1" == "--info" ]]; then
  echo "Task: Compute vector features from raw_vectors and write per (ticker,tf) JSONL."
  echo "      Reads raw_vectors folder; outputs one JSONL file per ticker+timeframe to"
  echo "      vector/ (adjacent to raw_vectors). Cleans vector/ each run."
  echo ""
  echo "Usage: $0 [--raw-dir /path/to/raw_vectors]"
  echo "       Or set RAW_VECTORS_DIR in the environment."
  echo "       Requires --raw-dir or RAW_VECTORS_DIR."
  exit 0
fi

exec python3 -m vector_calc "$@"
