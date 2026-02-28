# VectorGen UI

Run the **Node server** so the Asset/Date/TF dropdowns are filled from your classified data:

```bash
# From vectorGen root:
bin/ui-server.sh start
# Open http://localhost:8000 (or the port shown)
# Stop: bin/ui-server.sh stop
```

Or run the server directly:

```bash
cd ui
node server.js
# Open http://localhost:8000
```

**Data base (global for all UI):** Alerts, trades, classified, and related paths are under one root. Set `DATA_BASE` or `FIN_DATA` to override; default is `~/Fin/Data`. Example:

```bash
export DATA_BASE=/Users/ihadas/Fin/Data
bin/ui-server.sh start
```

Classified dir is `$DATA_BASE/classified` (or `Classified`). Raw Alerts/Trades use `$DATA_BASE/Alerts`, `$DATA_BASE/alerts.jsonl`, `$DATA_BASE/Trades`, `$DATA_BASE/trades.jsonl`, or any `.jsonl` in `$DATA_BASE`.

If dropdowns are empty: check the server console for "DATA_BASE:" and "Options found:".
