#!/usr/bin/env bash
# Dump a Kafka topic to the console. Uses a random consumer group so it does not steal messages.
# Run from repo root: ./bin/dump-topic.sh <topic> [bootstrap]
#   topic: e.g. alerts, trades
#   bootstrap: optional, default from KAFKA_BOOTSTRAP_SERVERS or broker_1:9092
set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ETF_ROOT="/Volumes/TAKE5/cursor/TradingView/ETF Trend"
cd "$REPO_ROOT"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <topic> [bootstrap_servers]" >&2
  echo "  topic: e.g. alerts, trades" >&2
  echo "  bootstrap: optional, default from KAFKA_BOOTSTRAP_SERVERS or broker_1:9092" >&2
  exit 1
fi

TOPIC="$1"
BOOTSTRAP="${2:-${KAFKA_BOOTSTRAP_SERVERS:-broker_1:9092}}"

exec python3 "$ETF_ROOT/kafka-dump/dump_topic.py" "$TOPIC" "$BOOTSTRAP"
