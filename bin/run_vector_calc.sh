#!/usr/bin/env bash
# Run vector_calc from vectorGen project root.

cd "$(dirname "$0")/.." || exit 1

if [[ "$1" == "--info" ]]; then
  echo "Task: Compute classified vector records from raw_vectors (one record per closing bar)."
  echo "      Reads raw_vectors; for each file writes one JSONL to classified/ (same stem)."
  echo "      Each record = features on bars [0..k] + profit/entry/maintain/tradeability score + tier."
  echo "      Cleans classified/ each run."
  echo ""
  echo "Usage: $0 [--raw-dir /path/to/raw_vectors]"
  echo "       Or set RAW_VECTORS_DIR in the environment."
  echo "       Requires --raw-dir or RAW_VECTORS_DIR."
  exit 0
fi

exec python3 -m vector_calc "$@"
