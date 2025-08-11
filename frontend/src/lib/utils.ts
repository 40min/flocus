import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { isToday, isTomorrow, parseISO, isValid, getYear } from "date-fns";
import { format as formatTZ, toZonedTime } from "date-fns-tz";
import {
  cloneDeep,
  isInteger,
  isString,
  isNumber,
  isArray,
  isNull,
  isUndefined,
  round,
  floor,
  min,
  max,
} from "lodash-es";
import { TimeWindowCreateRequest } from "../types/timeWindow";
import { TimeWindowAllocation } from "../types/dailyPlan";

// ===== STYLING UTILITIES =====
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ===== TIME PARSING AND CONVERSION =====

/**
 * Convert time string in H:MM or HH:MM format to total minutes
 * @param timeStr - Time string (e.g., "1:30", "13:45")
 * @returns Total minutes from 00:00, or null if invalid
 */
export function hhMMToMinutes(timeStr: string): number | null {
  if (!isString(timeStr) || !timeStr.trim()) {
    return null;
  }

  const match = timeStr.trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  // Validate time ranges
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/**
 * Convert total minutes to HH:MM format string
 * @param totalMinutes - Total minutes (can be negative)
 * @returns Formatted time string with 24-hour wraparound
 */
export function formatMinutesToHHMM(totalMinutes: number): string {
  if (!isInteger(totalMinutes)) {
    return "00:00";
  }

  const isNegative = totalMinutes < 0;
  const absMinutes = Math.abs(totalMinutes);

  // Handle 24-hour wraparound (1440 minutes = 24 hours = 00:00)
  const normalizedMinutes = absMinutes % (24 * 60);

  const hours = floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;

  const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
  return isNegative ? `-${formattedTime}` : formattedTime;
}

/**
 * Convert minutes since midnight to a Date object for today
 * @param minutes - Minutes since 00:00
 * @returns Date object set to today with specified time
 */
export function minutesToDate(minutes: number): Date {
  if (!isInteger(minutes) || minutes < 0 || minutes >= 24 * 60) {
    throw new Error(`Invalid minutes value: ${minutes}. Must be 0-1439.`);
  }

  const date = new Date();
  date.setHours(floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

// ===== TIMEZONE UTILITIES =====

// Cache timezone to avoid repeated system calls
const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Convert UTC ISO string to local date object
 * @param utcDate - UTC date string or null
 * @returns Local date object or null
 */
export function utcToLocal(utcDate: string | null): Date | null {
  if (!utcDate?.trim()) return null;

  try {
    const date = parseISO(utcDate.trim());
    if (!isValid(date)) {
      console.warn(`utcToLocal: Invalid date format: '${utcDate}'`);
      return null;
    }
    return toZonedTime(date, LOCAL_TIMEZONE);
  } catch (error) {
    console.error(`utcToLocal: Error parsing date '${utcDate}':`, error);
    return null;
  }
}

/**
 * Convert local date object to UTC ISO string
 * @param localDate - Local date object or null
 * @returns UTC ISO string or null
 */
export function localToUtc(localDate: Date | null): string | null {
  if (!localDate || !isValid(localDate)) return null;

  try {
    return localDate.toISOString();
  } catch (error) {
    console.error("localToUtc: Error converting date to ISO string:", error);
    return null;
  }
}

// ===== DATE FORMATTING =====

/**
 * Format a due date string for display
 * @param dateString - UTC date string
 * @returns Formatted date string
 */
export function formatDueDate(dateString: string | null): string {
  if (!dateString?.trim()) return "N/A";

  const date = utcToLocal(dateString);
  if (!date) return "Invalid Date";

  try {
    if (isToday(date)) {
      return "Today";
    }

    if (isTomorrow(date)) {
      return "Tomorrow";
    }

    const currentYear = getYear(new Date());
    const dateYear = getYear(date);

    const formatString = dateYear === currentYear ? "MMMM d" : "MMMM d, yyyy";
    return formatTZ(date, formatString, { timeZone: LOCAL_TIMEZONE });
  } catch (error) {
    console.error("formatDueDate: Error formatting date:", error);
    return "Invalid Date";
  }
}

/**
 * Format a date-time string for display
 * @param dateString - UTC date string
 * @returns Formatted date-time string
 */
export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString?.trim()) return "N/A";

  const date = utcToLocal(dateString);
  if (!date) return "Invalid Date";

  try {
    return formatTZ(date, "MMM d, yyyy, h:mm a", { timeZone: LOCAL_TIMEZONE });
  } catch (error) {
    console.error("formatDateTime: Error formatting date:", error);
    return "Invalid Date";
  }
}

/**
 * Format duration from minutes to human-readable string
 * @param totalMinutes - Duration in minutes
 * @returns Formatted duration string
 */
export function formatDurationFromMinutes(
  totalMinutes: number | undefined | null
): string {
  if (
    isNull(totalMinutes) ||
    isUndefined(totalMinutes) ||
    !isInteger(totalMinutes) ||
    totalMinutes < 0
  ) {
    return "N/A";
  }

  if (totalMinutes === 0) return "0min";

  const hours = floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}min`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
}

/**
 * Format duration from seconds to human-readable string
 * @param totalSeconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDurationFromSeconds(
  totalSeconds: number | undefined | null
): string {
  if (
    isNull(totalSeconds) ||
    isUndefined(totalSeconds) ||
    !isInteger(totalSeconds) ||
    totalSeconds < 0
  ) {
    return "N/A";
  }

  if (totalSeconds === 0) return "0s";

  const hours = floor(totalSeconds / 3600);
  const minutes = floor((totalSeconds % 3600) / 60);

  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  if (parts.length === 0) {
    return `${totalSeconds}s`;
  }

  return parts.join(" ");
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

// ===== TIME NORMALIZATION UTILITIES =====

/**
 * Normalize time value to ensure it stays within 24-hour boundary
 * @param minutes - Time in minutes
 * @returns Normalized time within 0-1439 range
 */
export function normalizeTimeMinutes(minutes: number): number {
  if (!isNumber(minutes) || isNaN(minutes)) return 0;

  // Ensure the value is within 0-1439 range (24 hours)
  const maxMinutes = 24 * 60 - 1; // 23:59
  return Math.max(0, Math.min(minutes, maxMinutes));
}

// ===== ADDITIONAL UTILITY FUNCTIONS =====

/**
 * Get current time in minutes since midnight
 * @returns Current time as minutes since 00:00
 */
export function getCurrentTimeInMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Calculate time difference between two time strings
 * @param startTime - Start time in HH:MM format
 * @param endTime - End time in HH:MM format
 * @returns Duration in minutes, or null if invalid
 */
export function calculateDuration(
  startTime: string,
  endTime: string
): number | null {
  const start = hhMMToMinutes(startTime);
  const end = hhMMToMinutes(endTime);

  if (start === null || end === null) return null;

  let duration = end - start;

  // Handle overnight periods (e.g., 23:00 to 01:00)
  if (duration < 0) {
    duration += 24 * 60; // Add 24 hours in minutes
  }

  return duration;
}

/**
 * Validate if a time string is in valid HH:MM format
 * @param timeStr - Time string to validate
 * @returns True if valid, false otherwise
 */
export function isValidTimeFormat(timeStr: string): boolean {
  return hhMMToMinutes(timeStr) !== null;
}

/**
 * Round minutes to nearest interval
 * @param minutes - Minutes to round
 * @param interval - Interval to round to (default: 15)
 * @returns Rounded minutes
 */
export function roundToInterval(
  minutes: number,
  interval: number = 15
): number {
  if (!isInteger(minutes) || !isInteger(interval) || interval <= 0) {
    return minutes;
  }

  return round(minutes / interval) * interval;
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
export {
  cloneDeep,
  isInteger,
  isString,
  isNumber,
  isArray,
  isNull,
  isUndefined,
  round,
  floor,
  min,
  max,
} from "lodash-es";

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
