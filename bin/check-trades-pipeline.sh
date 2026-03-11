#!/usr/bin/env bash
# Check Docker, Kafka, and kafka_to_files data. Optional: DATE (YYMMDD) to look for in trades, e.g. 260306.
# Run from repo root: ./bin/check-trades-pipeline.sh [260306]
set -e
DATE_FILTER="${1:-}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== Docker Compose services ==="
docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null || { echo "docker compose not available"; exit 1; }

echo ""
echo "=== telegram_to_kafka (listener) container logs (last 50 lines) ==="
docker compose logs listener --tail 50 2>/dev/null || docker-compose logs listener --tail 50 2>/dev/null || true

echo ""
echo "=== kafka_to_files container logs (last 40 lines) ==="
docker compose logs kafka_to_files --tail 40 2>/dev/null || docker-compose logs kafka_to_files --tail 40 2>/dev/null || true

echo ""
echo "=== Kafka topics ==="
docker compose exec broker_1 kafka-topics --bootstrap-server broker_1:9092 --list 2>/dev/null || docker-compose exec broker_1 kafka-topics --bootstrap-server broker_1:9092 --list 2>/dev/null || echo "Could not list topics (broker_1 not running?)"

echo ""
echo "=== Consumer group telegram_consumers (offsets for alerts + trades) ==="
docker compose exec broker_1 kafka-consumer-groups --bootstrap-server broker_1:9092 --describe --group telegram_consumers 2>/dev/null || docker-compose exec broker_1 kafka-consumer-groups --bootstrap-server broker_1:9092 --describe --group telegram_consumers 2>/dev/null || echo "Could not describe group"

echo ""
echo "=== Data volume: /data/Trades and /data/Alerts (from kafka_to_files) ==="
docker compose run --rm --no-deps kafka_to_files ls -la /data/Trades /data/Alerts 2>/dev/null || docker-compose run --rm --no-deps kafka_to_files ls -la /data/Trades /data/Alerts 2>/dev/null || echo "Could not list (run: docker compose up -d first)"

echo ""
echo "=== trades.jsonl line count ==="
docker compose run --rm --no-deps kafka_to_files sh -c 'wc -l < /data/Trades/trades.jsonl 2>/dev/null || echo 0' 2>/dev/null || docker-compose run --rm --no-deps kafka_to_files sh -c 'wc -l < /data/Trades/trades.jsonl 2>/dev/null || echo 0' 2>/dev/null || echo "—"

if [ -n "$DATE_FILTER" ]; then
  echo ""
  echo "=== Lines in trades.jsonl containing $DATE_FILTER ==="
  docker compose run --rm --no-deps kafka_to_files sh -c "grep -c '$DATE_FILTER' /data/Trades/trades.jsonl 2>/dev/null || echo 0" 2>/dev/null || docker-compose run --rm --no-deps kafka_to_files sh -c "grep -c '$DATE_FILTER' /data/Trades/trades.jsonl 2>/dev/null || echo 0" 2>/dev/null || echo "—"
fi

echo ""
echo "Done."
echo "If listener shows 'Server sent a very old/new message, ignoring' or 'Security error: Too many messages had to be ignored': Telegram client is out of sync; restart with: docker compose restart listener"
echo "Rebuild listener to get Kafka topic logging: docker compose up -d --build listener"
