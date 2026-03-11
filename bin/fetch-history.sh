#!/usr/bin/env bash
# Run Telegram history fetch for a date; output to console or to Kafka topics (alerts/trades).
# Requires ETF Trend repo (laptop-reader) at sibling ../ETF Trend or set ETF_TREND_ROOT.
#
# Usage: ./bin/fetch-history.sh [--date yymmdd] [--output console|topics]
#   --date   default: yesterday (yymmdd)
#   --output default: console. Use 'topics' to publish to Kafka alerts/trades.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VECTORGEN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PARENT="$(cd "$VECTORGEN_ROOT/.." && pwd)"
ETF_TREND_ROOT="${ETF_TREND_ROOT:-$PARENT/ETF Trend}"
FETCH_PY="$ETF_TREND_ROOT/laptop-reader/fetch_history.py"

if [[ ! -f "$FETCH_PY" ]]; then
  echo "Error: fetch_history.py not found at $FETCH_PY" >&2
  echo "Set ETF_TREND_ROOT to the ETF Trend repo root if needed." >&2
  exit 1
fi

# Kafka defaults (same as dump-topic.sh). Use localhost:29092 when Kafka runs in Docker and you run on host.
export KAFKA_BOOTSTRAP_SERVERS="${KAFKA_BOOTSTRAP_SERVERS:-localhost:29092}"
export KAFKA_ALERTS_TOPIC="${KAFKA_ALERTS_TOPIC:-alerts}"
export KAFKA_TRADES_TOPIC="${KAFKA_TRADES_TOPIC:-trades}"

exec python3 "$FETCH_PY" "$@"
