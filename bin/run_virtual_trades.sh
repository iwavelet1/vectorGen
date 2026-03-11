#!/usr/bin/env bash
# Find virtual trades in raw vectors.
# Usage: run_virtual_trades.sh [YYMMDD]
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VECTORGEN_ROOT="${VECTORGEN_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
PYTHON_BIN="${PYTHON_BIN:-python3.11}"

DATE_ARG="${1:-}"
cd "$VECTORGEN_ROOT"

if [[ -n "$DATE_ARG" ]]; then
  "$PYTHON_BIN" -m virtual_trades --date "$DATE_ARG"
else
  "$PYTHON_BIN" -m virtual_trades
fi
