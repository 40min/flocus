import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hhMMToMinutes(timeStr: string): number | null {
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    // Invalid format or out of range
    return null;
  }
  return hours * 60 + minutes;
}

export function formatMinutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hh = h.toString().padStart(2, '0');
  const mm = m.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatDueDate(dateString: string | null): string {
  if (!dateString) {
    return 'N/A';
  }

  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Reset time part for accurate date comparison
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  } else {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    // If the year is the current year, don't show it
    if (date.getFullYear() === today.getFullYear()) {
      options.year = undefined;
    }
    return date.toLocaleDateString(undefined, options);
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) {
    return 'N/A';
  }
  return new Date(dateString).toLocaleString();
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
