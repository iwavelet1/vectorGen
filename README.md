# vectorGen

Splits daily alert JSONL files into per-vector files (directional trend segments between reversal edges).

## daily_alerts_splitter

- **Input:** Alerts folder with files `{ticker}_{yymmdd}_{tf}.json` (one JSON object per line).
- **Output:** Folder `raw_vectors` adjacent to the alerts folder. One file per segment: `{parent_basename}_{start_hhmm}_{end_hhmm}.json` containing all bars in that segment. Edges (revDir != 0) appear as end of one file and start of the next.
- **Each run:** Cleans `raw_vectors` then rewrites all vector files.

### Config

Set `ALERTS_DIR` or pass `--alerts-dir /path/to/Alerts`. `raw_vectors` is `{parent of ALERTS_DIR}/raw_vectors`.

### Run

From repo root:

```bash
cd vectorGen
python -m daily_alerts_splitter --alerts-dir /path/to/Alerts
# or: ALERTS_DIR=/path/to/Alerts python -m daily_alerts_splitter
```
