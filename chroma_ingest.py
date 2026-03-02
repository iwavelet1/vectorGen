#!/usr/bin/env python3
"""Load classified JSONL records into Chroma DB (single collection intra_date_v1).
Embedding = 10 numeric features; metadata = rest. ID = segment_id + '_' + closing_bar_index.
Missing/NaN in embed fields -> 0.0. Use collection.upsert so latest overwrites.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

EMBED_FIELDS = [
    "delta_pct",
    "slope_pctPerMin",
    "efficiency",
    "rev_avwap_side_frac",
    "rev_avwap_cross_count",
    "rev_avwap_dist_abs_mean_pct",
    "tShockScoreTot_density",
    "tTrendAbs_area",
    "inTrendScore_area",
    "atrRatio_q50",
]

COLLECTION_NAME = "intra_date_v1"
BATCH_SIZE = 1000


def _safe_float(x, default: float = 0.0) -> float:
    if x is None:
        return default
    if isinstance(x, (int, float)) and math.isfinite(x):
        return float(x)
    return default


def _embed_from_record(rec: dict) -> list[float]:
    return [_safe_float(rec.get(f)) for f in EMBED_FIELDS]


def _chroma_safe_value(v) -> str | int | float | bool | None:
    """Chroma metadata: str, int, float, bool, or list of str. Coerce or drop."""
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        if math.isfinite(v):
            return v
        return None  # drop NaN/Inf
    if isinstance(v, str):
        return v
    if isinstance(v, list) and all(isinstance(x, str) for x in v):
        return v
    return str(v)


def _metadata_from_record(rec: dict) -> dict:
    out = {}
    for k, v in rec.items():
        if k in EMBED_FIELDS:
            continue
        safe = _chroma_safe_value(v)
        if safe is not None:
            out[k] = safe
    return out


def main() -> None:
    p = argparse.ArgumentParser(description="Ingest classified JSONL into Chroma (intra_dat_v1).")
    p.add_argument("--classified-dir", required=True, help="Path to classified/.")
    p.add_argument("--chroma-dir", default="", help="Chroma persistent path (default: classified_dir.parent / chroma).")
    p.add_argument("--date", default="", help="Only ingest files containing this YYMMDD in name.")
    args = p.parse_args()

    classified_dir = Path(args.classified_dir)
    if not classified_dir.is_dir():
        p.error(f"classified-dir not found: {classified_dir}")

    chroma_dir = Path(args.chroma_dir) if args.chroma_dir.strip() else classified_dir.parent / "chroma"
    chroma_dir.mkdir(parents=True, exist_ok=True)

    date_filter = args.date.strip() or None
    paths = sorted(classified_dir.glob("*.jsonl"))
    if date_filter:
        paths = [f for f in paths if f"_{date_filter}_" in f.stem or f.stem.endswith(f"_{date_filter}")]

    if not paths:
        print("No classified files to ingest.")
        return

    import chromadb

    client = chromadb.PersistentClient(path=str(chroma_dir))
    collection = client.get_or_create_collection(name=COLLECTION_NAME, metadata={"description": "intraday vectors v1"})

    total = 0
    ids_batch: list[str] = []
    embeddings_batch: list[list[float]] = []
    metadatas_batch: list[dict] = []

    for fp in paths:
        text = fp.read_text(encoding="utf-8")
        for line in text.strip().splitlines():
            if not line.strip():
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            seg_id = rec.get("segment_id")
            closing_ix = rec.get("closing_bar_index")
            if seg_id is None or closing_ix is None:
                continue
            doc_id = f"{seg_id}_{closing_ix}"
            ids_batch.append(doc_id)
            embeddings_batch.append(_embed_from_record(rec))
            metadatas_batch.append(_metadata_from_record(rec))

            if len(ids_batch) >= BATCH_SIZE:
                collection.upsert(ids=ids_batch, embeddings=embeddings_batch, metadatas=metadatas_batch)
                total += len(ids_batch)
                ids_batch, embeddings_batch, metadatas_batch = [], [], []

    if ids_batch:
        collection.upsert(ids=ids_batch, embeddings=embeddings_batch, metadatas=metadatas_batch)
        total += len(ids_batch)

    print(f"Ingested {total} records into {chroma_dir} collection '{COLLECTION_NAME}'.")


if __name__ == "__main__":
    main()
