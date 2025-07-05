import {
  checkTimeWindowOverlap,
  formatDateTime,
  formatDueDate,
  formatDurationFromMinutes,
  formatDurationFromSeconds,
  formatMinutesToHHMM,
  hhMMToMinutes,
  localToUtc,
  minutesToDate,
  utcToLocal,
} from './utils';
import { TimeWindowAllocation } from '../types/dailyPlan';
import { TimeWindowCreateRequest } from '../types/timeWindow';
import { toZonedTime } from 'date-fns-tz';
import { startOfDay } from 'date-fns';

// Keep a reference to the original console.warn
const originalConsoleWarn = console.warn;

// Helper to create a mock TimeWindowAllocation for testing
const createMockAllocation = (id: string, start: number, end: number): TimeWindowAllocation => ({
  time_window: {
    id,
    start_time: start,
    end_time: end,
    category: { id: 'cat1', name: 'Test', user_id: 'user1', is_deleted: false },
    day_template_id: 'tpl1',
    user_id: 'user1',
    is_deleted: false,
  },
  tasks: [],
});

describe('utils', () => {
  beforeAll(() => {
    console.warn = (...args: any[]) => {
      if (typeof args[0] === 'string' && args[0].includes("utcToLocal: Invalid date format:")) {
        // Suppress the specific warning
        return;
      }
      // For all other warnings, call the original console.warn
      originalConsoleWarn.apply(console, args);
    };
  });

  afterAll(() => {
    // Restore the original console.warn after all tests in this suite
    console.warn = originalConsoleWarn;
  });

  describe('hhMMToMinutes', () => {
    it('should convert valid HH:MM strings to minutes', () => {
      expect(hhMMToMinutes('00:00')).toBe(0);
      expect(hhMMToMinutes('09:30')).toBe(570);
      expect(hhMMToMinutes('12:00')).toBe(720);
      expect(hhMMToMinutes('23:59')).toBe(1439);
    });

    it('should handle single-digit hours', () => {
      expect(hhMMToMinutes('1:23')).toBe(83);
    });

    it('should return null for invalid formats', () => {
      expect(hhMMToMinutes('abc')).toBeNull();
      expect(hhMMToMinutes('0930')).toBeNull();
      expect(hhMMToMinutes('')).toBeNull();
    });

    it('should return null for invalid time values', () => {
      expect(hhMMToMinutes('24:00')).toBeNull();
      expect(hhMMToMinutes('12:60')).toBeNull();
      expect(hhMMToMinutes('-01:00')).toBeNull();
    });

    it('should return null for non-string inputs', () => {
      expect(hhMMToMinutes(null as any)).toBeNull();
      expect(hhMMToMinutes(undefined as any)).toBeNull();
      expect(hhMMToMinutes(123 as any)).toBeNull();
    });
  });

  describe('formatMinutesToHHMM', () => {
    it('should format minutes into a valid HH:MM string', () => {
      expect(formatMinutesToHHMM(0)).toBe('00:00');
      expect(formatMinutesToHHMM(570)).toBe('09:30');
      expect(formatMinutesToHHMM(720)).toBe('12:00');
      expect(formatMinutesToHHMM(1439)).toBe('23:59');
    });

    it('should handle minutes greater than a day by wrapping around', () => {
      expect(formatMinutesToHHMM(1440)).toBe('00:00');
      expect(formatMinutesToHHMM(1500)).toBe('01:00');
    });

    it('should handle negative minutes', () => {
      expect(formatMinutesToHHMM(-60)).toBe('-01:00');
      expect(formatMinutesToHHMM(-90)).toBe('-01:30');
    });
  });

  describe('minutesToDate', () => {
    it('should convert minutes from midnight to a Date object with the correct time', () => {
      const date = minutesToDate(570); // 09:30
      expect(date.getHours()).toBe(9);
      expect(date.getMinutes()).toBe(30);
      expect(date.getSeconds()).toBe(0);
      expect(date.getMilliseconds()).toBe(0);
    });
  });

  describe('formatDurationFromSeconds', () => {
    it.each([
      [undefined, 'N/A'],
      [null, 'N/A'],
      [0, '0s'],
      [45, '45s'],
      [59, '59s'],
      [60, '1m'],
      [61, '1m'],
      [120, '2m'],
      [121, '2m'],
      [3599, '59m'],
      [3600, '1h'],
      [3660, '1h 1m'],
      [3661, '1h 1m'],
      [5432, '1h 30m'],
    ])('should format %p seconds to "%s"', (input, expected) => {
      expect(formatDurationFromSeconds(input as any)).toBe(expected);
    });
  });

  describe('date conversions (utcToLocal, localToUtc)', () => {
    it('localToUtc should convert a local Date to a UTC ISO string', () => {
      const localDate = new Date(Date.UTC(2023, 0, 1, 12, 0, 0));
      expect(localToUtc(localDate)).toBe('2023-01-01T12:00:00.000Z');
    });

    it('utcToLocal should convert a UTC ISO string to a local Date object', () => {
      const utcString = '2023-01-01T12:00:00.000Z';
      const localDate = utcToLocal(utcString);
      expect(localDate).toBeInstanceOf(Date);
      // The exact local time depends on the test runner's timezone,
      // so we check the UTC values which should be consistent.
      expect(localDate?.getUTCFullYear()).toBe(2023);
      expect(localDate?.getUTCMonth()).toBe(0);
      expect(localDate?.getUTCDate()).toBe(1);
      expect(localDate?.getUTCHours()).toBe(12);
    });

    it('should handle null inputs', () => {
      expect(utcToLocal(null)).toBeNull();
      expect(localToUtc(null)).toBeNull();
    });

    it('utcToLocal should return null for invalid date strings', () => {
      expect(utcToLocal('invalid-date')).toBeNull();
    });
  });

  describe('formatDueDate', () => {
    beforeAll(() => {
      jest.useFakeTimers();
      // Set system time to a specific date at midnight in the local timezone
      const mockDate = new Date(2023, 9, 27, 0, 0, 0); // October 27, 2023, 00:00:00 local time
      jest.setSystemTime(mockDate);
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('returns "N/A" for null input', () => {
      expect(formatDueDate(null)).toBe('N/A');
    });

    it('returns "Invalid Date" for invalid date strings', () => {
      expect(formatDueDate('not-a-date')).toBe('Invalid Date');
    });

    it('returns "Today" for a date string representing today', () => {
      // This date is 2023-10-27T15:00:00Z. When converted to local, it should still be Oct 27.
      expect(formatDueDate('2023-10-27T15:00:00Z')).toBe('Today');
    });

    it('returns "Tomorrow" for a date string representing tomorrow', () => {
      // This date is 2023-10-28T01:00:00Z. When converted to local, it should still be Oct 28.
      expect(formatDueDate('2023-10-28T01:00:00Z')).toBe('Tomorrow');
    });
  });

  describe('formatDateTime', () => {
    it('returns "N/A" for null or undefined input', () => {
      expect(formatDateTime(null)).toBe('N/A');
      expect(formatDateTime(undefined)).toBe('N/A');
    });

    it('returns "Invalid Date" for an invalid date string', () => {
      expect(formatDateTime('invalid-date')).toBe('Invalid Date');
    });
  });

  describe('formatDurationFromMinutes', () => {
    it.each([
      [undefined, 'N/A'],
      [null, 'N/A'],
      [0, '0min'],
      [45, '45min'],
      [59, '59min'],
      [60, '1h'],
      [75, '1h 15min'],
      [120, '2h'],
      [121, '2h 1min'],
    ])('should format %p minutes to "%s"', (input, expected) => {
      expect(formatDurationFromMinutes(input as any)).toBe(expected);
    });
  });

  describe('checkTimeWindowOverlap', () => {
    const existingWindows: TimeWindowAllocation[] = [
      createMockAllocation('existing1', 540, 600), // 09:00 - 10:00
      createMockAllocation('existing2', 720, 780), // 12:00 - 13:00
    ];

    it('should return false when there is no overlap', () => {
      const newWindow: TimeWindowCreateRequest = { start_time: 600, end_time: 660, category_id: 'cat1' }; // 10:00 - 11:00
      expect(checkTimeWindowOverlap(newWindow, existingWindows)).toBe(false);
    });

    it('should return true when the new window overlaps the end of an existing window', () => {
      const newWindow: TimeWindowCreateRequest = { start_time: 570, end_time: 630, category_id: 'cat1' }; // 09:30 - 10:30
      expect(checkTimeWindowOverlap(newWindow, existingWindows)).toBe(true);
    });

    it('should return true when the new window overlaps the start of an existing window', () => {
      const newWindow: TimeWindowCreateRequest = { start_time: 750, end_time: 810, category_id: 'cat1' }; // 12:30 - 13:30
      expect(checkTimeWindowOverlap(newWindow, existingWindows)).toBe(true);
    });

    it('should return true when the new window is completely inside an existing window', () => {
      const newWindow: TimeWindowCreateRequest = { start_time: 550, end_time: 590, category_id: 'cat1' }; // 09:10 - 09:50
      expect(checkTimeWindowOverlap(newWindow, existingWindows)).toBe(true);
    });

    it('should return true when the new window completely contains an existing window', () => {
      const newWindow: TimeWindowCreateRequest = { start_time: 510, end_time: 630, category_id: 'cat1' }; // 08:30 - 10:30
      expect(checkTimeWindowOverlap(newWindow, existingWindows)).toBe(true);
    });

    it('should return true for identical time windows', () => {
      const newWindow: TimeWindowCreateRequest = { start_time: 540, end_time: 600, category_id: 'cat1' }; // 09:00 - 10:00
      expect(checkTimeWindowOverlap(newWindow, existingWindows)).toBe(true);
    });

    it('should return false for windows that touch at the boundaries', () => {
      const newWindow: TimeWindowCreateRequest = { start_time: 600, end_time: 720, category_id: 'cat1' }; // 10:00 - 12:00
      expect(checkTimeWindowOverlap(newWindow, existingWindows)).toBe(false);
    });

    it('should return false if there are no existing windows', () => {
      const newWindow: TimeWindowCreateRequest = { start_time: 600, end_time: 720, category_id: 'cat1' }; // 10:00 - 12:00
      expect(checkTimeWindowOverlap(newWindow, [])).toBe(false);
    });
  });
});
