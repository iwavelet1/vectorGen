#!/usr/bin/env bash
# Single process: run splitter (alerts -> raw_vectors) then vector_calc (raw_vectors -> classified).
# Uses global data base ~/Fin/Data (or DATA_BASE / FIN_DATA).
# Existing classified target files are always overwritten.
#
# Usage: run_split_then_classify.sh [YYMMDD | all]
#   YYMMDD  = process only this date (alerts and raw/classified for that date).
#   all     = process all dates (default).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VECTORGEN_ROOT="${VECTORGEN_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
PYTHON_BIN="${PYTHON_BIN:-python3.11}"
DATA_BASE="${DATA_BASE:-${FIN_DATA:-$HOME/Fin/Data}}"
ALERTS_DIR="${ALERTS_DIR:-$DATA_BASE/Alerts}"
RAW_DIR="$DATA_BASE/raw_vectors"
CLASSIFIED_DIR="$DATA_BASE/classified"
CHROMA_DIR="${CHROMA_DIR:-$DATA_BASE/chroma}"

DATE_ARG="${1:-all}"
if [[ -z "$DATE_ARG" ]]; then
  DATE_ARG=all
fi

cd "$VECTORGEN_ROOT"

if [[ "$DATE_ARG" == "all" ]]; then
  echo "=== Splitter (all dates) ==="
  "$PYTHON_BIN" -m daily_alerts_splitter --alerts-dir "$ALERTS_DIR"
  echo "=== Classify (all dates) ==="
  "$PYTHON_BIN" -m vector_calc --raw-dir "$RAW_DIR" --classified-dir "$CLASSIFIED_DIR"
  echo "=== Chroma ingest (all dates) ==="
  "$PYTHON_BIN" "$VECTORGEN_ROOT/chroma_ingest.py" --classified-dir "$CLASSIFIED_DIR" --chroma-dir "$CHROMA_DIR"
else
  echo "=== Splitter (date $DATE_ARG) ==="
  "$PYTHON_BIN" -m daily_alerts_splitter --alerts-dir "$ALERTS_DIR" --date "$DATE_ARG"
  echo "=== Classify (date $DATE_ARG) ==="
  "$PYTHON_BIN" -m vector_calc --raw-dir "$RAW_DIR" --classified-dir "$CLASSIFIED_DIR" --date "$DATE_ARG"
  echo "=== Chroma ingest (date $DATE_ARG) ==="
  "$PYTHON_BIN" "$VECTORGEN_ROOT/chroma_ingest.py" --classified-dir "$CLASSIFIED_DIR" --chroma-dir "$CHROMA_DIR" --date "$DATE_ARG"
fi

echo "Done."
