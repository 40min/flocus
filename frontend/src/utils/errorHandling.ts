/**
 * Comprehensive error handling utilities for optimistic updates
 * Provides standardized error messages and handling for different error types
 */

export interface ErrorInfo {
  message: string;
  isRetryable: boolean;
  shouldLogout: boolean;
  category:
    | "network"
    | "auth"
    | "permission"
    | "validation"
    | "server"
    | "unknown";
}

/**
 * Analyzes an error and returns structured error information
 */
export const analyzeError = (error: Error): ErrorInfo => {
  const errorMessage = error.message.toLowerCase();

  // Network errors
  if (
    errorMessage.includes("network error") ||
    errorMessage.includes("fetch") ||
    errorMessage.includes("failed to fetch") ||
    errorMessage.includes("connection") ||
    errorMessage.includes("offline")
  ) {
    return {
      message: "Network error - please check your connection and try again",
      isRetryable: true,
      shouldLogout: false,
      category: "network",
    };
  }

  // Timeout errors
  if (errorMessage.includes("timeout") || errorMessage.includes("aborted")) {
    return {
      message: "Request timed out - please try again",
      isRetryable: true,
      shouldLogout: false,
      category: "network",
    };
  }

  // Authentication errors
  if (errorMessage.includes("401") || errorMessage.includes("unauthorized")) {
    return {
      message: "Session expired - please log in again",
      isRetryable: false,
      shouldLogout: true,
      category: "auth",
    };
  }

  // Permission errors
  if (errorMessage.includes("403") || errorMessage.includes("forbidden")) {
    return {
      message: "You don't have permission to perform this action",
      isRetryable: false,
      shouldLogout: false,
      category: "permission",
    };
  }

  // Not found errors
  if (errorMessage.includes("404") || errorMessage.includes("not found")) {
    return {
      message: "Resource not found - it may have been deleted",
      isRetryable: false,
      shouldLogout: false,
      category: "validation",
    };
  }

  // Validation errors
  if (
    errorMessage.includes("400") ||
    errorMessage.includes("bad request") ||
    errorMessage.includes("validation") ||
    errorMessage.includes("invalid")
  ) {
    return {
      message: `Invalid request: ${error.message}`,
      isRetryable: false,
      shouldLogout: false,
      category: "validation",
    };
  }

  // Server errors
  if (
    errorMessage.includes("500") ||
    errorMessage.includes("internal server error") ||
    errorMessage.includes("502") ||
    errorMessage.includes("503") ||
    errorMessage.includes("504")
  ) {
    return {
      message: "Server error - please try again later",
      isRetryable: true,
      shouldLogout: false,
      category: "server",
    };
  }

  // Rate limiting
  if (
    errorMessage.includes("429") ||
    errorMessage.includes("too many requests")
  ) {
    return {
      message: "Too many requests - please wait a moment and try again",
      isRetryable: true,
      shouldLogout: false,
      category: "server",
    };
  }

  // Unknown errors
  return {
    message: error.message || "An unexpected error occurred",
    isRetryable: true,
    shouldLogout: false,
    category: "unknown",
  };
};

/**
 * Gets a user-friendly error message for task operations
 */
export const getTaskErrorMessage = (
  error: Error,
  operation:
    | "create"
    | "update"
    | "delete"
    | "updateWorkingTime"
    | "updateStatus"
): string => {
  const errorInfo = analyzeError(error);

  // Return specific message if it's already user-friendly
  if (errorInfo.category !== "unknown") {
    return errorInfo.message;
  }

  // Fallback to operation-specific messages
  const operationMessages = {
    create: "Failed to create task",
    update: "Failed to update task",
    delete: "Failed to delete task",
    updateWorkingTime: "Failed to update working time",
    updateStatus: "Failed to update task status",
  };

  return `${operationMessages[operation]}: ${error.message}`;
};

/**
 * Determines if an error should trigger an automatic retry
 */
export const shouldAutoRetry = (
  error: Error,
  retryCount: number = 0
): boolean => {
  const errorInfo = analyzeError(error);

  // Don't auto-retry more than 2 times
  if (retryCount >= 2) {
    return false;
  }

  // Only auto-retry network and server errors
  return (
    errorInfo.isRetryable &&
    (errorInfo.category === "network" || errorInfo.category === "server")
  );
};

/**
 * Gets retry delay in milliseconds based on retry count (exponential backoff)
 */
export const getRetryDelay = (retryCount: number): number => {
  return Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
};

/**
 * Logs error information for debugging
 */
export const logError = (
  error: Error,
  context: Record<string, any> = {}
): void => {
  const errorInfo = analyzeError(error);

  console.error("Operation failed:", {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    errorInfo,
    context: {
      ...context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    },
  });
};

/**
 * Creates a standardized error handler for mutations
 */
export const createErrorHandler = (
  operation:
    | "create"
    | "update"
    | "delete"
    | "updateWorkingTime"
    | "updateStatus",
  showMessage: (message: string, type: "success" | "error") => void,
  additionalContext: Record<string, any> = {}
) => {
  return (error: Error, variables?: any, context?: any) => {
    const errorMessage = getTaskErrorMessage(error, operation);
    const errorInfo = analyzeError(error);

    // Show user-friendly error message
    showMessage(errorMessage, "error");

    // Log detailed error information
    logError(error, {
      operation,
      variables,
      context,
      errorInfo,
      ...additionalContext,
    });

    // Handle logout if needed
    if (errorInfo.shouldLogout) {
      // This would typically trigger a logout action
      console.warn("Authentication error detected - user should be logged out");
    }
  };
};
