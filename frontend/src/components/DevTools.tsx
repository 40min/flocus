import React from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { performanceMonitor } from "../utils/performance";
import {
  developmentConfig,
  devFeatures,
  devConsole,
} from "../config/development";

/**
 * Development tools component that only loads in development environment
 * Consolidates all development utilities to avoid production bloat
 */
const DevTools: React.FC = () => {
  // Add performance monitoring controls to window for easy access
  React.useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== "development") {
      return;
    }
    const devTools = {
      performance: {
        logSummary: () => performanceMonitor.logSummary(),
        clear: () => performanceMonitor.clear(),
        getSummary: () => performanceMonitor.getSummary(),
      },
      // Add more dev tools here as needed
    };

    (window as any).devTools = devTools;

    // Log available dev tools
    if (developmentConfig.logging.enableDevToolsLogs) {
      devConsole.group("Dev Tools Available");
      devConsole.log(
        "- window.devTools.performance.logSummary() - Show performance summary"
      );
      devConsole.log(
        "- window.devTools.performance.clear() - Clear performance metrics"
      );
      devConsole.log(
        "- window.devTools.performance.getSummary() - Get performance data"
      );
      devConsole.groupEnd();
    }

    return () => {
      delete (window as any).devTools;
    };
  }, []);

  // Only render in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <>
      {/* React Query DevTools */}
      {devFeatures.enableReactQueryDevTools && (
        <ReactQueryDevtools
          initialIsOpen={developmentConfig.reactQuery.initialIsOpen}
        />
      )}

      {/* Performance Monitor UI - Simple floating button */}
      {devFeatures.enableDevToolsUI && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 9999,
            display: "flex",
            gap: "8px",
          }}
        >
          <button
            onClick={() => performanceMonitor.logSummary()}
            style={{
              padding: "8px 12px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
            title="Log performance summary to console"
          >
            📊 Perf
          </button>

          <button
            onClick={() => performanceMonitor.clear()}
            style={{
              padding: "8px 12px",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
            title="Clear performance metrics"
          >
            🗑️ Clear
          </button>
        </div>
      )}
    </>
  );
};

export default DevTools;
