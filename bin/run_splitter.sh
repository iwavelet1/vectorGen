#!/usr/bin/env bash
# Run daily_alerts_splitter from vectorGen project root.
# Usage: ./bin/run_splitter.sh [--alerts-dir /path/to/Alerts]
# Or set ALERTS_DIR in the environment.

cd "$(dirname "$0")/.." || exit 1
exec python3 -m daily_alerts_splitter "$@"
