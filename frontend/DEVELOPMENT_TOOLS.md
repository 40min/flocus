# Development Tools Documentation

This document describes the development tools and monitoring infrastructure set up for the Flocus frontend application.

## Overview

The development tools are designed to help developers debug, monitor, and optimize the application during development. All tools are automatically excluded from production builds to avoid bloat.

## Available Tools

### 1. React Query DevTools

**Purpose**: Debug and inspect server state managed by React Query

**Features**:

- View all queries and their states
- Inspect query data, errors, and loading states
- Monitor query invalidations and refetches
- Debug query dependencies and relationships

**Usage**:

- Automatically available in development mode
- Look for the React Query DevTools button in the bottom-right corner
- Click to open the DevTools panel

### 2. Bundle Analyzer

**Purpose**: Monitor and analyze bundle size and composition

**Features**:

- Visual representation of bundle contents
- Identify large dependencies
- Track bundle size changes over time
- Generate detailed bundle statistics

**Usage**:

```bash
# Analyze current bundle
npm run analyze

# Analyze existing build
npm run analyze:server
```

**Output**:

- Opens interactive bundle analyzer in browser
- Generates `bundle-stats.json` for CI/CD integration

### 3. Performance Monitor

**Purpose**: Track application performance and identify bottlenecks

**Features**:

- Automatic performance tracking for functions and components
- Navigation timing metrics
- Component render performance tracking
- Async operation monitoring
- Performance warnings for slow operations

**Usage**:

#### Automatic Tracking

Performance monitoring runs automatically in development mode and tracks:

- Navigation timing (DOM Content Loaded, Load Complete, First Contentful Paint)
- Paint timing events
- Component render times (warns if > 16ms)

#### Manual Tracking

```javascript
// Track function performance
performanceMonitor.measure("operation-name", () => {
  // Your code here
});

// Track async operations
await measureAsync("async-operation", async () => {
  // Your async code here
});

// Track component renders
const trackRender = usePerformanceTracking("ComponentName");
// Call trackRender(renderTime) when needed
```

#### Console Utilities

Available in browser console:

```javascript
// Show performance summary
window.devTools.performance.logSummary();

// Clear performance metrics
window.devTools.performance.clear();

// Get raw performance data
window.devTools.performance.getSummary();
```

#### UI Controls

Development UI provides floating buttons for:

- 📊 **Perf**: Log performance summary to console
- 🗑️ **Clear**: Clear all performance metrics

### 4. Development Configuration

**Purpose**: Centralized configuration for all development tools

**Location**: `src/config/development.ts`

**Features**:

- Feature flags for enabling/disabling tools
- Performance monitoring thresholds
- Logging configuration
- Development-only utilities

## Integration with Build Process

### Development Mode

- All tools are automatically loaded and configured
- Performance monitoring is active
- DevTools UI is visible
- Console logging is enabled

### Production Mode

- All development tools are excluded from the bundle
- No performance overhead
- Clean production build

### Bundle Size Monitoring

- Bundle analyzer integration in webpack config
- Automatic bundle size tracking
- CI/CD integration ready with `bundle-stats.json`

## Performance Considerations

### Development Impact

- Minimal performance impact in development
- Tools are lazy-loaded when possible
- Performance monitoring uses efficient APIs

### Production Safety

- Zero production bundle size impact
- All development code is tree-shaken out
- Environment-based conditional loading

## Configuration

### Environment Variables

- `NODE_ENV=development`: Enables all development tools
- `ANALYZE=true`: Enables bundle analyzer during build

### Customization

Edit `src/config/development.ts` to customize:

- Performance monitoring thresholds
- Logging levels
- Tool visibility
- Feature flags

## Troubleshooting

### Tools Not Appearing

1. Verify `NODE_ENV=development`
2. Check browser console for errors
3. Ensure development dependencies are installed

### Performance Monitoring Not Working

1. Check that `window.devTools` is available in console
2. Verify performance API support in browser
3. Check console for performance logs

### Bundle Analyzer Issues

1. Ensure `webpack-bundle-analyzer` is installed
2. Check that build completes successfully
3. Verify port 8888 is available

## Best Practices

### Performance Monitoring

- Use `measureAsync` for API calls and async operations
- Track component renders for performance-critical components
- Monitor bundle size changes in CI/CD
- Set performance budgets and alerts

### Development Workflow

1. Use React Query DevTools to debug server state
2. Monitor bundle size when adding new dependencies
3. Check performance metrics regularly
4. Use console utilities for debugging

### Code Organization

- Keep development-only code in separate files
- Use environment checks for conditional loading
- Document performance-critical sections
- Add performance tests for critical paths

## Future Enhancements

Planned improvements:

- Visual regression testing integration
- Automated performance regression detection
- Enhanced component performance profiling
- Integration with external monitoring services
