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
  recalculateTimeWindowsWithGapFitting,
  utcToLocal,
} from './utils';
import { TimeWindowAllocation } from '../types/dailyPlan';
import { TimeWindowCreateRequest } from '../types/timeWindow';
import { toZonedTime } from 'date-fns-tz';
import { startOfDay } from 'date-fns';

// Keep a reference to the original console.warn
const originalConsoleWarn = console.warn;

// Helper to create a mock TimeWindowAllocation for testing
const createMockAllocation = (id: string, start: number, end: number, description?: string): TimeWindowAllocation => ({
  time_window: {
    id,
    description: description || `Window ${id}`,
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

  describe('recalculateTimeWindowsWithGapFitting', () => {
    it('should fit dragged window into available gap when there is enough space', () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation('tw1', 540, 600, 'Morning work'), // 09:00 - 10:00 (60 min)
        createMockAllocation('tw2', 720, 780, 'Lunch break'), // 12:00 - 13:00 (60 min) - dragged to middle
        createMockAllocation('tw3', 840, 900, 'Afternoon work'), // 14:00 - 15:00 (60 min)
      ];

      // Drag lunch break (index 1) to fit between morning work and afternoon work
      // Available gap: 10:00 - 14:00 (240 minutes), lunch break needs 60 minutes
      const result = recalculateTimeWindowsWithGapFitting(timeWindows, 1);

      expect(result).toHaveLength(3);
      expect(result![0].time_window.start_time).toBe(540); // Morning work unchanged
      expect(result![0].time_window.end_time).toBe(600);
      expect(result![1].time_window.start_time).toBe(600); // Lunch break fits right after morning work
      expect(result![1].time_window.end_time).toBe(660);
      expect(result![2].time_window.start_time).toBe(840); // Afternoon work unchanged
      expect(result![2].time_window.end_time).toBe(900);
    });

    it('should fit dragged window at the beginning when moved to first position', () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation('tw2', 720, 780, 'Lunch break'), // 12:00 - 13:00 (60 min) - dragged to first
        createMockAllocation('tw1', 540, 600, 'Morning work'), // 09:00 - 10:00 (60 min)
        createMockAllocation('tw3', 840, 900, 'Afternoon work'), // 14:00 - 15:00 (60 min)
      ];

      // Drag lunch break to first position, should fit before morning work
      const result = recalculateTimeWindowsWithGapFitting(timeWindows, 0);

      expect(result).toHaveLength(3);
      expect(result![0].time_window.start_time).toBe(480); // Lunch break fits before morning work (8:00 - 9:00)
      expect(result![0].time_window.end_time).toBe(540);
      expect(result![1].time_window.start_time).toBe(540); // Morning work unchanged
      expect(result![1].time_window.end_time).toBe(600);
      expect(result![2].time_window.start_time).toBe(840); // Afternoon work unchanged
      expect(result![2].time_window.end_time).toBe(900);
    });

    it('should fit dragged window at the end when moved to last position', () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation('tw1', 540, 600, 'Morning work'), // 09:00 - 10:00 (60 min)
        createMockAllocation('tw2', 720, 780, 'Lunch break'), // 12:00 - 13:00 (60 min)
        createMockAllocation('tw3', 840, 900, 'Afternoon work'), // 14:00 - 15:00 (60 min) - dragged to last
      ];

      // Drag afternoon work to last position (it's already last, but test the logic)
      const result = recalculateTimeWindowsWithGapFitting(timeWindows, 2);

      expect(result).toHaveLength(3);
      expect(result![0].time_window.start_time).toBe(540); // Others unchanged
      expect(result![0].time_window.end_time).toBe(600);
      expect(result![1].time_window.start_time).toBe(720);
      expect(result![1].time_window.end_time).toBe(780);
      expect(result![2].time_window.start_time).toBe(780); // Fits right after lunch break
      expect(result![2].time_window.end_time).toBe(840);
    });

    it('should shorten dragged window when it does not fit in available gap', () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation('tw1', 540, 600, 'Morning work'), // 09:00 - 10:00 (60 min)
        createMockAllocation('tw2', 720, 900, 'Long lunch'), // 12:00 - 15:00 (180 min) - dragged to middle
        createMockAllocation('tw3', 660, 720, 'Short break'), // 11:00 - 12:00 (60 min)
      ];

      // Drag long lunch (index 1) to middle position
      // Available gap between morning work (ends at 10:00) and short break (starts at 11:00) is only 60 minutes
      // Long lunch needs 180 minutes, so it should be shortened to fit
      const result = recalculateTimeWindowsWithGapFitting(timeWindows, 1);

      expect(result).toHaveLength(3);
      expect(result![0].time_window.start_time).toBe(540); // Morning work unchanged
      expect(result![0].time_window.end_time).toBe(600);
      expect(result![1].time_window.start_time).toBe(600); // Long lunch shortened to fit
      expect(result![1].time_window.end_time).toBe(660); // Only 60 minutes instead of 180
      expect(result![2].time_window.start_time).toBe(660); // Short break unchanged
      expect(result![2].time_window.end_time).toBe(720);
    });

    it('should return null when there is no space for the dragged window', () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation('tw1', 540, 600, 'Morning work'), // 09:00 - 10:00 (60 min)
        createMockAllocation('tw2', 720, 780, 'Lunch break'), // 12:00 - 13:00 (60 min) - dragged to middle
        createMockAllocation('tw3', 600, 720, 'No gap window'), // 10:00 - 12:00 (120 min)
      ];

      // Drag lunch break (index 1) to middle position
      // There's no gap between morning work (ends at 10:00) and no gap window (starts at 10:00)
      const result = recalculateTimeWindowsWithGapFitting(timeWindows, 1);

      expect(result).toBeNull(); // Should cancel the drag
    });

    it('should handle the example from requirements: B before A', () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation('tw2', 600, 660, 'B'), // 10:00 - 11:00 (60 min) - dragged to first
        createMockAllocation('tw1', 540, 600, 'A'), // 09:00 - 10:00 (60 min)
      ];

      // B is dragged before A, should become B (8:00 - 9:00), A (unchanged)
      const result = recalculateTimeWindowsWithGapFitting(timeWindows, 0);

      expect(result).toHaveLength(2);
      expect(result![0].time_window.start_time).toBe(480); // B becomes 8:00 - 9:00
      expect(result![0].time_window.end_time).toBe(540);
      expect(result![1].time_window.start_time).toBe(540); // A unchanged
      expect(result![1].time_window.end_time).toBe(600);
    });

    it('should handle empty array', () => {
      const result = recalculateTimeWindowsWithGapFitting([], 0);
      expect(result).toEqual([]);
    });

    it('should handle single window', () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation('tw1', 540, 600, 'Only window'),
      ];

      const result = recalculateTimeWindowsWithGapFitting(timeWindows, 0);

      expect(result).toHaveLength(1);
      expect(result![0].time_window.start_time).toBe(540);
      expect(result![0].time_window.end_time).toBe(600);
    });

    it('should preserve task assignments and other properties', () => {
      const timeWindows: TimeWindowAllocation[] = [
        {
          ...createMockAllocation('tw1', 540, 600, 'Morning work'),
          tasks: [{ id: 'task1', title: 'Task 1' } as any],
        },
        createMockAllocation('tw2', 720, 780, 'Lunch break'),
      ];

      const result = recalculateTimeWindowsWithGapFitting(timeWindows, 1);

      expect(result![0].tasks).toHaveLength(1);
      expect(result![0].tasks[0].id).toBe('task1');
      expect(result![0].time_window.description).toBe('Morning work');
      expect(result![1].time_window.description).toBe('Lunch break');
    });

    it('should only modify the dragged window, leaving others unchanged', () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation('tw1', 540, 600, 'Morning work'), // 09:00 - 10:00 (60 min)
        createMockAllocation('tw2', 720, 840, 'Long lunch'), // 12:00 - 14:00 (120 min) - dragged to middle
        createMockAllocation('tw3', 900, 960, 'Afternoon work'), // 15:00 - 16:00 (60 min)
      ];

      // Drag long lunch (index 1) to middle position
      // Available gap: 10:00 - 15:00 (300 minutes), long lunch needs 120 minutes
      const result = recalculateTimeWindowsWithGapFitting(timeWindows, 1);

      expect(result).toHaveLength(3);
      // Morning work should be completely unchanged
      expect(result![0].time_window.start_time).toBe(540);
      expect(result![0].time_window.end_time).toBe(600);
      expect(result![0].time_window.description).toBe('Morning work');

      // Only long lunch should change
      expect(result![1].time_window.start_time).toBe(600); // Moved to fit after morning work
      expect(result![1].time_window.end_time).toBe(720); // Keeps original duration
      expect(result![1].time_window.description).toBe('Long lunch');

      // Afternoon work should be completely unchanged
      expect(result![2].time_window.start_time).toBe(900);
      expect(result![2].time_window.end_time).toBe(960);
      expect(result![2].time_window.description).toBe('Afternoon work');
    });
  });
});
