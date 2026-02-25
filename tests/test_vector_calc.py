"""Tests for vector_calc: rounding, parsing, feature bounds/sanity."""
import math
import tempfile
import unittest
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from vector_calc.calc import (
    VectorKey,
    build_vector_keys,
    compute_vector_features,
    load_segment,
    parse_raw_filename,
)
from vector_calc.__main__ import round_floats


class TestRoundFloats(unittest.TestCase):
    def test_float(self):
        assert round_floats(1.23456, 3) == 1.235
        assert round_floats(-0.1234, 3) == -0.123

    def test_nan_unchanged(self):
        self.assertTrue(math.isnan(round_floats(float("nan"), 3)))

    def test_dict(self):
        out = round_floats({"a": 1.2356, "b": 2.0}, 3)
        self.assertEqual(out["a"], 1.236)
        self.assertIn(out["b"], (2.0, 2))  # round(2.0, 3) can be 2.0 or 2


class TestParseRawFilename(unittest.TestCase):
    def test_five_parts(self):
        p = Path("SPY_260222_5_0935_1022.json")
        ticker, date, tf, start, end = parse_raw_filename(p)
        assert ticker == "SPY" and date == "260222" and tf == "5" and start == "0935" and end == "1022"

    def test_four_parts_tf_D(self):
        p = Path("BOIL_260223_1450_1510.json")
        ticker, date, tf, start, end = parse_raw_filename(p)
        assert ticker == "BOIL" and date == "260223" and tf == "D" and start == "1450" and end == "1510"


class TestVectorKey(unittest.TestCase):
    def test_vector_id(self):
        v = VectorKey(ticker="SPY", tf="5", date="260225", ordinal=1)
        assert v.vector_id == "spy_5_260225_1"


class TestFeatureBounds(unittest.TestCase):
    """Correction tests: features stay in expected ranges."""
    def test_efficiency_in_range(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            f.write('{"time":"2026-02-22 09:30:00 UTC","close":100,"high":102,"low":99,"volume":1000}\n')
            f.write('{"time":"2026-02-22 09:35:00 UTC","close":101,"high":103,"low":100,"volume":1100}\n')
            path = Path(f.name)
        try:
            df = load_segment(path)
            vkey = VectorKey(ticker="X", tf="5", date="260222", ordinal=1)
            rec = compute_vector_features(df, vkey)
            assert "efficiency" in rec
            e = rec["efficiency"]
            if e == e:  # not nan
                assert 0 <= e <= 1.0
        finally:
            path.unlink()

    def test_bars_positive_duration_non_negative(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            f.write('{"time":"2026-02-22 09:30:00 UTC","close":100,"volume":1000}\n')
            f.write('{"time":"2026-02-22 09:35:00 UTC","close":101,"volume":1100}\n')
            path = Path(f.name)
        try:
            df = load_segment(path)
            vkey = VectorKey(ticker="X", tf="5", date="260222", ordinal=1)
            rec = compute_vector_features(df, vkey)
            assert rec["bars"] >= 1
            d = rec.get("duration_min")
            if d is not None and d == d:
                assert d >= 0
        finally:
            path.unlink()


class TestBuildVectorKeys(unittest.TestCase):
    def test_ordinals_per_day(self):
        with tempfile.TemporaryDirectory() as d:
            raw = Path(d) / "raw"
            raw.mkdir()
            (raw / "SPY_260222_5_0930_0940.json").write_text("[]")
            (raw / "SPY_260222_5_0940_1000.json").write_text("[]")
            (raw / "SPY_260222_5_1000_1010.json").write_text("[]")
            path_keys = build_vector_keys(sorted(raw.glob("*.json")))
            ordinals = [vkey.ordinal for _p, vkey in path_keys]
            assert ordinals == [1, 2, 3]
