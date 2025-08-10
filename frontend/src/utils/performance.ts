/**
 * Performance monitoring utilities for development environment
 */
import React from "react";

interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
}

interface RenderMetrics {
  componentName: string;
  renderCount: number;
  totalTime: number;
  averageTime: number;
  lastRender: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private renderMetrics: Map<string, RenderMetrics> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (process.env.NODE_ENV === "development") {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // Observe navigation timing
    if ("PerformanceObserver" in window) {
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === "navigation") {
            const navEntry = entry as PerformanceNavigationTiming;
            console.group("🚀 Navigation Performance");
            console.log(
              "DOM Content Loaded:",
              navEntry.domContentLoadedEventEnd -
                navEntry.domContentLoadedEventStart,
              "ms"
            );
            console.log(
              "Load Complete:",
              navEntry.loadEventEnd - navEntry.loadEventStart,
              "ms"
            );
            console.log(
              "First Contentful Paint:",
              this.getFirstContentfulPaint(),
              "ms"
            );
            console.groupEnd();
          }
        });
      });

      try {
        navObserver.observe({ entryTypes: ["navigation"] });
        this.observers.push(navObserver);
      } catch (e) {
        console.warn("Navigation timing observer not supported");
      }

      // Observe paint timing
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          console.log(`🎨 ${entry.name}:`, entry.startTime.toFixed(2), "ms");
        });
      });

      try {
        paintObserver.observe({ entryTypes: ["paint"] });
        this.observers.push(paintObserver);
      } catch (e) {
        console.warn("Paint timing observer not supported");
      }
    }
  }

  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType("paint");
    const fcpEntry = paintEntries.find(
      (entry) => entry.name === "first-contentful-paint"
    );
    return fcpEntry ? fcpEntry.startTime : 0;
  }

  /**
   * Measure the performance of a function
   */
  measure<T>(name: string, fn: () => T): T {
    if (process.env.NODE_ENV !== "development") {
      return fn();
    }

    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const duration = end - start;

    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    if (duration > 16) {
      // Warn if operation takes longer than one frame (16ms)
      console.warn(
        `⚠️ Slow operation detected: ${name} took ${duration.toFixed(2)}ms`
      );
    }

    return result;
  }

  /**
   * Track React component render performance
   */
  trackRender(componentName: string, renderTime: number) {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const existing = this.renderMetrics.get(componentName);
    if (existing) {
      existing.renderCount++;
      existing.totalTime += renderTime;
      existing.averageTime = existing.totalTime / existing.renderCount;
      existing.lastRender = renderTime;
    } else {
      this.renderMetrics.set(componentName, {
        componentName,
        renderCount: 1,
        totalTime: renderTime,
        averageTime: renderTime,
        lastRender: renderTime,
      });
    }

    // Warn about slow renders
    if (renderTime > 16) {
      console.warn(
        `🐌 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`
      );
    }
  }

  /**
   * Get performance summary
   */
  getSummary() {
    if (process.env.NODE_ENV !== "development") {
      return null;
    }

    return {
      totalMeasurements: this.metrics.length,
      averageDuration:
        this.metrics.reduce((sum, m) => sum + m.duration, 0) /
        this.metrics.length,
      slowestOperation: this.metrics.reduce(
        (slowest, current) =>
          current.duration > slowest.duration ? current : slowest,
        this.metrics[0]
      ),
      renderMetrics: Array.from(this.renderMetrics.values()),
    };
  }

  /**
   * Log performance summary to console
   */
  logSummary() {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const summary = this.getSummary();
    if (!summary) return;

    console.group("📊 Performance Summary");
    console.log("Total measurements:", summary.totalMeasurements);
    console.log("Average duration:", summary.averageDuration?.toFixed(2), "ms");

    if (summary.slowestOperation) {
      console.log(
        "Slowest operation:",
        summary.slowestOperation.name,
        summary.slowestOperation.duration.toFixed(2),
        "ms"
      );
    }

    if (summary.renderMetrics.length > 0) {
      console.group("Component Render Performance");
      summary.renderMetrics
        .sort((a, b) => b.averageTime - a.averageTime)
        .slice(0, 10) // Top 10 slowest components
        .forEach((metric) => {
          console.log(
            `${metric.componentName}: ${metric.averageTime.toFixed(2)}ms avg (${
              metric.renderCount
            } renders)`
          );
        });
      console.groupEnd();
    }
    console.groupEnd();
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
    this.renderMetrics.clear();
  }

  /**
   * Cleanup observers
   */
  destroy() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for component performance tracking
export const usePerformanceTracking = (componentName: string) => {
  if (process.env.NODE_ENV !== "development") {
    return () => {};
  }

  return (renderTime?: number) => {
    if (renderTime !== undefined) {
      performanceMonitor.trackRender(componentName, renderTime);
    }
  };
};

// Higher-order component for automatic performance tracking
export const withPerformanceTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> => {
  if (process.env.NODE_ENV !== "development") {
    return WrappedComponent;
  }

  const name =
    componentName ||
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    "Unknown";

  const PerformanceTrackedComponent = React.memo((props: P) => {
    const startTime = performance.now();

    React.useEffect(() => {
      const endTime = performance.now();
      performanceMonitor.trackRender(name, endTime - startTime);
    });

    return React.createElement(WrappedComponent, props);
  });

  PerformanceTrackedComponent.displayName = `withPerformanceTracking(${name})`;

  return PerformanceTrackedComponent;
};

// Utility to measure async operations
export const measureAsync = async <T>(
  name: string,
  asyncFn: () => Promise<T>
): Promise<T> => {
  if (process.env.NODE_ENV !== "development") {
    return asyncFn();
  }

  const start = performance.now();
  try {
    const result = await asyncFn();
    const end = performance.now();
    const duration = end - start;

    performanceMonitor.measure(name, () => duration);
    return result;
  } catch (error) {
    const end = performance.now();
    const duration = end - start;
    console.error(`❌ ${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};

// Development-only performance debugging utilities
export const devPerformanceUtils = {
  logSummary: () => performanceMonitor.logSummary(),
  clear: () => performanceMonitor.clear(),
  getSummary: () => performanceMonitor.getSummary(),
};

// Make it available globally in development
if (process.env.NODE_ENV === "development") {
  (window as any).performanceMonitor = devPerformanceUtils;
}
