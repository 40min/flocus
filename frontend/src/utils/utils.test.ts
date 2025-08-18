import {
  checkTimeWindowOverlap,
  recalculateTimeWindowsWithGapFitting,
  recalculateTimeWindowsWithShifting,
  formatWorkingTime,
  addWorkingTime,
  validateWorkingTimeInput,
  secondsToWorkingMinutes,
  workingMinutesToSeconds,
} from "./utils";
import { TimeWindowAllocation } from "../types/dailyPlan";
import { TimeWindowCreateRequest } from "../types/timeWindow";
import { dayjs } from "../utils/dateUtils";

// Keep a reference to the original console.warn
const originalConsoleWarn = console.warn;

// Helper to create a mock TimeWindowAllocation for testing
const createMockAllocation = (
  id: string,
  start: number,
  end: number,
  description?: string
): TimeWindowAllocation => ({
  time_window: {
    id,
    description: description || `Window ${id}`,
    start_time: start,
    end_time: end,
    category: { id: "cat1", name: "Test", user_id: "user1", is_deleted: false },
    day_template_id: "tpl1",
    user_id: "user1",
    is_deleted: false,
  },
  tasks: [],
});

describe("utils", () => {
  beforeAll(() => {
    console.warn = (...args: any[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("utcToLocal: Invalid date format:")
      ) {
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

  describe("checkTimeWindowOverlap", () => {
    const existingWindows: TimeWindowAllocation[] = [
      createMockAllocation("existing1", 540, 600), // 09:00 - 10:00
      createMockAllocation("existing2", 720, 780), // 12:00 - 13:00
    ];

    it("should return false when there is no overlap", () => {
      const newWindow: TimeWindowCreateRequest = {
        start_time: 600,
        end_time: 660,
        category_id: "cat1",
      }; // 10:00 - 11:00
      expect(checkTimeWindowOverlap(newWindow, existingWindows)).toBe(false);
    });

    it("should return true when the new window overlaps the end of an existing window", () => {
      const newWindow: TimeWindowCreateRequest = {
        start_time: 570,
        end_time: 630,
        category_id: "cat1",
      }; // 09:30 - 10:30
      expect(checkTimeWindowOverlap(newWindow, existingWindows)).toBe(true);
    });

    it("should return true when the new window overlaps the start of an existing window", () => {
      const newWindow: TimeWindowCreateRequest = {
        start_time: 750,
        end_time: 810,
        category_id: "cat1",
      }; // 12:30 - 13:30
      expect(checkTimeWindowOverlap(newWindow, existingWindows)).toBe(true);
    });

    it("should return true when the new window is completely inside an existing window", () => {
      const newWindow: TimeWindowCreateRequest = {
        start_time: 550,
        end_time: 590,
        category_id: "cat1",
      }; // 09:10 - 09:50
      expect(checkTimeWindowOverlap(newWindow, existingWindows)).toBe(true);
    });

    it("should return true when the new window completely contains an existing window", () => {
      const newWindow: TimeWindowCreateRequest = {
        start_time: 510,
        end_time: 630,
        category_id: "cat1",
      }; // 08:30 - 10:30
      expect(checkTimeWindowOverlap(newWindow, existingWindows)).toBe(true);
    });

    it("should return true for identical time windows", () => {
      const newWindow: TimeWindowCreateRequest = {
        start_time: 540,
        end_time: 600,
        category_id: "cat1",
      }; // 09:00 - 10:00
      expect(checkTimeWindowOverlap(newWindow, existingWindows)).toBe(true);
    });

    it("should return false for windows that touch at the boundaries", () => {
      const newWindow: TimeWindowCreateRequest = {
        start_time: 600,
        end_time: 720,
        category_id: "cat1",
      }; // 10:00 - 12:00
      expect(checkTimeWindowOverlap(newWindow, existingWindows)).toBe(false);
    });

    it("should return false if there are no existing windows", () => {
      const newWindow: TimeWindowCreateRequest = {
        start_time: 600,
        end_time: 720,
        category_id: "cat1",
      }; // 10:00 - 12:00
      expect(checkTimeWindowOverlap(newWindow, [])).toBe(false);
    });
  });

  describe("recalculateTimeWindowsWithGapFitting", () => {
    it("should fit dragged window into available gap when there is enough space", () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation("tw1", 540, 600, "Morning work"), // 09:00 - 10:00 (60 min)
        createMockAllocation("tw2", 720, 780, "Lunch break"), // 12:00 - 13:00 (60 min) - dragged to middle
        createMockAllocation("tw3", 840, 900, "Afternoon work"), // 14:00 - 15:00 (60 min)
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

    it("should fit dragged window at the beginning when moved to first position", () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation("tw2", 720, 780, "Lunch break"), // 12:00 - 13:00 (60 min) - dragged to first
        createMockAllocation("tw1", 540, 600, "Morning work"), // 09:00 - 10:00 (60 min)
        createMockAllocation("tw3", 840, 900, "Afternoon work"), // 14:00 - 15:00 (60 min)
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

    it("should fit dragged window at the end when moved to last position", () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation("tw1", 540, 600, "Morning work"), // 09:00 - 10:00 (60 min)
        createMockAllocation("tw2", 720, 780, "Lunch break"), // 12:00 - 13:00 (60 min)
        createMockAllocation("tw3", 840, 900, "Afternoon work"), // 14:00 - 15:00 (60 min) - dragged to last
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

    it("should shorten dragged window when it does not fit in available gap", () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation("tw1", 540, 600, "Morning work"), // 09:00 - 10:00 (60 min)
        createMockAllocation("tw2", 720, 900, "Long lunch"), // 12:00 - 15:00 (180 min) - dragged to middle
        createMockAllocation("tw3", 660, 720, "Short break"), // 11:00 - 12:00 (60 min)
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

    it("should return null when there is no space for the dragged window", () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation("tw1", 540, 600, "Morning work"), // 09:00 - 10:00 (60 min)
        createMockAllocation("tw2", 720, 780, "Lunch break"), // 12:00 - 13:00 (60 min) - dragged to middle
        createMockAllocation("tw3", 600, 720, "No gap window"), // 10:00 - 12:00 (120 min)
      ];

      // Drag lunch break (index 1) to middle position
      // There's no gap between morning work (ends at 10:00) and no gap window (starts at 10:00)
      const result = recalculateTimeWindowsWithGapFitting(timeWindows, 1);

      expect(result).toBeNull(); // Should cancel the drag
    });

    it("should handle the example from requirements: B before A", () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation("tw2", 600, 660, "B"), // 10:00 - 11:00 (60 min) - dragged to first
        createMockAllocation("tw1", 540, 600, "A"), // 09:00 - 10:00 (60 min)
      ];

      // B is dragged before A, should become B (8:00 - 9:00), A (unchanged)
      const result = recalculateTimeWindowsWithGapFitting(timeWindows, 0);

      expect(result).toHaveLength(2);
      expect(result![0].time_window.start_time).toBe(480); // B becomes 8:00 - 9:00
      expect(result![0].time_window.end_time).toBe(540);
      expect(result![1].time_window.start_time).toBe(540); // A unchanged
      expect(result![1].time_window.end_time).toBe(600);
    });

    it("should handle empty array", () => {
      const result = recalculateTimeWindowsWithGapFitting([], 0);
      expect(result).toEqual([]);
    });

    it("should handle single window", () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation("tw1", 540, 600, "Only window"),
      ];

      const result = recalculateTimeWindowsWithGapFitting(timeWindows, 0);

      expect(result).toHaveLength(1);
      expect(result![0].time_window.start_time).toBe(540);
      expect(result![0].time_window.end_time).toBe(600);
    });

    it("should preserve task assignments and other properties", () => {
      const timeWindows: TimeWindowAllocation[] = [
        {
          ...createMockAllocation("tw1", 540, 600, "Morning work"),
          tasks: [{ id: "task1", title: "Task 1" } as any],
        },
        createMockAllocation("tw2", 720, 780, "Lunch break"),
      ];

      const result = recalculateTimeWindowsWithGapFitting(timeWindows, 1);

      expect(result![0].tasks).toHaveLength(1);
      expect(result![0].tasks[0].id).toBe("task1");
      expect(result![0].time_window.description).toBe("Morning work");
      expect(result![1].time_window.description).toBe("Lunch break");
    });

    it("should only modify the dragged window, leaving others unchanged", () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation("tw1", 540, 600, "Morning work"), // 09:00 - 10:00 (60 min)
        createMockAllocation("tw2", 720, 840, "Long lunch"), // 12:00 - 14:00 (120 min) - dragged to middle
        createMockAllocation("tw3", 900, 960, "Afternoon work"), // 15:00 - 16:00 (60 min)
      ];

      // Drag long lunch (index 1) to middle position
      // Available gap: 10:00 - 15:00 (300 minutes), long lunch needs 120 minutes
      const result = recalculateTimeWindowsWithGapFitting(timeWindows, 1);

      expect(result).toHaveLength(3);
      // Morning work should be completely unchanged
      expect(result![0].time_window.start_time).toBe(540);
      expect(result![0].time_window.end_time).toBe(600);
      expect(result![0].time_window.description).toBe("Morning work");

      // Only long lunch should change
      expect(result![1].time_window.start_time).toBe(600); // Moved to fit after morning work
      expect(result![1].time_window.end_time).toBe(720); // Keeps original duration
      expect(result![1].time_window.description).toBe("Long lunch");

      // Afternoon work should be completely unchanged
      expect(result![2].time_window.start_time).toBe(900);
      expect(result![2].time_window.end_time).toBe(960);
      expect(result![2].time_window.description).toBe("Afternoon work");
    });
  });

  describe("recalculateTimeWindowsWithShifting", () => {
    it("should shift subsequent windows when dragging to first position", () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation("tw2", 720, 780, "Lunch"), // 12:00 - 13:00 (60 min) - dragged to first
        createMockAllocation("tw1", 540, 600, "Morning work"), // 09:00 - 10:00 (60 min)
        createMockAllocation("tw3", 840, 900, "Afternoon work"), // 14:00 - 15:00 (60 min)
      ];

      // Drag lunch to first position
      const result = recalculateTimeWindowsWithShifting(timeWindows, 0);

      // Lunch should keep its original start time (12:00)
      expect(result[0].time_window.start_time).toBe(720); // 12:00 PM
      expect(result[0].time_window.end_time).toBe(780); // 13:00 PM

      // Morning work should shift to start after lunch
      expect(result[1].time_window.start_time).toBe(780); // 13:00 PM
      expect(result[1].time_window.end_time).toBe(840); // 14:00 PM

      // Afternoon work should shift to start after morning work
      expect(result[2].time_window.start_time).toBe(840); // 14:00 PM
      expect(result[2].time_window.end_time).toBe(900); // 15:00 PM
    });

    it("should shift subsequent windows when dragging to middle position", () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation("tw1", 540, 600, "Morning work"), // 09:00 - 10:00 (60 min)
        createMockAllocation("tw3", 840, 900, "Afternoon work"), // 14:00 - 15:00 (60 min) - dragged to middle
        createMockAllocation("tw2", 720, 780, "Lunch"), // 12:00 - 13:00 (60 min)
      ];

      // Drag afternoon work to middle position (index 1)
      const result = recalculateTimeWindowsWithShifting(timeWindows, 1);

      // Morning work stays unchanged
      expect(result[0].time_window.start_time).toBe(540); // 09:00 AM
      expect(result[0].time_window.end_time).toBe(600); // 10:00 AM

      // Afternoon work should start after morning work
      expect(result[1].time_window.start_time).toBe(600); // 10:00 AM
      expect(result[1].time_window.end_time).toBe(660); // 11:00 AM

      // Lunch should shift to start after afternoon work
      expect(result[2].time_window.start_time).toBe(660); // 11:00 AM
      expect(result[2].time_window.end_time).toBe(720); // 12:00 PM
    });

    it("should not shift anything when dragging to last position", () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation("tw1", 540, 600, "Morning work"), // 09:00 - 10:00 (60 min)
        createMockAllocation("tw2", 720, 780, "Lunch"), // 12:00 - 13:00 (60 min)
        createMockAllocation("tw3", 840, 900, "Afternoon work"), // 14:00 - 15:00 (60 min) - already last
      ];

      // Drag afternoon work to last position (it's already there)
      const result = recalculateTimeWindowsWithShifting(timeWindows, 2);

      // Morning work stays unchanged
      expect(result[0].time_window.start_time).toBe(540); // 09:00 AM
      expect(result[0].time_window.end_time).toBe(600); // 10:00 AM

      // Lunch stays unchanged
      expect(result[1].time_window.start_time).toBe(720); // 12:00 PM
      expect(result[1].time_window.end_time).toBe(780); // 13:00 PM

      // Afternoon work should start after lunch
      expect(result[2].time_window.start_time).toBe(780); // 13:00 PM
      expect(result[2].time_window.end_time).toBe(840); // 14:00 PM
    });

    it("should preserve duration of dragged window", () => {
      // Simulate the state after arrayMove has been called (Long task moved to first position)
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation("tw2", 720, 900, "Long task"), // 12:00 - 15:00 (180 min) - now at first position
        createMockAllocation("tw1", 540, 600, "Short task"), // 09:00 - 10:00 (60 min) - now at second position
      ];

      // Apply shifting logic to the dragged window at index 0
      const result = recalculateTimeWindowsWithShifting(timeWindows, 0);

      // Long task should keep its original start time and 180-minute duration
      expect(result[0].time_window.start_time).toBe(720); // 12:00 PM
      expect(result[0].time_window.end_time).toBe(900); // 15:00 PM
      expect(
        result[0].time_window.end_time - result[0].time_window.start_time
      ).toBe(180);

      // Short task should shift to start after long task
      expect(result[1].time_window.start_time).toBe(900); // 15:00 PM
      expect(result[1].time_window.end_time).toBe(960); // 16:00 PM
      expect(
        result[1].time_window.end_time - result[1].time_window.start_time
      ).toBe(60);
    });

    it("should handle empty array", () => {
      const result = recalculateTimeWindowsWithShifting([], 0);
      expect(result).toEqual([]);
    });

    it("should handle single window", () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation("tw1", 540, 600, "Only task"), // 09:00 - 10:00 (60 min)
      ];

      const result = recalculateTimeWindowsWithShifting(timeWindows, 0);

      // Single window should keep its original timing
      expect(result[0].time_window.start_time).toBe(540); // 09:00 AM
      expect(result[0].time_window.end_time).toBe(600); // 10:00 AM
    });

    it("should handle time windows that would exceed 24-hour boundary", () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation("tw1", 1380, 1440, "Late evening"), // 23:00-24:00 (invalid end)
        createMockAllocation("tw2", 1440, 1500, "Midnight+"), // Invalid start time
      ];

      const result = recalculateTimeWindowsWithShifting(timeWindows, 0);

      // Should adjust times to stay within boundary
      expect(result).toHaveLength(1); // Second window should be removed as it exceeds boundary
      expect(result[0].time_window.start_time).toBe(1380);
      expect(result[0].time_window.end_time).toBe(1439); // Clamped to 23:59
    });

    it("should truncate windows that would push beyond day boundary", () => {
      const timeWindows: TimeWindowAllocation[] = [
        createMockAllocation("tw1", 1200, 1260, "Afternoon"), // 20:00-21:00
        createMockAllocation("tw2", 1260, 1320, "Evening"), // 21:00-22:00
        createMockAllocation("tw3", 1320, 1380, "Late evening"), // 22:00-23:00
        createMockAllocation("tw4", 1380, 1440, "Very late"), // 23:00-24:00 (would exceed)
      ];

      // Drag first window to start very late
      const modifiedWindows = [...timeWindows];
      modifiedWindows[0] = createMockAllocation(
        "tw1",
        1400,
        1460,
        "Very late start"
      ); // Would push others beyond boundary

      const result = recalculateTimeWindowsWithShifting(modifiedWindows, 0);

      // Should truncate windows that would exceed the boundary
      expect(result.length).toBeLessThan(4);

      // All remaining windows should have valid times
      result.forEach((allocation) => {
        expect(allocation.time_window.start_time).toBeGreaterThanOrEqual(0);
        expect(allocation.time_window.end_time).toBeLessThan(1440);
        expect(allocation.time_window.start_time).toBeLessThan(
          allocation.time_window.end_time
        );
      });
    });
  });

  describe("Working Time Utilities", () => {
    describe("formatWorkingTime", () => {
      it("should format zero minutes correctly", () => {
        expect(formatWorkingTime(0)).toBe("0 minutes");
        expect(formatWorkingTime(null)).toBe("N/A");
        expect(formatWorkingTime(undefined)).toBe("N/A");
      });

      it("should format minutes only", () => {
        expect(formatWorkingTime(1)).toBe("1m");
        expect(formatWorkingTime(30)).toBe("30m");
        expect(formatWorkingTime(59)).toBe("59m");
      });

      it("should format hours only", () => {
        expect(formatWorkingTime(60)).toBe("1h");
        expect(formatWorkingTime(120)).toBe("2h");
        expect(formatWorkingTime(180)).toBe("3h");
      });

      it("should format hours and minutes", () => {
        expect(formatWorkingTime(61)).toBe("1h 1m");
        expect(formatWorkingTime(90)).toBe("1h 30m");
        expect(formatWorkingTime(150)).toBe("2h 30m");
        expect(formatWorkingTime(125)).toBe("2h 5m");
      });

      it("should handle negative values", () => {
        expect(formatWorkingTime(-30)).toBe("N/A");
        expect(formatWorkingTime(-1)).toBe("N/A");
      });

      it("should handle non-numeric values", () => {
        expect(formatWorkingTime(NaN)).toBe("N/A");
        expect(formatWorkingTime("30" as any)).toBe("N/A");
      });
    });

    describe("addWorkingTime", () => {
      it("should add working time correctly", () => {
        expect(addWorkingTime(30, 15)).toBe(45);
        expect(addWorkingTime(0, 30)).toBe(30);
        expect(addWorkingTime(60, 0)).toBe(60);
      });

      it("should handle null and undefined values", () => {
        expect(addWorkingTime(null, 30)).toBe(30);
        expect(addWorkingTime(30, null)).toBe(30);
        expect(addWorkingTime(null, null)).toBe(0);
        expect(addWorkingTime(undefined, 30)).toBe(30);
        expect(addWorkingTime(30, undefined)).toBe(30);
      });

      it("should return null for negative inputs", () => {
        expect(addWorkingTime(-10, 30)).toBe(null);
        expect(addWorkingTime(30, -10)).toBe(null);
        expect(addWorkingTime(-10, -5)).toBe(null);
      });

      it("should return null for non-numeric inputs", () => {
        expect(addWorkingTime("30" as any, 15)).toBe(null);
        expect(addWorkingTime(30, "15" as any)).toBe(null);
        expect(addWorkingTime(NaN, 15)).toBe(null);
      });
    });

    describe("validateWorkingTimeInput", () => {
      it("should validate positive integers", () => {
        expect(validateWorkingTimeInput(30)).toEqual({ isValid: true });
        expect(validateWorkingTimeInput(0)).toEqual({ isValid: true });
        expect(validateWorkingTimeInput(1440)).toEqual({ isValid: true });
      });

      it("should allow null and undefined", () => {
        expect(validateWorkingTimeInput(null)).toEqual({ isValid: true });
        expect(validateWorkingTimeInput(undefined)).toEqual({ isValid: true });
      });

      it("should reject negative numbers", () => {
        expect(validateWorkingTimeInput(-1)).toEqual({
          isValid: false,
          error: "Working time cannot be negative",
        });
        expect(validateWorkingTimeInput(-30)).toEqual({
          isValid: false,
          error: "Working time cannot be negative",
        });
      });

      it("should reject non-integers", () => {
        expect(validateWorkingTimeInput(30.5)).toEqual({
          isValid: false,
          error: "Working time must be a whole number of minutes",
        });
        expect(validateWorkingTimeInput(1.1)).toEqual({
          isValid: false,
          error: "Working time must be a whole number of minutes",
        });
      });

      it("should reject non-numeric values", () => {
        expect(validateWorkingTimeInput("30" as any)).toEqual({
          isValid: false,
          error: "Working time must be a number",
        });
        expect(validateWorkingTimeInput(NaN)).toEqual({
          isValid: false,
          error: "Working time must be a number",
        });
      });

      it("should reject values exceeding 24 hours", () => {
        expect(validateWorkingTimeInput(1441)).toEqual({
          isValid: false,
          error: "Cannot add more than 24 hours at once",
        });
        expect(validateWorkingTimeInput(2000)).toEqual({
          isValid: false,
          error: "Cannot add more than 24 hours at once",
        });
      });
    });

    describe("secondsToWorkingMinutes", () => {
      it("should convert seconds to minutes correctly", () => {
        expect(secondsToWorkingMinutes(60)).toBe(1);
        expect(secondsToWorkingMinutes(1800)).toBe(30);
        expect(secondsToWorkingMinutes(3600)).toBe(60);
        expect(secondsToWorkingMinutes(3660)).toBe(61); // 61 minutes
      });

      it("should round down partial minutes", () => {
        expect(secondsToWorkingMinutes(59)).toBe(0);
        expect(secondsToWorkingMinutes(119)).toBe(1);
        expect(secondsToWorkingMinutes(179)).toBe(2);
      });

      it("should handle zero and null values", () => {
        expect(secondsToWorkingMinutes(0)).toBe(0);
        expect(secondsToWorkingMinutes(null)).toBe(0);
        expect(secondsToWorkingMinutes(undefined)).toBe(0);
      });

      it("should handle negative values", () => {
        expect(secondsToWorkingMinutes(-60)).toBe(0);
        expect(secondsToWorkingMinutes(-1)).toBe(0);
      });

      it("should handle non-numeric values", () => {
        expect(secondsToWorkingMinutes("60" as any)).toBe(0);
        expect(secondsToWorkingMinutes(NaN)).toBe(0);
      });
    });

    describe("workingMinutesToSeconds", () => {
      it("should convert minutes to seconds correctly", () => {
        expect(workingMinutesToSeconds(1)).toBe(60);
        expect(workingMinutesToSeconds(30)).toBe(1800);
        expect(workingMinutesToSeconds(60)).toBe(3600);
      });

      it("should handle zero and null values", () => {
        expect(workingMinutesToSeconds(0)).toBe(0);
        expect(workingMinutesToSeconds(null)).toBe(0);
        expect(workingMinutesToSeconds(undefined)).toBe(0);
      });

      it("should handle negative values", () => {
        expect(workingMinutesToSeconds(-30)).toBe(0);
        expect(workingMinutesToSeconds(-1)).toBe(0);
      });

      it("should handle non-numeric values", () => {
        expect(workingMinutesToSeconds("30" as any)).toBe(0);
        expect(workingMinutesToSeconds(NaN)).toBe(0);
      });
    });
  });
});
