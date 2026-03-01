# Pipeline: Alerts → Raw → Classified (1:1 correspondence)

One script runs the full process with cleanup first. Raw and classified are in exact 1:1 correspondence: same file set (by stem) and same row count per file.

## Single script

`bin/run_split_then_classify.sh` [YYMMDD | all]

1. **Splitter** (alerts → raw_vectors), with cleanup then write.
2. **Classifier** (raw_vectors → classified), with cleanup then write (when no date filter).

No other steps write to raw or classified. There is no “outdated” half: the script runs both in order; cleanup ensures the next step writes into a known state.

## Why raw and classified match exactly

### Same files (same stems)

- **Splitter** writes one file per segment to `raw_vectors/`:
  - Name: `{parent_basename}_{start_hhmm}_{end_hhmm}.jsonl`
  - Example: `BOIL_260225_5_0935_1022.jsonl`
  - Stem = `BOIL_260225_5_0935_1022`.
- **Classifier** reads `raw_dir.glob("*.jsonl")`, so it sees exactly those files. For each path it uses `segment_id = path.stem` and writes:
  - `classified/{segment_id}.jsonl`
  - Example: `BOIL_260225_5_0935_1022.jsonl`
- So for every raw file `X.jsonl` there is exactly one classified file `X.jsonl` (same stem X), and the classifier only writes files for stems that came from raw.

### Same row count per file

- **Raw:** One line per bar (one JSON object per line). So for a file with stem X, `line_count(raw) = number of bars` in that segment.
- **Classifier:** For that raw file it loads the segment into a DataFrame with `len(df) = number of bars`. `compute_records_for_segment(df, ...)` does:
  - `for k in range(len(df))`: one record per bar.
  - `_identity_prefix(...)` always returns a non-empty dict, so no iteration is skipped.
  - So `len(records) == len(df)`.
- It then writes one line per record: `f.write(json.dumps(rec, ...) + "\n")` for each record.
- So `line_count(classified) = len(records) = len(df) = line_count(raw)`.

Hence: **for every classified file there is a raw file with the same stem and the same number of lines (records).**

## Cleanup behavior

- **Splitter**
  - With `--date YYMMDD`: deletes only raw files whose stem contains that date, then writes raw for that date.
  - With no date: deletes all files in `raw_vectors/`, then writes all raw from alerts.
- **Classifier**
  - With `--date YYMMDD`: does not delete; only overwrites classified files for that date (same stem list as the raw files selected by date).
  - With no date: deletes all files in `classified/`, then writes one classified file per raw file.

So when the script is run as a single process (splitter then classifier), the set of raw files and the set of classified files are produced in one go from the same inputs; cleanup at the start of each step prevents stale output. The assumption that raw and classified can be “outdated” relative to each other does not apply to this single-script flow.

---

## Why the two dirs can still not match (when you check)

If you compare the two directories and see different files or different line counts, it is usually for one of these reasons:

### 1. Extension mismatch (if any raw files are still `*.json`)

- **vector_calc** and the **splitter** both use **`.jsonl`** only. If you have old `*.json` files in raw_vectors from before this change, the classifier will not see them → raw has a file, classified does not. Re-run the pipeline so raw is written as `.jsonl`.

### 2. Stem must have exactly 4 or 5 parts (parse_raw_filename)

- **parse_raw_filename** expects stem like `TICKER_YYMMDD_TF_START_END` (5 parts) or `TICKER_YYMMDD_START_END` (4 parts, tf = D).
- If a raw file has a stem with a different number of parts (e.g. ticker with underscore `SPDR_500` → 6 parts), it raises **ValueError** and that file is **skipped** → raw has a file, no classified file.

### 3. Different directories (path mismatch)

- Splitter writes to **alerts_dir.parent / "raw_vectors"**.
- The script passes **RAW_DIR = DATA_BASE/raw_vectors** to the classifier.
- These are the same only when alerts live under DATA_BASE (e.g. ALERTS_DIR = DATA_BASE/Alerts). If **ALERTS_DIR** is set to a path outside DATA_BASE, the splitter writes raw into a different tree than the one the classifier reads → you see “raw” and “classified” in different places and they don’t match.

### 4. Empty raw file

- If a raw file has zero valid lines, **load_segment** returns an empty DataFrame, **compute_records_for_segment** returns [], and the classifier **continues** without writing a classified file → raw file exists, no classified file. (The splitter does not write empty segments.)

### 5. Line count mismatch (same stem, different counts)

- In theory one raw line = one bar = one classified record. If you see the same stem but different line counts, the raw file may have malformed lines so that **pd.read_json(path, lines=True)** drops rows or fails in an unexpected way, or the pipeline was partially run / edited.

---

**Check what’s wrong:** run `python3 bin/check_raw_classified_match.py [RAW_DIR [CLASSIFIED_DIR]]`. It reports stems only in raw, only in classified, and line-count mismatches.

---

## Plotting: segments only, not full-vector files

**Segment** = file has a time range (START_END) in the name:
- **5 parts:** `TICKER_YYMMDD_TF_START_END` (e.g. `BOIL_260225_5_0935_1022`) — intraday; tf is in the stem.
- **4 parts:** `TICKER_YYMMDD_START_END` (e.g. `BOIL_260225_1450_1510`) — daily only; tf is not in the stem, it is implied `"D"`.

**Full vector** = whole-day file, no START_END in the name:
- **3 parts:** `TICKER_YYMMDD_TF` (e.g. `BOIL_260225_5`) — intraday full day.
- **2 parts:** `TICKER_YYMMDD` (e.g. `BOIL_260225`) — daily full day.

The plot uses only **segment** stems (4 or 5 parts). Any **full-vector** stem (2 or 3 parts) is ignored, so the plot always shows segment-level vectors only.
