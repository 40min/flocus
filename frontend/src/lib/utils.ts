import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  isToday,
  isTomorrow,
  parseISO,
  isValid,
  getYear,
} from 'date-fns';
import { format as formatTZ, toZonedTime } from 'date-fns-tz';
import { TimeWindowCreateRequest } from '../types/timeWindow';
import { TimeWindowAllocation } from '../types/dailyPlan';

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
  if (typeof timeStr !== 'string' || !timeStr.trim()) {
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
  if (!Number.isInteger(totalMinutes)) {
    return '00:00';
  }

  const isNegative = totalMinutes < 0;
  const absMinutes = Math.abs(totalMinutes);

  // Handle 24-hour wraparound (1440 minutes = 24 hours = 00:00)
  const normalizedMinutes = absMinutes % (24 * 60);

  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;

  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return isNegative ? `-${formattedTime}` : formattedTime;
}

/**
 * Convert minutes since midnight to a Date object for today
 * @param minutes - Minutes since 00:00
 * @returns Date object set to today with specified time
 */
export function minutesToDate(minutes: number): Date {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 24 * 60) {
    throw new Error(`Invalid minutes value: ${minutes}. Must be 0-1439.`);
  }

  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
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
    console.error('localToUtc: Error converting date to ISO string:', error);
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
  if (!dateString?.trim()) return 'N/A';

  const date = utcToLocal(dateString);
  if (!date) return 'Invalid Date';

  try {
    if (isToday(date)) {
      return 'Today';
    }

    if (isTomorrow(date)) {
      return 'Tomorrow';
    }

    const currentYear = getYear(new Date());
    const dateYear = getYear(date);

    const formatString = dateYear === currentYear ? 'MMMM d' : 'MMMM d, yyyy';
    return formatTZ(date, formatString, { timeZone: LOCAL_TIMEZONE });
  } catch (error) {
    console.error('formatDueDate: Error formatting date:', error);
    return 'Invalid Date';
  }
}

/**
 * Format a date-time string for display
 * @param dateString - UTC date string
 * @returns Formatted date-time string
 */
export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString?.trim()) return 'N/A';

  const date = utcToLocal(dateString);
  if (!date) return 'Invalid Date';

  try {
    return formatTZ(date, 'MMM d, yyyy, h:mm a', { timeZone: LOCAL_TIMEZONE });
  } catch (error) {
    console.error('formatDateTime: Error formatting date:', error);
    return 'Invalid Date';
  }
}

/**
 * Format duration from minutes to human-readable string
 * @param totalMinutes - Duration in minutes
 * @returns Formatted duration string
 */
export function formatDurationFromMinutes(totalMinutes: number | undefined | null): string {
  if (totalMinutes == null || !Number.isInteger(totalMinutes) || totalMinutes < 0) {
    return 'N/A';
  }

  if (totalMinutes === 0) return '0min';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}min`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
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
  if (!newTimeWindow || !Array.isArray(existingTimeWindows)) {
    return false;
  }

  const newStart = newTimeWindow.start_time;
  const newEnd = newTimeWindow.end_time;

  // Validate new time window
  if (typeof newStart !== 'number' || typeof newEnd !== 'number' || newStart >= newEnd) {
    return false;
  }

  return existingTimeWindows.some(allocation => {
    if (!allocation?.time_window) return false;

    const { start_time: existingStart, end_time: existingEnd } = allocation.time_window;

    // Validate existing time window
    if (typeof existingStart !== 'number' || typeof existingEnd !== 'number') {
      return false;
    }

    // Check for overlap: (start1 < end2) && (end1 > start2)
    return newStart < existingEnd && newEnd > existingStart;
  });
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
export function calculateDuration(startTime: string, endTime: string): number | null {
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
export function roundToInterval(minutes: number, interval: number = 15): number {
  if (!Number.isInteger(minutes) || !Number.isInteger(interval) || interval <= 0) {
    return minutes;
  }

  return Math.round(minutes / interval) * interval;
}
