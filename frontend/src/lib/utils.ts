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
  getHours,
  getMinutes,
} from 'date-fns';
import { format as formatTZ, toZonedTime } from 'date-fns-tz';
import { TimeWindowCreateRequest } from '../types/timeWindow';
import { TimeWindowAllocation } from '../types/dailyPlan';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hhMMToMinutes(timeStr: string): number | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const parsedTime = parse(timeStr, 'HH:mm', new Date());
  if (!isValid(parsedTime)) return null;

  const hours = getHours(parsedTime);
  const minutes = getMinutes(parsedTime);
  return hours * 60 + minutes;
}

export function formatMinutesToHHMM(totalMinutes: number): string {
  if (totalMinutes < 0) {
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

// Convert UTC ISO string to local date object
export function utcToLocal(utcDate: string | null): Date | null {
  if (!utcDate) return null;
  const date = parseISO(utcDate);
  // Add a validity check after parsing, which is good practice.
  if (!isValid(date)) {
    console.error(`utcToLocal: Failed to parse date input: '${utcDate}'`);
    return null;
  }
  return toZonedTime(date, Intl.DateTimeFormat().resolvedOptions().timeZone);
}

// Convert local date object to UTC ISO string
export function localToUtc(localDate: Date | null): string | null {
  if (!localDate) return null;
  return localDate.toISOString();
}

export function formatDueDate(dateString: string | null): string {
  if (!dateString) {
    return 'N/A';
  }

  const date = utcToLocal(dateString);
  if (!date || !isValid(date)) {
    return 'Invalid Date';
  }

  if (isToday(date)) {
    return 'Today';
  } else if (isTomorrow(date)) {
    return 'Tomorrow';
  } else {
    const currentYear = getYear(new Date());
    if (getYear(date) === currentYear) {
      return formatTZ(date, 'MMMM d', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    } else {
      return formatTZ(date, 'MMMM d, yyyy', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    }
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) {
    return 'N/A';
  }

  const date = utcToLocal(dateString);
  if (!date || !isValid(date)) {
    return 'Invalid Date';
  }

  return formatTZ(date, 'MMM d, yyyy, h:mm a', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
}

export function formatDurationFromMinutes(totalMinutes: number | undefined | null): string {
  if (totalMinutes === undefined || totalMinutes === null) {
    return 'N/A';
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}min`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}min`;
  }
}


export function checkTimeWindowOverlap(
  newTimeWindow: TimeWindowCreateRequest,
  existingTimeWindows: TimeWindowAllocation[]
): boolean {
  const newStart = newTimeWindow.start_time;
  const newEnd = newTimeWindow.end_time;

  for (const allocation of existingTimeWindows) {
    const existingStart = allocation.time_window.start_time;
    const existingEnd = allocation.time_window.end_time;

    // Check for overlap:
    // (start1 < end2) && (end1 > start2)
    if (newStart < existingEnd && newEnd > existingStart) {
      return true; // Overlap detected
    }
  }
  return false; // No overlap
}
