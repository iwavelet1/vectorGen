#!/usr/bin/env bash
# Start or stop the VectorGen UI server (node ui/server.js).
# Usage: ui-server.sh {start|stop|status|restart} [PORT]
#   PORT defaults to 8000. Run from VectorGen root or set VECTORGEN_ROOT.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VECTORGEN_ROOT="${VECTORGEN_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
UI_DIR="$VECTORGEN_ROOT/ui"
PID_FILE="$UI_DIR/.ui-server.pid"
PORT="${2:-${PORT:-8000}}"

cd "$UI_DIR"

case "${1:-}" in
  start)
    if [[ -f "$PID_FILE" ]]; then
      pid=$(cat "$PID_FILE")
      if kill -0 "$pid" 2>/dev/null; then
        echo "UI server already running (PID $pid). Stop it first." >&2
        exit 1
      fi
      rm -f "$PID_FILE"
    fi
    node server.js "$PORT" &
    echo $! > "$PID_FILE"
    echo "UI server started on port $PORT (PID $(cat "$PID_FILE")). Open http://localhost:$PORT"
    ;;
  stop)
    if [[ ! -f "$PID_FILE" ]]; then
      echo "No PID file; server may not be running." >&2
      exit 0
    fi
    pid=$(cat "$PID_FILE")
    rm -f "$PID_FILE"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      echo "UI server stopped (PID $pid)."
    else
      echo "Process $pid not running."
    fi
    ;;
  status)
    if [[ ! -f "$PID_FILE" ]]; then
      echo "UI server not running (no PID file)."
      exit 0
    fi
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      echo "UI server running (PID $pid, port $PORT)."
    else
      echo "UI server not running (stale PID file)."
      rm -f "$PID_FILE"
    fi
    ;;
  restart)
    "$SCRIPT_DIR/ui-server.sh" stop 2>/dev/null || true
    "$SCRIPT_DIR/ui-server.sh" start "$PORT"
    ;;
  *)
    echo "Usage: $0 {start|stop|status|restart} [PORT]" >&2
    echo "  PORT defaults to 8000." >&2
    exit 1
    ;;
esac
