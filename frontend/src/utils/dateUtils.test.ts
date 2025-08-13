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
  dayjs,
} from "./dateUtils";

// Keep a reference to the original console.warn and console.error
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

describe("dateUtils", () => {
  beforeEach(() => {
    // Mock console methods to avoid noise in tests
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore original console methods
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe("utcToLocal", () => {
    it("should convert UTC ISO string to local date", () => {
      const utcDate = "2023-12-25T12:00:00.000Z";
      const result = utcToLocal(utcDate);
      expect(result).toBeInstanceOf(Date);
    });

    it("should return null for null input", () => {
      expect(utcToLocal(null)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(utcToLocal("")).toBeNull();
      expect(utcToLocal("   ")).toBeNull();
    });

    it("should return null for invalid date string", () => {
      const result = utcToLocal("invalid-date");
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        "utcToLocal: Invalid date format: 'invalid-date'"
      );
    });
  });

  describe("localToUtc", () => {
    it("should convert local date to UTC ISO string", () => {
      const localDate = new Date("2023-12-25T12:00:00");
      const result = localToUtc(localDate);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should return null for null input", () => {
      expect(localToUtc(null)).toBeNull();
    });

    it("should return null for invalid date", () => {
      const invalidDate = new Date("invalid");
      expect(localToUtc(invalidDate)).toBeNull();
    });
  });

  describe("formatDueDate", () => {
    it("should return 'Today' for today's date", () => {
      const today = dayjs().utc().toISOString();
      const result = formatDueDate(today);
      expect(result).toBe("Today");
    });

    it("should return 'Tomorrow' for tomorrow's date", () => {
      const tomorrow = dayjs().add(1, "day").utc().toISOString();
      const result = formatDueDate(tomorrow);
      expect(result).toBe("Tomorrow");
    });

    it("should return formatted date for other dates", () => {
      const futureDate = dayjs().add(7, "days").utc().toISOString();
      const result = formatDueDate(futureDate);
      expect(result).toMatch(/^[A-Za-z]+ \d{1,2}$/);
    });

    it("should return 'N/A' for null input", () => {
      expect(formatDueDate(null)).toBe("N/A");
    });

    it("should return 'Invalid Date' for invalid input", () => {
      expect(formatDueDate("invalid-date")).toBe("Invalid Date");
    });
  });

  describe("formatDateTime", () => {
    it("should format date-time string", () => {
      const dateTime = "2023-12-25T12:30:00.000Z";
      const result = formatDateTime(dateTime);
      expect(result).toMatch(/^[A-Za-z]+ \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M$/);
    });

    it("should return 'N/A' for null/undefined input", () => {
      expect(formatDateTime(null)).toBe("N/A");
      expect(formatDateTime(undefined)).toBe("N/A");
    });

    it("should return 'Invalid Date' for invalid input", () => {
      expect(formatDateTime("invalid-date")).toBe("Invalid Date");
    });
  });

  describe("hhMMToMinutes", () => {
    it("should convert valid time strings to minutes", () => {
      expect(hhMMToMinutes("0:00")).toBe(0);
      expect(hhMMToMinutes("1:30")).toBe(90);
      expect(hhMMToMinutes("13:45")).toBe(825);
      expect(hhMMToMinutes("23:59")).toBe(1439);
    });

    it("should return null for invalid time strings", () => {
      expect(hhMMToMinutes("")).toBeNull();
      expect(hhMMToMinutes("25:00")).toBeNull();
      expect(hhMMToMinutes("12:60")).toBeNull();
      expect(hhMMToMinutes("invalid")).toBeNull();
      expect(hhMMToMinutes("12")).toBeNull();
    });

    it("should handle edge cases", () => {
      expect(hhMMToMinutes("   ")).toBeNull();
      expect(hhMMToMinutes("12:30   ")).toBe(750);
    });
  });

  describe("formatMinutesToHHMM", () => {
    it("should format minutes to HH:MM", () => {
      expect(formatMinutesToHHMM(0)).toBe("00:00");
      expect(formatMinutesToHHMM(90)).toBe("01:30");
      expect(formatMinutesToHHMM(825)).toBe("13:45");
      expect(formatMinutesToHHMM(1439)).toBe("23:59");
    });

    it("should handle negative values", () => {
      expect(formatMinutesToHHMM(-90)).toBe("-01:30");
    });

    it("should handle 24-hour wraparound", () => {
      expect(formatMinutesToHHMM(1440)).toBe("00:00"); // 24 hours = 00:00
      expect(formatMinutesToHHMM(1530)).toBe("01:30"); // 25.5 hours = 01:30
    });

    it("should return '00:00' for non-integer input", () => {
      expect(formatMinutesToHHMM(12.5)).toBe("00:00");
    });
  });

  describe("minutesToDate", () => {
    it("should convert minutes to Date object", () => {
      const result = minutesToDate(90); // 1:30
      expect(result).toBeInstanceOf(Date);
      expect(result.getHours()).toBe(1);
      expect(result.getMinutes()).toBe(30);
    });

    it("should throw error for invalid minutes", () => {
      expect(() => minutesToDate(-1)).toThrow();
      expect(() => minutesToDate(1440)).toThrow();
      expect(() => minutesToDate(12.5)).toThrow();
    });
  });

  describe("calculateDuration", () => {
    it("should calculate duration between time strings", () => {
      expect(calculateDuration("09:00", "17:00")).toBe(480); // 8 hours
      expect(calculateDuration("13:30", "14:45")).toBe(75); // 1h 15m
    });

    it("should handle overnight periods", () => {
      expect(calculateDuration("23:00", "01:00")).toBe(120); // 2 hours
    });

    it("should return null for invalid inputs", () => {
      expect(calculateDuration("invalid", "12:00")).toBeNull();
      expect(calculateDuration("12:00", "invalid")).toBeNull();
    });
  });

  describe("isValidTimeFormat", () => {
    it("should validate time format", () => {
      expect(isValidTimeFormat("12:30")).toBe(true);
      expect(isValidTimeFormat("0:00")).toBe(true);
      expect(isValidTimeFormat("23:59")).toBe(true);
    });

    it("should reject invalid formats", () => {
      expect(isValidTimeFormat("25:00")).toBe(false);
      expect(isValidTimeFormat("12:60")).toBe(false);
      expect(isValidTimeFormat("invalid")).toBe(false);
      expect(isValidTimeFormat("")).toBe(false);
    });
  });

  describe("roundToInterval", () => {
    it("should round to nearest interval", () => {
      expect(roundToInterval(67, 15)).toBe(60); // Round 67 to nearest 15 (60 is closer than 75)
      expect(roundToInterval(82, 15)).toBe(75); // Round 82 to nearest 15 (75 is closer than 90)
      expect(roundToInterval(90, 15)).toBe(90); // Exact match
    });

    it("should handle invalid inputs", () => {
      expect(roundToInterval(12.5, 15)).toBe(12.5); // Non-integer minutes
      expect(roundToInterval(60, 0)).toBe(60); // Zero interval
      expect(roundToInterval(60, -5)).toBe(60); // Negative interval
    });
  });

  describe("normalizeTimeMinutes", () => {
    it("should normalize time within 24-hour boundary", () => {
      expect(normalizeTimeMinutes(500)).toBe(500);
      expect(normalizeTimeMinutes(1500)).toBe(1439); // Max 23:59
      expect(normalizeTimeMinutes(-100)).toBe(0); // Min 00:00
    });

    it("should handle invalid inputs", () => {
      expect(normalizeTimeMinutes(NaN)).toBe(0);
    });
  });

  describe("formatDurationFromMinutes", () => {
    it("should format duration from minutes", () => {
      expect(formatDurationFromMinutes(0)).toBe("0min");
      expect(formatDurationFromMinutes(30)).toBe("30min");
      expect(formatDurationFromMinutes(60)).toBe("1h");
      expect(formatDurationFromMinutes(90)).toBe("1h 30min");
    });

    it("should handle invalid inputs", () => {
      expect(formatDurationFromMinutes(null)).toBe("N/A");
      expect(formatDurationFromMinutes(undefined)).toBe("N/A");
      expect(formatDurationFromMinutes(-10)).toBe("N/A");
      expect(formatDurationFromMinutes(12.5)).toBe("N/A");
    });
  });

  describe("formatDurationFromSeconds", () => {
    it("should format duration from seconds", () => {
      expect(formatDurationFromSeconds(0)).toBe("0s");
      expect(formatDurationFromSeconds(30)).toBe("30s");
      expect(formatDurationFromSeconds(60)).toBe("1m");
      expect(formatDurationFromSeconds(3600)).toBe("1h");
      expect(formatDurationFromSeconds(3690)).toBe("1h 1m");
    });

    it("should handle invalid inputs", () => {
      expect(formatDurationFromSeconds(null)).toBe("N/A");
      expect(formatDurationFromSeconds(undefined)).toBe("N/A");
      expect(formatDurationFromSeconds(-10)).toBe("N/A");
      expect(formatDurationFromSeconds(12.5)).toBe("N/A");
    });
  });

  describe("getCurrentTimeInMinutes", () => {
    it("should return current time in minutes", () => {
      const result = getCurrentTimeInMinutes();
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1440); // Less than 24 hours
    });
  });
});
