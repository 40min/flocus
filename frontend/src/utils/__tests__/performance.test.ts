/**
 * Tests for performance monitoring utilities
 */
import {
  performanceMonitor,
  measureAsync,
  devPerformanceUtils,
} from "../performance";

// Mock performance API
const mockPerformance = {
  now: jest.fn(),
  getEntriesByType: jest.fn(),
};

Object.defineProperty(global, "performance", {
  value: mockPerformance,
  writable: true,
});

// Mock console methods
const mockConsole = {
  group: jest.fn(),
  groupEnd: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

Object.defineProperty(global, "console", {
  value: mockConsole,
  writable: true,
});

describe("Performance Monitoring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformance.now.mockReturnValue(100);

    // Set NODE_ENV to development for tests
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    performanceMonitor.clear();
  });

  describe("measure", () => {
    it("should measure function execution time in development", () => {
      mockPerformance.now
        .mockReturnValueOnce(100) // start time
        .mockReturnValueOnce(117); // end time (17ms later, > 16ms threshold)

      const testFn = jest.fn(() => "result");
      const result = performanceMonitor.measure("test-operation", testFn);

      expect(result).toBe("result");
      expect(testFn).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "Slow operation detected: test-operation took 17.00ms"
        )
      );
    });

    it("should not warn for fast operations", () => {
      mockPerformance.now
        .mockReturnValueOnce(100) // start time
        .mockReturnValueOnce(110); // end time (10ms later)

      const testFn = jest.fn(() => "result");
      performanceMonitor.measure("fast-operation", testFn);

      expect(mockConsole.warn).not.toHaveBeenCalled();
    });

    it("should not measure in production", () => {
      process.env.NODE_ENV = "production";

      const testFn = jest.fn(() => "result");
      const result = performanceMonitor.measure("test-operation", testFn);

      expect(result).toBe("result");
      expect(testFn).toHaveBeenCalled();
      expect(mockPerformance.now).not.toHaveBeenCalled();
    });
  });

  describe("trackRender", () => {
    it("should track component render performance", () => {
      performanceMonitor.trackRender("TestComponent", 20);

      const summary = performanceMonitor.getSummary();
      expect(summary?.renderMetrics).toHaveLength(1);
      expect(summary?.renderMetrics[0]).toMatchObject({
        componentName: "TestComponent",
        renderCount: 1,
        totalTime: 20,
        averageTime: 20,
        lastRender: 20,
      });
    });

    it("should warn about slow renders", () => {
      performanceMonitor.trackRender("SlowComponent", 25);

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining("Slow render: SlowComponent took 25.00ms")
      );
    });

    it("should not track renders in production", () => {
      process.env.NODE_ENV = "production";

      performanceMonitor.trackRender("TestComponent", 20);

      const summary = performanceMonitor.getSummary();
      expect(summary).toBeNull();
    });
  });

  describe("measureAsync", () => {
    it("should measure async operations", async () => {
      mockPerformance.now
        .mockReturnValueOnce(100) // start time
        .mockReturnValueOnce(150); // end time (50ms later)

      const asyncFn = jest.fn().mockResolvedValue("async result");
      const result = await measureAsync("async-operation", asyncFn);

      expect(result).toBe("async result");
      expect(asyncFn).toHaveBeenCalled();
    });

    it("should handle async operation errors", async () => {
      mockPerformance.now
        .mockReturnValueOnce(100) // start time
        .mockReturnValueOnce(150); // end time (50ms later)

      const error = new Error("Async error");
      const asyncFn = jest.fn().mockRejectedValue(error);

      await expect(measureAsync("failing-operation", asyncFn)).rejects.toThrow(
        "Async error"
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining("failing-operation failed after 50.00ms:"),
        error
      );
    });
  });

  describe("devPerformanceUtils", () => {
    it("should provide development utilities", () => {
      expect(devPerformanceUtils).toHaveProperty("logSummary");
      expect(devPerformanceUtils).toHaveProperty("clear");
      expect(devPerformanceUtils).toHaveProperty("getSummary");
    });

    it("should log summary", () => {
      performanceMonitor.trackRender("TestComponent", 15);
      devPerformanceUtils.logSummary();

      expect(mockConsole.group).toHaveBeenCalledWith("📊 Performance Summary");
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });
  });
});
