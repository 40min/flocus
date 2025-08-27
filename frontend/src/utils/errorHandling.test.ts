import {
  analyzeError,
  getTaskErrorMessage,
  shouldRetryMutation,
  getRetryDelay,
  logError,
  handleMutationError,
} from "./errorHandling";

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe("errorHandling utilities", () => {
  describe("analyzeError", () => {
    test("should identify network errors", () => {
      const networkError = new Error("Network Error");
      const result = analyzeError(networkError);

      expect(result.category).toBe("network");
      expect(result.isRetryable).toBe(true);
      expect(result.shouldLogout).toBe(false);
      expect(result.message).toContain("Network error");
    });

    test("should identify timeout errors", () => {
      const timeoutError = new Error("Request timeout");
      const result = analyzeError(timeoutError);

      expect(result.category).toBe("network");
      expect(result.isRetryable).toBe(true);
      expect(result.message).toContain("timed out");
    });

    test("should identify authentication errors", () => {
      const authError = new Error("401 Unauthorized");
      const result = analyzeError(authError);

      expect(result.category).toBe("auth");
      expect(result.isRetryable).toBe(false);
      expect(result.shouldLogout).toBe(true);
      expect(result.message).toContain("Session expired");
    });

    test("should identify permission errors", () => {
      const permissionError = new Error("403 Forbidden");
      const result = analyzeError(permissionError);

      expect(result.category).toBe("permission");
      expect(result.isRetryable).toBe(false);
      expect(result.shouldLogout).toBe(false);
      expect(result.message).toContain("permission");
    });

    test("should identify not found errors", () => {
      const notFoundError = new Error("404 Not Found");
      const result = analyzeError(notFoundError);

      expect(result.category).toBe("validation");
      expect(result.isRetryable).toBe(false);
      expect(result.message).toContain("not found");
    });

    test("should identify server errors", () => {
      const serverError = new Error("500 Internal Server Error");
      const result = analyzeError(serverError);

      expect(result.category).toBe("server");
      expect(result.isRetryable).toBe(true);
      expect(result.message).toContain("Server error");
    });

    test("should identify rate limiting errors", () => {
      const rateLimitError = new Error("429 Too Many Requests");
      const result = analyzeError(rateLimitError);

      expect(result.category).toBe("server");
      expect(result.isRetryable).toBe(true);
      expect(result.message).toContain("Too many requests");
    });

    test("should handle unknown errors", () => {
      const unknownError = new Error("Something went wrong");
      const result = analyzeError(unknownError);

      expect(result.category).toBe("unknown");
      expect(result.isRetryable).toBe(true);
      expect(result.message).toBe("Something went wrong");
    });
  });

  describe("getTaskErrorMessage", () => {
    test("should return specific message for known error types", () => {
      const networkError = new Error("Network Error");
      const message = getTaskErrorMessage(networkError, "create");

      expect(message).toContain("Network error");
    });

    test("should return operation-specific message for unknown errors", () => {
      const unknownError = new Error("Unknown error");
      const message = getTaskErrorMessage(unknownError, "updateWorkingTime");

      expect(message).toContain("Failed to update working time");
    });

    test("should handle different operations", () => {
      const error = new Error("Test error");

      expect(getTaskErrorMessage(error, "create")).toContain("create");
      expect(getTaskErrorMessage(error, "update")).toContain("update");
      expect(getTaskErrorMessage(error, "delete")).toContain("delete");
      expect(getTaskErrorMessage(error, "updateStatus")).toContain("status");
    });
  });

  describe("shouldRetryMutation", () => {
    test("should allow retry for network errors", () => {
      const networkError = new Error("Network Error");
      expect(shouldRetryMutation(0, networkError)).toBe(true);
      expect(shouldRetryMutation(1, networkError)).toBe(true);
    });

    test("should not allow retry after max attempts", () => {
      const networkError = new Error("Network Error");
      expect(shouldRetryMutation(2, networkError)).toBe(false);
      expect(shouldRetryMutation(3, networkError)).toBe(false);
    });

    test("should not allow retry for auth errors", () => {
      const authError = new Error("401 Unauthorized");
      expect(shouldRetryMutation(0, authError)).toBe(false);
    });

    test("should allow retry for server errors", () => {
      const serverError = new Error("500 Internal Server Error");
      expect(shouldRetryMutation(0, serverError)).toBe(true);
    });
  });

  describe("getRetryDelay", () => {
    test("should implement exponential backoff", () => {
      expect(getRetryDelay(0)).toBe(1000);
      expect(getRetryDelay(1)).toBe(2000);
      expect(getRetryDelay(2)).toBe(4000);
      expect(getRetryDelay(3)).toBe(8000);
    });

    test("should cap at maximum delay", () => {
      expect(getRetryDelay(10)).toBe(10000);
    });
  });

  describe("logError", () => {
    test("should log error with context", () => {
      const error = new Error("Test error");
      const context = { taskId: "task-1" };

      logError(error, context);

      expect(console.error).toHaveBeenCalledWith(
        "Operation failed:",
        expect.objectContaining({
          error: expect.objectContaining({
            message: "Test error",
          }),
          context: expect.objectContaining({
            taskId: "task-1",
            timestamp: expect.any(String),
          }),
        })
      );
    });
  });

  describe("handleMutationError", () => {
    test("should show message and log error", () => {
      const mockShowMessage = jest.fn();
      const error = new Error("Test error");

      handleMutationError(error, "create", mockShowMessage, {
        taskId: "task-1",
      });

      expect(mockShowMessage).toHaveBeenCalledWith(
        expect.stringContaining("Failed to create task"),
        "error"
      );

      expect(console.error).toHaveBeenCalledWith(
        "Operation failed:",
        expect.objectContaining({
          context: expect.objectContaining({
            operation: "create",
            taskId: "task-1",
          }),
        })
      );
    });

    test("should handle network errors with appropriate message", () => {
      const mockShowMessage = jest.fn();
      const networkError = new Error("Network Error");

      handleMutationError(networkError, "update", mockShowMessage);

      expect(mockShowMessage).toHaveBeenCalledWith(
        "Network error - please check your connection and try again",
        "error"
      );
    });
  });
});
