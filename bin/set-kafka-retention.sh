#!/usr/bin/env bash
# Set retention on Kafka topics alerts and trades to 7 days (168h = 604800000 ms).
# Run from repo root: ./bin/set-kafka-retention.sh
# Requires broker_1 running (docker compose up -d).
set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"
RETENTION_HOURS="${1:-168}"
BROKER="${2:-broker_1:9092}"
RETENTION_MS=$((RETENTION_HOURS * 3600 * 1000))

run() {
  docker compose exec broker_1 "$@" 2>/dev/null || docker-compose exec broker_1 "$@" 2>/dev/null
}

echo "Setting retention.ms=${RETENTION_MS} (${RETENTION_HOURS}h) for topics alerts, trades (broker=${BROKER})."
for topic in alerts trades; do
  echo "--- $topic ---"
  run kafka-configs --bootstrap-server "$BROKER" --entity-type topics --entity-name "$topic" --alter --add-config "retention.ms=$RETENTION_MS" || true
done
echo "Done. Verify with: docker compose exec broker_1 kafka-configs --bootstrap-server broker_1:9092 --entity-type topics --describe"
