/**
 * Development-only configuration and utilities
 * This file should only be imported in development environment
 */

export const developmentConfig = {
  // Performance monitoring settings
  performance: {
    enableTracking: true,
    warnThreshold: 16, // ms - warn if operations take longer than one frame
    trackRenders: true,
    trackAsyncOperations: true,
  },

  // React Query DevTools settings
  reactQuery: {
    initialIsOpen: false,
    position: "bottom-right" as const,
    buttonPosition: {
      marginLeft: "5px",
      transform: "scale(0.8)",
      transformOrigin: "bottom right",
    },
  },

  // Bundle analyzer settings
  bundleAnalyzer: {
    analyzerMode: "server" as const,
    openAnalyzer: true,
    generateStatsFile: true,
    statsFilename: "bundle-stats.json",
  },

  // Development logging
  logging: {
    enablePerformanceLogs: true,
    enableDevToolsLogs: true,
    enableBundleWarnings: true,
  },
};

/**
 * Check if we're in development mode
 */
export const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Development-only console utilities
 */
export const devConsole = {
  group: (title: string) => {
    if (isDevelopment) {
      console.group(`🛠️ ${title}`);
    }
  },
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
  },
};

/**
 * Development-only feature flags
 */
export const devFeatures = {
  enablePerformanceMonitoring:
    isDevelopment && developmentConfig.performance.enableTracking,
  enableReactQueryDevTools: isDevelopment,
  enableBundleAnalysis: isDevelopment && process.env.ANALYZE === "true",
  enableDevToolsUI: isDevelopment,
};
