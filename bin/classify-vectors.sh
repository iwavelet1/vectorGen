#!/usr/bin/env bash
# Run vector_calc: raw_vectors -> classified/ (one .jsonl per segment, with scoring + next_* fields).
# Usage: classify-vectors.sh [RAW_DIR [CLASSIFIED_DIR]]
#   RAW_DIR defaults to ${RAW_VECTORS_DIR}, then ~/Fin/Data/raw_vectors. CLASSIFIED_DIR defaults to RAW_DIR/../classified.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VECTORGEN_ROOT="${VECTORGEN_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"

RAW_DIR="${1:-${RAW_VECTORS_DIR:-$HOME/Fin/Data/raw_vectors}}"
if [[ -z "$RAW_DIR" ]]; then
  echo "Usage: $0 RAW_DIR [CLASSIFIED_DIR]" >&2
  echo "  or set RAW_VECTORS_DIR, or use default ~/Fin/Data/raw_vectors" >&2
  exit 1
fi

CLASSIFIED_DIR="${2:-}"

cd "$VECTORGEN_ROOT"
exec python3 -m vector_calc --raw-dir "$RAW_DIR" ${CLASSIFIED_DIR:+--classified-dir "$CLASSIFIED_DIR"}
