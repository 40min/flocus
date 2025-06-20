import pytest
from app.api.schemas.utils import ensure_time_windows_do_not_overlap, HasTimeWindow

class TestEnsureTimeWindowsDoNotOverlap:
    def test_empty_list(self):
        ensure_time_windows_do_not_overlap([])
        # No assertion needed if no exception is raised

    def test_single_window(self):
        ensure_time_windows_do_not_overlap([HasTimeWindow(start_time=0, end_time=60)])

    def test_non_overlapping_windows_separate(self):
        windows = [
            HasTimeWindow(start_time=0, end_time=60),
            HasTimeWindow(start_time=70, end_time=120),
        ]
        ensure_time_windows_do_not_overlap(windows)

    def test_adjacent_windows(self):
        windows = [
            HasTimeWindow(start_time=0, end_time=60),
            HasTimeWindow(start_time=60, end_time=120),
        ]
        ensure_time_windows_do_not_overlap(windows)

    def test_overlapping_windows_simple(self):
        windows = [
            HasTimeWindow(start_time=0, end_time=60),
            HasTimeWindow(start_time=30, end_time=90),
        ]
        with pytest.raises(ValueError) as excinfo:
            ensure_time_windows_do_not_overlap(windows)
        assert "Time windows overlap" in str(excinfo.value)
        assert "(0-60)" in str(excinfo.value)
        assert "(30-90)" in str(excinfo.value)

    def test_overlapping_windows_containment(self):
        windows = [
            HasTimeWindow(start_time=0, end_time=120),
            HasTimeWindow(start_time=30, end_time=90),
        ]
        with pytest.raises(ValueError) as excinfo:
            ensure_time_windows_do_not_overlap(windows)
        assert "Time windows overlap" in str(excinfo.value)
        assert "(0-120)" in str(excinfo.value)
        assert "(30-90)" in str(excinfo.value)

    def test_overlapping_windows_containment_reversed_input_order(self):
        windows = [
            HasTimeWindow(start_time=30, end_time=90),
            HasTimeWindow(start_time=0, end_time=120),
        ]
        with pytest.raises(ValueError) as excinfo:
            ensure_time_windows_do_not_overlap(windows)
        assert "Time windows overlap" in str(excinfo.value)
        assert "(0-120)" in str(excinfo.value)
        assert "(30-90)" in str(excinfo.value)

    def test_overlapping_windows_unsorted(self):
        windows = [
            HasTimeWindow(start_time=100, end_time=120),
            HasTimeWindow(start_time=0, end_time=60),
            HasTimeWindow(start_time=50, end_time=110),
        ]
        with pytest.raises(ValueError) as excinfo:
            ensure_time_windows_do_not_overlap(windows)
        assert "Time windows overlap" in str(excinfo.value)
        assert "(0-60)" in str(excinfo.value)
        assert "(50-110)" in str(excinfo.value)

    def test_multiple_non_overlapping_windows(self):
        windows = [
            HasTimeWindow(start_time=0, end_time=30),
            HasTimeWindow(start_time=80, end_time=100),
            HasTimeWindow(start_time=40, end_time=70),
        ]
        ensure_time_windows_do_not_overlap(windows)

    def test_identical_windows(self):
        windows = [
            HasTimeWindow(start_time=0, end_time=60),
            HasTimeWindow(start_time=0, end_time=60),
        ]
        with pytest.raises(ValueError) as excinfo:
            ensure_time_windows_do_not_overlap(windows)
        assert "Time windows overlap" in str(excinfo.value)
        assert str(excinfo.value).count("(0-60)") == 2

    def test_complex_overlapping_case(self):
        windows = [
            HasTimeWindow(start_time=10, end_time=20),
            HasTimeWindow(start_time=30, end_time=40),
            HasTimeWindow(start_time=15, end_time=25),
            HasTimeWindow(start_time=50, end_time=60),
            HasTimeWindow(start_time=35, end_time=45),
        ]
        with pytest.raises(ValueError) as excinfo:
            ensure_time_windows_do_not_overlap(windows)
        assert "Time windows overlap" in str(excinfo.value)
        assert "(10-20)" in str(excinfo.value)
        assert "(15-25)" in str(excinfo.value)

    def test_touching_is_not_overlapping(self):
        windows = [
            HasTimeWindow(start_time=0, end_time=60),
            HasTimeWindow(start_time=60, end_time=120),
        ]
        ensure_time_windows_do_not_overlap(windows)

    def test_one_window_completely_within_another_input_order_1(self):
        windows = [
            HasTimeWindow(start_time=0, end_time=120),
            HasTimeWindow(start_time=30, end_time=90),
        ]
        with pytest.raises(ValueError) as excinfo:
            ensure_time_windows_do_not_overlap(windows)
        assert "Time windows overlap: (0-120) and (30-90)" in str(excinfo.value)

    def test_one_window_completely_within_another_input_order_2(self):
        windows = [
            HasTimeWindow(start_time=30, end_time=90),
            HasTimeWindow(start_time=0, end_time=120),
        ]
        with pytest.raises(ValueError) as excinfo:
            ensure_time_windows_do_not_overlap(windows)
        assert "Time windows overlap: (0-120) and (30-90)" in str(excinfo.value)

    def test_end_time_equals_next_start_time_multiple(self):
        windows = [
            HasTimeWindow(start_time=0, end_time=60),
            HasTimeWindow(start_time=60, end_time=120),
            HasTimeWindow(start_time=120, end_time=180),
        ]
        ensure_time_windows_do_not_overlap(windows)

    def test_real_scenario_overlapping(self):
        windows = [
            HasTimeWindow(start_time=540, end_time=600),
            HasTimeWindow(start_time=570, end_time=630)
        ]
        with pytest.raises(ValueError) as excinfo:
            ensure_time_windows_do_not_overlap(windows)
        assert "Time windows overlap: (540-600) and (570-630)" in str(excinfo.value)

    def test_real_scenario_non_overlapping(self):
        windows = [
            HasTimeWindow(start_time=540, end_time=600),
            HasTimeWindow(start_time=600, end_time=660)
        ]
        ensure_time_windows_do_not_overlap(windows)
