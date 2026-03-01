"""Tests for daily_alerts_splitter.splitter."""
import io
import tempfile
import unittest
from pathlib import Path

# Run from vectorGen so package is on path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from daily_alerts_splitter.splitter import (
    _parse_time,
    _time_to_hhmm,
    is_edge,
    edge_indices,
    segments_from_edges,
    _rev_dir,
    _rev_avwap,
    sanity_check_segment,
    load_bars,
    run_file,
)


class TestParseTime(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(_parse_time("2026-02-22 14:30:00 UTC").strftime("%H%M"), "1430")
        self.assertEqual(_parse_time("2026-01-01 09:35:00 UTC").strftime("%Y-%m-%d"), "2026-01-01")

    def test_invalid(self):
        self.assertIsNone(_parse_time(""))
        self.assertIsNone(_parse_time("not a date"))
        self.assertIsNone(_parse_time(None))


class TestTimeToHhmm(unittest.TestCase):
    def test_format(self):
        from datetime import datetime
        self.assertEqual(_time_to_hhmm(datetime(2026, 2, 22, 9, 35)), "0935")
        self.assertEqual(_time_to_hhmm(datetime(2026, 2, 22, 16, 0)), "1600")


class TestIsEdge(unittest.TestCase):
    def test_edge(self):
        self.assertTrue(is_edge({"revDir": 1}))
        self.assertTrue(is_edge({"revDir": -1}))
        self.assertTrue(is_edge({"revDir": "1"}))

    def test_not_edge(self):
        self.assertFalse(is_edge({"revDir": 0}))
        self.assertFalse(is_edge({}))
        self.assertFalse(is_edge({"revDir": None}))


class TestEdgeIndices(unittest.TestCase):
    def test_two_edges(self):
        bars = [
            {"revDir": 0},
            {"revDir": 1},
            {"revDir": 0},
            {"revDir": -1},
        ]
        self.assertEqual(edge_indices(bars), [1, 3])

    def test_no_edges(self):
        self.assertEqual(edge_indices([{"revDir": 0}, {"revDir": 0}]), [])


class TestSegmentsFromEdges(unittest.TestCase):
    def test_inclusive_overlap(self):
        bars = [
            {"revDir": 1, "time": "2026-02-22 09:30:00 UTC"},
            {"revDir": 0, "time": "2026-02-22 09:35:00 UTC"},
            {"revDir": -1, "time": "2026-02-22 09:40:00 UTC"},
        ]
        edge_ix = [0, 2]
        segs = segments_from_edges(bars, edge_ix)
        self.assertEqual(len(segs), 2)
        self.assertEqual(len(segs[0]), 3)
        self.assertEqual(len(segs[1]), 1)
        self.assertEqual(segs[0][0]["revDir"], 1)
        self.assertEqual(segs[0][-1]["revDir"], -1)
        self.assertEqual(segs[0][-1], segs[1][0])

    def test_two_segments(self):
        bars = [
            {"revDir": 1},
            {"revDir": 0},
            {"revDir": -1},
            {"revDir": 0},
            {"revDir": 1},
        ]
        segs = segments_from_edges(bars, [0, 2, 4])
        self.assertEqual(len(segs), 3)
        self.assertEqual(len(segs[0]), 3)
        self.assertEqual(len(segs[1]), 3)
        self.assertEqual(len(segs[2]), 1)
        self.assertEqual(segs[0][-1], segs[1][0])
        self.assertEqual(segs[1][-1], segs[2][0])


class TestRevDirAvwap(unittest.TestCase):
    def test_rev_dir(self):
        self.assertEqual(_rev_dir({"revDir": 1}), 1)
        self.assertEqual(_rev_dir({"revDir": -1}), -1)
        self.assertIsNone(_rev_dir({}))
        self.assertIsNone(_rev_dir({"revDir": 0}))

    def test_rev_avwap(self):
        self.assertEqual(_rev_avwap({"REV_avwap": 10.5}), 10.5)
        self.assertIsNone(_rev_avwap({}))
        self.assertIsNone(_rev_avwap({"REV_avwap": float("nan")}))


class TestSanityCheckSegment(unittest.TestCase):
    def test_opposite_revDir_ok(self):
        seg = [
            {"revDir": 1, "REV_avwap": 10.0, "time": "2026-02-22 09:30:00 UTC"},
            {"revDir": -1, "REV_avwap": 11.0, "time": "2026-02-22 09:40:00 UTC"},
        ]
        errs = []
        sanity_check_segment(seg, "TEST_0930_0940", log_err=errs.append)
        self.assertEqual(len(errs), 0)

    def test_same_revDir_logs(self):
        seg = [
            {"revDir": 1, "REV_avwap": 10.0},
            {"revDir": 1, "REV_avwap": 11.0},
        ]
        errs = []
        sanity_check_segment(seg, "TEST_0930_0940", log_err=errs.append)
        self.assertGreater(len(errs), 0)
        self.assertIn("opposite", errs[0])

    def test_up_vector_price_down_logs(self):
        seg = [
            {"revDir": 1, "REV_avwap": 12.0},
            {"revDir": -1, "REV_avwap": 11.0},
        ]
        errs = []
        sanity_check_segment(seg, "TEST_0930_0940", log_err=errs.append)
        self.assertGreater(len(errs), 0)
        self.assertIn("REV_avwap", errs[0])


class TestLoadBarsAndRunFile(unittest.TestCase):
    def test_load_bars_sorts_by_time(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            f.write('{"time":"2026-02-22 09:35:00 UTC","bar_index":2}\n')
            f.write('{"time":"2026-02-22 09:30:00 UTC","bar_index":1}\n')
            path = Path(f.name)
        try:
            bars = load_bars(path)
            self.assertEqual(len(bars), 2)
            self.assertEqual(bars[0]["bar_index"], 1)
            self.assertEqual(bars[1]["bar_index"], 2)
        finally:
            path.unlink()

    def test_run_file_creates_vectors(self):
        with tempfile.TemporaryDirectory() as d:
            alerts_dir = Path(d) / "alerts"
            alerts_dir.mkdir()
            raw_dir = Path(d) / "raw_vectors"
            # One segment: revDir 1 -> -1 (closing edge is opposite of start)
            alert_path = alerts_dir / "SPY_260222_5.json"
            alert_path.write_text(
                '{"time":"2026-02-22 09:30:00 UTC","bar_index":1,"revDir":1,"REV_avwap":100.0}\n'
                '{"time":"2026-02-22 09:35:00 UTC","bar_index":2,"revDir":0,"REV_avwap":101.0}\n'
                '{"time":"2026-02-22 09:40:00 UTC","bar_index":3,"revDir":-1,"REV_avwap":102.0}\n'
            )
            written = run_file(alert_path, raw_dir, "SPY_260222_5")
            self.assertEqual(len(written), 2)  # segment 1→-1 (3 bars) + tail from closing bar to end (1 bar)
            self.assertTrue(written[0].name.startswith("SPY_260222_5_"))
            self.assertTrue(written[0].name.endswith(".jsonl"))
            content0 = written[0].read_text()
            self.assertEqual(content0.count("\n"), 3)


if __name__ == "__main__":
    unittest.main()
