# vectorGen

Vector tooling for ETF Trend:

1. **daily_alerts_splitter** – split daily alert JSONL files into per-vector raw segments.
2. **vector_calc** – compute per-vector features and write one file per (ticker, tf).
3. **bin/** – scripts: `classify-vectors.sh` (raw_vectors → classified), `ui-server.sh` (start/stop UI), `run_vector_calc.sh`, `run_splitter.sh`.
4. **ui/** – web UI (legend + classified dropdowns, plot); run `bin/ui-server.sh start`; data base ~/Fin/Data.

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

## vector_calc

- **Input:** `raw_vectors` folder (from `daily_alerts_splitter`), files like `SPY_260222_5_0935_1022.json`.
- **Per raw file:** One **classified** JSONL file with one record per bar. Each record k = feature vector computed on bars [0..k] (expanding window; bar k is the closing bar). Same 33 features as in `doc/Intraday_Vector_Classification_Summary.md`, plus 5 scoring attributes from `doc/Vector_Scoring_Exact_Calc_Spec.md`: profit_score, entry_score, maintain_score, tradeability_score, tier (percentiles within file).
- **Output:** `classified/` folder adjacent to `raw_vectors`. One file per raw vector: `classified/SPY_260222_5_0935_1022.jsonl` (same stem as raw). Cleared each run.

### Config & Run

```bash
cd vectorGen
pip install -r requirements.txt

# Compute classified records from raw_vectors (clears classified/ each run)
python -m vector_calc --raw-dir /path/to/raw_vectors
# or:
RAW_VECTORS_DIR=/path/to/raw_vectors python -m vector_calc
```

### Output format

Each record has: identity (closing_bar_index, segment_id, ticker, tf, date, start_time, duration_min, bars), the 33 feature attributes, and 5 scoring attributes (profit_score, entry_score, maintain_score, tradeability_score, tier). All floats rounded to 3 decimals.

### Files with tf=D

Raw vector files whose name has only four segments (`TICKER_YYMMDD_START_END`) are assigned **tf=D** (daily). Those come from alert files named `{ticker}_{yymmdd}.json` (no timeframe in the name). Example raw files: `BOIL_260223_1450_1510.json`, `BOIL_260223_1510_1620.json`, `DUST_260223_1620_1620.json`, `SPXU_260223_1605_1620.json`, `TQQQ_260223_1605_1620.json`.

### Output format

All float values in vector records are rounded to 3 decimal places.

---

## Testing

Run unit tests:

```bash
cd vectorGen
python -m unittest discover -s tests -v
```

**Correction test ideas** (see `tests/test_vector_calc.py` and extend as needed):

- **Bounds:** `efficiency` in [0, 1]; `duration_min` ≥ 0; `bars` ≥ 1; `*_active_frac` and `*_side_frac` in [0, 1].
- **Direction consistency:** For vectors where first bar has `revDir == 1` (up), expect `delta_pct` > 0 and `p1_close` > `p0_close`; for `revDir == -1`, expect `delta_pct` < 0 and `p1_close` < `p0_close`. Log or assert in tests.
- **vector_id format:** Matches `ticker_tf_yymmdd_ordinal`; ordinal is 1-based and unique per (ticker, date, tf).
- **Golden run:** Keep a small fixture raw segment and expected feature dict (or key fields); regression test that `compute_vector_features` matches within tolerance after rounding.
- **Cross-checks:** e.g. `rev_avwap_side_frac` + fraction below ≈ 1; sum of bar-level contributions matches aggregate (e.g. dollarVol_sum vs sum of close*volume).

