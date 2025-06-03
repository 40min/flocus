import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  parse,
  format,
  isToday,
  isTomorrow,
  startOfDay,
  addMinutes,
  parseISO,
  isValid,
  getYear,
  getHours as dfnsGetHours,
  getMinutes as dfnsGetMinutes,
} from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hhMMToMinutes(timeStr: string): number | null {
  // Use a reference date (like today) for parsing, as parse needs a full date context.
  // The actual date part doesn't matter here, only the time.
  const parsedTime = parse(timeStr, 'HH:mm', new Date());
  if (!isValid(parsedTime)) {
    return null;
  }
  const hours = dfnsGetHours(parsedTime);
  const minutes = dfnsGetMinutes(parsedTime);
  return hours * 60 + minutes;
}

export function formatMinutesToHHMM(totalMinutes: number): string {
  if (totalMinutes < 0) {
    // Handle negative durations by formatting the absolute value and prepending a sign.
    const sign = "-";
    const absMinutes = Math.abs(totalMinutes);
    const baseDate = startOfDay(new Date());
    const targetDate = addMinutes(baseDate, absMinutes);
    return sign + format(targetDate, 'HH:mm');
  }
  const baseDate = startOfDay(new Date());
  const targetDate = addMinutes(baseDate, totalMinutes);
  return format(targetDate, 'HH:mm');
}

export function formatDueDate(dateString: string | null): string {
  if (!dateString) {
    return 'N/A';
  }
  // Assuming dateString is an ISO 8601 string. If not, `new Date(dateString)` might be more lenient
  // but `parseISO` is stricter and preferred for ISO strings.
  const date = parseISO(dateString);
  if (!isValid(date)) {
    // Consider logging an error or returning a more informative string for debugging.
    return 'Invalid Date'; // Or 'N/A' as per original pattern for missing date.
  }

  if (isToday(date)) {
    return 'Today';
  } else if (isTomorrow(date)) {
    return 'Tomorrow';
  } else {
    const currentYear = getYear(new Date());
    if (getYear(date) === currentYear) {
      return format(date, 'MMMM d'); // e.g., "July 23"
    } else {
      return format(date, 'MMMM d, yyyy'); // e.g., "July 23, 2025"
    }
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) {
    return 'N/A';
  }
  // Assuming dateString is an ISO 8601 string.
  const date = parseISO(dateString);
  if (!isValid(date)) {
    return 'Invalid Date'; // Or 'N/A'.
  }
  return format(date, 'dd.MM.yyyy HH:mm:ss');
}

export function formatDurationFromMinutes(totalMinutes: number | undefined | null): string {
  if (totalMinutes === undefined || totalMinutes === null || totalMinutes < 0) {
    return 'N/A';
  }
  if (totalMinutes === 0) {
    return '0 min';
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || (hours === 0 && totalMinutes > 0)) { // Show minutes if non-zero, or if hours is zero but totalMinutes > 0
    parts.push(`${minutes}min`);
  }
  return parts.join(' ') || '0 min'; // Fallback for safety, though current logic should prevent empty parts if totalMinutes > 0
}
