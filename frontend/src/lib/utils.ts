import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { cloneDeep, isNumber, isArray, min, max } from "lodash-es";
import { TimeWindowCreateRequest } from "../types/timeWindow";
import { TimeWindowAllocation } from "../types/dailyPlan";
// Import date utilities from the new Day.js-based utilities
import {
  utcToLocal,
  localToUtc,
  formatDueDate,
  formatDateTime,
  getCurrentTimeInMinutes,
  hhMMToMinutes,
  formatMinutesToHHMM,
  minutesToDate,
  calculateDuration,
  isValidTimeFormat,
  roundToInterval,
  normalizeTimeMinutes,
  formatDurationFromMinutes,
  formatDurationFromSeconds,
} from "../utils/dateUtils";

// ===== STYLING UTILITIES =====
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ===== TIME WINDOW UTILITIES =====

/**
 * Check if a new time window overlaps with existing time windows
 * @param newTimeWindow - New time window to check
 * @param existingTimeWindows - Array of existing time window allocations
 * @returns True if overlap detected, false otherwise
 */
export function checkTimeWindowOverlap(
  newTimeWindow: TimeWindowCreateRequest,
  existingTimeWindows: TimeWindowAllocation[]
): boolean {
  if (!newTimeWindow || !isArray(existingTimeWindows)) {
    return false;
  }

  const newStart = newTimeWindow.start_time;
  const newEnd = newTimeWindow.end_time;

  // Validate new time window
  if (!isNumber(newStart) || !isNumber(newEnd) || newStart >= newEnd) {
    return false;
  }

  return existingTimeWindows.some((allocation) => {
    if (!allocation?.time_window) return false;

    const { start_time: existingStart, end_time: existingEnd } =
      allocation.time_window;

    // Validate existing time window
    if (!isNumber(existingStart) || !isNumber(existingEnd)) {
      return false;
    }

    // Check for overlap: (start1 < end2) && (end1 > start2)
    return newStart < existingEnd && newEnd > existingStart;
  });
}

export const recalculateTimeWindows = (
  timeWindows: TimeWindowAllocation[]
): TimeWindowAllocation[] => {
  if (!isArray(timeWindows) || timeWindows.length === 0) {
    return [];
  }

  let currentTime = timeWindows[0].time_window.start_time;
  const maxEndTime = 24 * 60 - 1; // 23:59 in minutes
  const result: TimeWindowAllocation[] = [];

  for (const allocation of timeWindows) {
    const duration =
      allocation.time_window.end_time - allocation.time_window.start_time;

    // Check if we've reached the end of the day
    if (currentTime >= maxEndTime) {
      break;
    }

    // Adjust duration if it would exceed the boundary
    const availableTime = maxEndTime - currentTime;
    const adjustedDuration = min([duration, availableTime]) ?? duration;

    const newStartTime = currentTime;
    const newEndTime = currentTime + adjustedDuration;

    result.push({
      ...allocation,
      time_window: {
        ...allocation.time_window,
        start_time: newStartTime,
        end_time: newEndTime,
      },
    });

    currentTime = newEndTime;

    // If we've reached the boundary, stop processing further windows
    if (currentTime >= maxEndTime) {
      break;
    }
  }

  return result;
};

export const recalculateTimeWindowsWithGapFitting = (
  timeWindows: TimeWindowAllocation[],
  draggedIndex: number
): TimeWindowAllocation[] | null => {
  if (!isArray(timeWindows) || timeWindows.length === 0) {
    return [];
  }

  const result = cloneDeep(timeWindows);
  const draggedWindow = result[draggedIndex];
  const originalDuration =
    draggedWindow.time_window.end_time - draggedWindow.time_window.start_time;

  const maxEndTime = 24 * 60 - 1; // 23:59 in minutes

  // Calculate the available time slot for the dragged window
  let availableStartTime: number;
  let availableEndTime: number;

  if (draggedIndex === 0) {
    // First position - can start earlier if needed
    if (draggedIndex + 1 < result.length) {
      // There's a next window, so we need to end before it starts
      availableEndTime = result[draggedIndex + 1].time_window.start_time;
      availableStartTime = max([0, availableEndTime - originalDuration]) ?? 0;
    } else {
      // It's the only window, keep original timing but ensure it doesn't exceed boundary
      availableStartTime = normalizeTimeMinutes(
        timeWindows[0].time_window.start_time
      );
      availableEndTime = Math.min(
        availableStartTime + originalDuration,
        maxEndTime
      );
    }
  } else if (draggedIndex === result.length - 1) {
    // Last position - start after the previous window but don't exceed day boundary
    availableStartTime = result[draggedIndex - 1].time_window.end_time;
    availableEndTime = Math.min(
      availableStartTime + originalDuration,
      maxEndTime
    );
  } else {
    // Middle position - between two windows
    availableStartTime = result[draggedIndex - 1].time_window.end_time;
    availableEndTime = result[draggedIndex + 1].time_window.start_time;
  }

  // Ensure times are within valid bounds
  availableStartTime = normalizeTimeMinutes(availableStartTime);
  availableEndTime = normalizeTimeMinutes(availableEndTime);

  // Calculate available space
  const availableSpace = availableEndTime - availableStartTime;

  // If there's no space at all, cancel the drag
  if (availableSpace <= 0) {
    return null; // Signal to cancel the drag
  }

  // Determine the new duration (either original or shortened to fit)
  const newDuration =
    min([originalDuration, availableSpace]) ?? originalDuration;

  // Ensure the end time doesn't exceed the day boundary
  const normalizedEndTime = Math.min(
    availableStartTime + newDuration,
    maxEndTime
  );

  // Only adjust the dragged window's times, leave all others unchanged
  result[draggedIndex] = {
    ...draggedWindow,
    time_window: {
      ...draggedWindow.time_window,
      start_time: availableStartTime,
      end_time: normalizedEndTime,
    },
  };

  return result;
};

export const recalculateTimeWindowsWithShifting = (
  timeWindows: TimeWindowAllocation[],
  draggedIndex: number
): TimeWindowAllocation[] => {
  if (!isArray(timeWindows) || timeWindows.length === 0) {
    return [];
  }

  const result = cloneDeep(timeWindows);
  const draggedWindow = result[draggedIndex];
  const draggedDuration =
    draggedWindow.time_window.end_time - draggedWindow.time_window.start_time;

  // Calculate the new start time for the dragged window
  let newStartTime: number;

  if (draggedIndex === 0) {
    // First position - keep the dragged window's original start time
    newStartTime = draggedWindow.time_window.start_time;
  } else {
    // Position after previous window - start immediately after the previous window ends
    newStartTime = result[draggedIndex - 1].time_window.end_time;
  }

  // Ensure the dragged window doesn't exceed 24-hour boundary
  const maxEndTime = 24 * 60 - 1; // 23:59 in minutes
  const adjustedDuration =
    min([draggedDuration, maxEndTime - newStartTime]) ?? draggedDuration;

  // Update the dragged window with its new position (duration may be adjusted)
  result[draggedIndex] = {
    ...draggedWindow,
    time_window: {
      ...draggedWindow.time_window,
      start_time: newStartTime,
      end_time: newStartTime + adjustedDuration,
    },
  };

  // Shift all subsequent windows to start after the dragged window
  let currentEndTime = newStartTime + adjustedDuration;

  for (let i = draggedIndex + 1; i < result.length; i++) {
    const currentWindow = result[i];
    const currentDuration =
      currentWindow.time_window.end_time - currentWindow.time_window.start_time;

    // Check if this window would exceed the 24-hour boundary
    if (currentEndTime >= maxEndTime) {
      // If we've reached the end of the day, truncate remaining windows
      result.splice(i);
      break;
    }

    // Adjust duration if it would exceed the boundary
    const availableTime = maxEndTime - currentEndTime;
    const adjustedCurrentDuration =
      min([currentDuration, availableTime]) ?? currentDuration;

    result[i] = {
      ...currentWindow,
      time_window: {
        ...currentWindow.time_window,
        start_time: currentEndTime,
        end_time: currentEndTime + adjustedCurrentDuration,
      },
    };

    currentEndTime += adjustedCurrentDuration;

    // If we've reached the boundary, stop processing further windows
    if (currentEndTime >= maxEndTime) {
      result.splice(i + 1);
      break;
    }
  }

  return result;
};
// ===== ADDITIONAL LODASH-POWERED UTILITIES =====

/**
 * Re-export commonly used lodash-es functions for tree-shaking
 * These are the most frequently used utility functions across the application
 */
export { cloneDeep, isNumber, isArray, min, max } from "lodash-es";

/**
 * Additional lodash-es utilities that might be useful
 */
export {
  debounce,
  throttle,
  isEmpty,
  isEqual,
  pick,
  omit,
  merge,
  uniq,
  sortBy,
  groupBy,
  findIndex,
  chunk,
} from "lodash-es";

// ===== RE-EXPORT DATE/TIME UTILITIES =====

/**
 * Re-export date/time utilities from Day.js-based dateUtils
 */
export {
  utcToLocal,
  localToUtc,
  formatDueDate,
  formatDateTime,
  getCurrentTimeInMinutes,
  hhMMToMinutes,
  formatMinutesToHHMM,
  minutesToDate,
  calculateDuration,
  isValidTimeFormat,
  roundToInterval,
  normalizeTimeMinutes,
  formatDurationFromMinutes,
  formatDurationFromSeconds,
};
