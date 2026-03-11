"""Find the best virtual trade (long or short) in a single raw-vector segment."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

TIME_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})")
TRADE_SIZE = 500.0
MIN_PNL = 18.0
RTH_START = (9, 30)
RTH_END = (16, 0)


def _parse_time(s: str) -> Optional[datetime]:
    if not s or not isinstance(s, str):
        return None
    m = TIME_RE.match(s.strip()[:19])
    if not m:
        return None
    return datetime(*map(int, m.groups()))


def _in_rth(dt: datetime) -> bool:
    hm = (dt.hour, dt.minute)
    return RTH_START <= hm <= RTH_END


def _pnl(entry: float, exit_: float, side: str) -> float:
    if entry == 0:
        return 0.0
    if side == "long":
        return (exit_ - entry) / entry * TRADE_SIZE
    return (entry - exit_) / entry * TRADE_SIZE


def find_trades_for_segment(
    bars: list[dict],
    deadline_dt: Optional[datetime],
    vector_id: str,
    asset: str,
    date: str,
    tf: str,
) -> Optional[dict]:
    """Return the single best trade (highest pnl) or None.

    Rules:
      - Entry bar index in segment >= 1 (not the first bar).
      - Exit bar index > entry bar index.
      - Exit time <= deadline_dt (if provided).
      - Both entry and exit must be within RTH (09:30–16:00).
      - PnL >= MIN_PNL for $500 trade size.
      - At most one trade per segment (highest pnl wins).
    """
    if len(bars) < 3:
        return None

    times = []
    closes = []
    for b in bars:
        t = _parse_time(b.get("time", ""))
        c = b.get("close")
        if c is None or t is None:
            return None
        try:
            closes.append(float(c))
        except (TypeError, ValueError):
            return None
        times.append(t)

    best = None
    for i in range(1, len(bars)):
        if not _in_rth(times[i]):
            continue
        for j in range(i + 1, len(bars)):
            if not _in_rth(times[j]):
                continue
            if deadline_dt is not None and times[j] > deadline_dt:
                break
            for side in ("long", "short"):
                p = _pnl(closes[i], closes[j], side)
                if p >= MIN_PNL and (best is None or p > best["pnl"]):
                    dur_bars = j - i + 1
                    dur_min = (times[j] - times[i]).total_seconds() / 60.0
                    best = {
                        "vector_id": vector_id,
                        "bar_start": i,
                        "bar_end": j,
                        "asset": asset,
                        "date": date,
                        "tf": tf,
                        "entry_time": times[i].strftime("%Y-%m-%d %H:%M:%S"),
                        "duration_bars": dur_bars,
                        "duration_minutes": dur_min,
                        "entry_price": closes[i],
                        "exit_price": closes[j],
                        "pnl": round(p, 2),
                        "side": side,
                    }
    return best


def get_deadline_for_current_vec(
    current_bars: list[dict],
    next_bars: Optional[list[dict]],
) -> Optional[datetime]:
    """Deadline = next vector's 2nd bar time, or last bar if < 2 bars. None if no next vec."""
    if not next_bars:
        return None
    idx = min(1, len(next_bars) - 1)
    return _parse_time(next_bars[idx].get("time", ""))
