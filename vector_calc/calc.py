"""Compute per-vector features from raw_vectors JSONL segments."""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, List, Tuple

import numpy as np
import pandas as pd

# Thresholds for active_frac / density metrics
T_TREND = 50.0
T_REGIME = 50.0
T_SMA = 50.0
SHOCK_T = 50.0


@dataclass
class VectorKey:
    ticker: str
    tf: str
    date: str  # yymmdd
    ordinal: int

    @property
    def vector_id(self) -> str:
        """Lowercase ticker, tf, yymmdd, ordinal."""
        return f"{self.ticker.lower()}_{self.tf}_{self.date}_{self.ordinal}"


def _parse_time(s: str) -> datetime | None:
    try:
        return datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S")
    except Exception:
        return None


def load_segment(path: Path) -> pd.DataFrame:
    """Load one raw_vectors JSONL file into a DataFrame sorted by time."""
    if not path.is_file():
        return pd.DataFrame()
    df = pd.read_json(path, lines=True)
    if "time" in df.columns:
        dt = pd.to_datetime(df["time"], errors="coerce")
        df = df.assign(_dt=dt).sort_values("_dt").drop(columns=["_dt"])
    return df.reset_index(drop=True)


def _safe_series(df: pd.DataFrame, name: str) -> pd.Series:
    return df[name].astype(float) if name in df.columns else pd.Series(dtype=float)


def _identity_features(df: pd.DataFrame, vkey: VectorKey) -> dict:
    n = len(df)
    if n == 0:
        return {}
    dt = pd.to_datetime(df["time"], errors="coerce") if "time" in df.columns else None
    if dt is not None and not dt.isna().all():
        t0 = dt.iloc[0]
        t1 = dt.iloc[-1]
        duration_min = (t1 - t0).total_seconds() / 60 if pd.notna(t0) and pd.notna(t1) else math.nan
        start_time = str(df["time"].iloc[0])
    else:
        duration_min = math.nan
        start_time = ""
    return {
        "vector_id": vkey.vector_id,
        "ticker": vkey.ticker,
        "tf": vkey.tf,
        "date": vkey.date,
        "ordinal": vkey.ordinal,
        "start_time": start_time,
        "duration_min": duration_min,
        "bars": n,
    }


def _geometry_features(df: pd.DataFrame) -> dict:
    if df.empty or "close" not in df.columns:
        return {}
    close = df["close"].astype(float)
    high = df["high"].astype(float) if "high" in df.columns else close
    low = df["low"].astype(float) if "low" in df.columns else close
    p0 = float(close.iloc[0])
    p1 = float(close.iloc[-1])
    delta_d = p1 - p0
    delta_pct = (delta_d / p0 * 100.0) if p0 != 0 else math.nan
    dt = pd.to_datetime(df["time"], errors="coerce") if "time" in df.columns else None
    if dt is not None and not dt.isna().all():
        duration_min = (dt.iloc[-1] - dt.iloc[0]).total_seconds() / 60
    else:
        duration_min = math.nan
    slope_pct_per_min = delta_pct / duration_min if duration_min and duration_min != 0 else math.nan
    hi = float(high.max())
    lo = float(low.min())
    denom_range = hi - lo
    range_pct = (denom_range / p0 * 100.0) if p0 != 0 else math.nan
    efficiency = abs(delta_d) / denom_range if denom_range != 0 else math.nan
    return {
        "p0_close": p0,
        "p1_close": p1,
        "delta_pct": delta_pct,
        "slope_pctPerMin": slope_pct_per_min,
        "range_pct": range_pct,
        "efficiency": efficiency,
    }


def _volume_features(df: pd.DataFrame) -> dict:
    if df.empty:
        return {}
    vol = _safe_series(df, "volume")
    close = _safe_series(df, "close")
    dollar_vol = close * vol
    dollarVol_sum = float(dollar_vol.sum(skipna=True))
    n = len(vol)
    if n >= 2 and vol.notna().any():
        x = np.arange(n, dtype=float)
        y = vol.to_numpy(dtype=float)
        # Linear regression slope y ~ a + b*x
        x_mean = x.mean()
        y_mean = np.nanmean(y)
        denom = np.nansum((x - x_mean) ** 2)
        if denom > 0:
            vol_slope = float(np.nansum((x - x_mean) * (y - y_mean)) / denom)
        else:
            vol_slope = math.nan
    else:
        vol_slope = math.nan
    if vol.notna().any():
        median_vol = float(np.nanmedian(vol.to_numpy(dtype=float)))
        vmax = float(np.nanmax(vol.to_numpy(dtype=float)))
        vol_peak_ratio = vmax / median_vol if median_vol != 0 else math.nan
    else:
        vol_peak_ratio = math.nan
    return {
        "dollarVol_sum": dollarVol_sum,
        "vol_slope": vol_slope,
        "vol_peak_ratio": vol_peak_ratio,
    }


def _atr_features(df: pd.DataFrame) -> dict:
    atr = _safe_series(df, "atrRatio")
    if atr.empty:
        return {"atrRatio_peak": math.nan, "atrRatio_q50": math.nan}
    arr = atr.to_numpy(dtype=float)
    if arr.size == 0:
        return {"atrRatio_peak": math.nan, "atrRatio_q50": math.nan}
    return {
        "atrRatio_peak": float(np.nanmax(arr)),
        "atrRatio_q50": float(np.nanmedian(arr)),
    }


def _active_frac_run_max(arr: np.ndarray, threshold: float) -> Tuple[float, int]:
    """Return active_frac and run_max for arr >= threshold."""
    if arr.size == 0:
        return 0.0, 0
    mask = np.where(np.isfinite(arr), arr >= threshold, False)
    n = mask.size
    active_frac = float(mask.sum() / n) if n > 0 else 0.0
    run_max = 0
    current = 0
    for v in mask:
        if v:
            current += 1
            if current > run_max:
                run_max = current
        else:
            current = 0
    return active_frac, run_max


def _time_to_peak(arr: np.ndarray) -> float:
    """argmax(arr) / (n-1) in [0,1], or NaN."""
    n = arr.size
    if n == 0 or not np.isfinite(arr).any():
        return math.nan
    idx = int(np.nanargmax(arr))
    return float(idx / (n - 1)) if n > 1 else 0.0


def _trend_shock_regime_features(df: pd.DataFrame) -> dict:
    out: dict = {}
    # Shock: tShockScoreTot
    shock = _safe_series(df, "tShockScoreTot")
    s_arr = shock.to_numpy(dtype=float)
    if s_arr.size:
        out["tShockScoreTot_peak"] = float(np.nanmax(s_arr))
        density, _ = _active_frac_run_max(s_arr, SHOCK_T)
        out["tShockScoreTot_density"] = density
        out["tShock_time_to_peak"] = _time_to_peak(s_arr)
    else:
        out["tShockScoreTot_peak"] = math.nan
        out["tShockScoreTot_density"] = 0.0
        out["tShock_time_to_peak"] = math.nan
    # Trend persistence: tTrendAbs, inTrendScore
    tTrendAbs = _safe_series(df, "tTrendAbs")
    ta_arr = tTrendAbs.to_numpy(dtype=float)
    out["tTrendAbs_area"] = float(np.nansum(ta_arr)) if ta_arr.size else 0.0
    active_frac_trend, _ = _active_frac_run_max(ta_arr, T_TREND) if ta_arr.size else (0.0, 0)
    out["tTrendAbs_active_frac"] = active_frac_trend
    inTrendScore = _safe_series(df, "inTrendScore")
    it_arr = inTrendScore.to_numpy(dtype=float)
    out["inTrendScore_area"] = float(np.nansum(it_arr)) if it_arr.size else 0.0
    # Regime and SMA
    tRegimeAbs = _safe_series(df, "tRegimeAbs")
    tr_arr = tRegimeAbs.to_numpy(dtype=float)
    active_frac_regime, _ = _active_frac_run_max(tr_arr, T_REGIME) if tr_arr.size else (0.0, 0)
    out["tRegimeAbs_active_frac"] = active_frac_regime
    smaScore = _safe_series(df, "smaCrossScoreInd")
    sma_arr = smaScore.to_numpy(dtype=float)
    active_frac_sma, _ = _active_frac_run_max(sma_arr, T_SMA) if sma_arr.size else (0.0, 0)
    out["smaCrossScoreInd_active_frac"] = active_frac_sma
    return out


def _avwap_features(df: pd.DataFrame) -> dict:
    """REV_avwap structure features."""
    close = _safe_series(df, "close")
    rev = _safe_series(df, "REV_avwap")
    if close.empty or rev.empty:
        return {
            "rev_avwap_side_frac": 0.0,
            "rev_avwap_cross_count": 0,
            "rev_avwap_dist_abs_mean_pct": math.nan,
        }
    close_arr = close.to_numpy(dtype=float)
    rev_arr = rev.to_numpy(dtype=float)
    mask = np.isfinite(close_arr) & np.isfinite(rev_arr) & (rev_arr != 0)
    if not mask.any():
        return {
            "rev_avwap_side_frac": 0.0,
            "rev_avwap_cross_count": 0,
            "rev_avwap_dist_abs_mean_pct": math.nan,
        }
    d = close_arr[mask] - rev_arr[mask]
    # side fraction: above REV_avwap
    side_frac = float((d > 0).sum() / d.size)
    # cross count: sign changes
    signs = np.sign(d)
    prev = signs[:-1]
    curr = signs[1:]
    cross = int(np.sum((prev != 0) & (curr != 0) & (prev != curr)))
    dist_abs_mean_pct = float(np.nanmean(np.abs(d) / rev_arr[mask]) * 100.0)
    return {
        "rev_avwap_side_frac": side_frac,
        "rev_avwap_cross_count": cross,
        "rev_avwap_dist_abs_mean_pct": dist_abs_mean_pct,
    }


def _htf_vwap_features(df: pd.DataFrame) -> dict:
    """Optional HTF VWAP context features."""
    close = _safe_series(df, "close")
    htf = _safe_series(df, "htfVwap")
    if close.empty or htf.empty:
        return {
            "htfVwap_side_frac": 0.0,
            "htfVwap_cross_count": 0,
        }
    c_arr = close.to_numpy(dtype=float)
    h_arr = htf.to_numpy(dtype=float)
    mask = np.isfinite(c_arr) & np.isfinite(h_arr)
    if not mask.any():
        return {
            "htfVwap_side_frac": 0.0,
            "htfVwap_cross_count": 0,
        }
    d = c_arr[mask] - h_arr[mask]
    side_frac = float((d > 0).sum() / d.size)
    signs = np.sign(d)
    prev = signs[:-1]
    curr = signs[1:]
    cross = int(np.sum((prev != 0) & (curr != 0) & (prev != curr)))
    return {
        "htfVwap_side_frac": side_frac,
        "htfVwap_cross_count": cross,
    }


def compute_vector_features(df: pd.DataFrame, vkey: VectorKey) -> dict:
    """Compute full feature dict for one vector (one raw segment)."""
    base = _identity_features(df, vkey)
    if not base:
        return {}
    features = {}
    features.update(_geometry_features(df))
    features.update(_volume_features(df))
    features.update(_atr_features(df))
    features.update(_trend_shock_regime_features(df))
    features.update(_avwap_features(df))
    features.update(_htf_vwap_features(df))
    base.update(features)
    return base


def parse_raw_filename(path: Path) -> Tuple[str, str, str, str, str]:
    """Parse raw vector filename -> (ticker, date, tf, start_hhmm, end_hhmm).

    Supports:
    - TICKER_YYMMDD_TF_START_END (e.g. SPY_260222_5_0935_1022)
    - TICKER_YYMMDD_START_END    (e.g. BOIL_260223_1450_1510) -> tf = \"D\" (daily)
    """
    stem = path.stem
    parts = stem.split("_")
    if len(parts) == 5:
        ticker, date, tf, start_hhmm, end_hhmm = parts
    elif len(parts) == 4:
        ticker, date, start_hhmm, end_hhmm = parts
        tf = "D"
    else:
        raise ValueError(f"Unexpected raw vector filename: {path.name}")
    return ticker, date, tf, start_hhmm, end_hhmm


def build_vector_keys(raw_paths: Iterable[Path]) -> List[Tuple[Path, VectorKey]]:
    """Assign ordinals per (ticker, date, tf) and return (path, VectorKey) list."""
    # Group by (ticker, date, tf)
    groups: dict[Tuple[str, str, str], List[Tuple[Path, str]]] = {}
    for p in raw_paths:
        ticker, date, tf, start_hhmm, _ = parse_raw_filename(p)
        key = (ticker, date, tf)
        groups.setdefault(key, []).append((p, start_hhmm))
    result: List[Tuple[Path, VectorKey]] = []
    for (ticker, date, tf), items in groups.items():
        # Sort by start_hhmm for ordinal within day
        items_sorted = sorted(items, key=lambda x: x[1])
        for ordinal, (p, _start) in enumerate(items_sorted, start=1):
            vkey = VectorKey(ticker=ticker, tf=tf, date=date, ordinal=ordinal)
            result.append((p, vkey))
    return result

