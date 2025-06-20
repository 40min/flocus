from typing import List, Any
from pydantic import BaseModel

# Define a protocol or base class for objects that have start_time and end_time
class HasTimeWindow(BaseModel):
    start_time: int
    end_time: int

def ensure_time_windows_do_not_overlap(time_windows_list: List[HasTimeWindow]) -> None:
    """Checks if any time windows in the list overlap. Raises ValueError if they do."""
    if not time_windows_list or len(time_windows_list) < 2:
        return  # No overlap possible with 0 or 1 window

    # Sort by start_time to check adjacent windows
    sorted_windows = sorted(time_windows_list, key=lambda tw: tw.start_time)

    for i in range(len(sorted_windows) - 1):
        current_window = sorted_windows[i]
        next_window = sorted_windows[i + 1]
        # Check for overlap: next window starts before current one ends
        if next_window.start_time < current_window.end_time:
            raise ValueError(
                f"Time windows overlap: ({current_window.start_time}-{current_window.end_time}) and "
                f"({next_window.start_time}-{next_window.end_time})"
            )
