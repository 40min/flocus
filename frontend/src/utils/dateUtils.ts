import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import relativeTime from "dayjs/plugin/relativeTime";
import isToday from "dayjs/plugin/isToday";
import isTomorrow from "dayjs/plugin/isTomorrow";
import { isInteger, isString, isNumber } from "lodash-es";

// Extend dayjs with required plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isTomorrow);

// Cache timezone to avoid repeated system calls
const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

// ===== TIMEZONE UTILITIES =====

/**
 * Convert UTC ISO string to local date object
 * @param utcDate - UTC date string or null
 * @returns Local date object or null
 */
export function utcToLocal(utcDate: string | null): Date | null {
  if (!utcDate?.trim()) return null;

  try {
    const date = dayjs.utc(utcDate.trim());
    if (!date.isValid()) {
      console.warn(`utcToLocal: Invalid date format: '${utcDate}'`);
      return null;
    }
    return date.tz(LOCAL_TIMEZONE).toDate();
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
  if (!localDate) return null;

  try {
    const date = dayjs(localDate);
    if (!date.isValid()) return null;
    return date.utc().toISOString();
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
    const dayjsDate = dayjs(date).tz(LOCAL_TIMEZONE);

    if (dayjsDate.isToday()) {
      return "Today";
    }

    if (dayjsDate.isTomorrow()) {
      return "Tomorrow";
    }

    const currentYear = dayjs().year();
    const dateYear = dayjsDate.year();

    const formatString = dateYear === currentYear ? "MMMM D" : "MMMM D, YYYY";
    return dayjsDate.format(formatString);
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
    return dayjs(date).tz(LOCAL_TIMEZONE).format("MMM D, YYYY, h:mm A");
  } catch (error) {
    console.error("formatDateTime: Error formatting date:", error);
    return "Invalid Date";
  }
}

/**
 * Get current time in minutes since midnight
 * @returns Current time as minutes since 00:00
 */
export function getCurrentTimeInMinutes(): number {
  const now = dayjs();
  return now.hour() * 60 + now.minute();
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

  const hours = Math.floor(normalizedMinutes / 60);
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

  return dayjs().startOf("day").add(minutes, "minute").toDate();
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

  return Math.round(minutes / interval) * interval;
}

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

// ===== DURATION FORMATTING =====

/**
 * Format duration from minutes to human-readable string
 * @param totalMinutes - Duration in minutes
 * @returns Formatted duration string
 */
export function formatDurationFromMinutes(
  totalMinutes: number | undefined | null
): string {
  if (totalMinutes == null || !isInteger(totalMinutes) || totalMinutes < 0) {
    return "N/A";
  }

  if (totalMinutes === 0) return "0min";

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

/**
 * Format duration from seconds to human-readable string
 * @param totalSeconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDurationFromSeconds(
  totalSeconds: number | undefined | null
): string {
  if (totalSeconds == null || !isInteger(totalSeconds) || totalSeconds < 0) {
    return "N/A";
  }

  if (totalSeconds === 0) return "0s";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

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

// Export dayjs instance for advanced usage
export { dayjs };
