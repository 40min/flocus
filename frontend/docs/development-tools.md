# Development Tools

This document describes the development tools and monitoring infrastructure for the Flocus frontend application.

## Overview

Development tools are designed to help developers debug, monitor, and optimize the application during development. All tools are automatically excluded from production builds.

## Available Tools

### React Query DevTools

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

### Bundle Analyzer

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

### Performance Monitor

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
```

## Configuration

### Environment Variables

- `NODE_ENV=development`: Enables all development tools
- `ANALYZE=true`: Enables bundle analyzer during build

### Build Integration

- Bundle analyzer integration in webpack config
- Automatic bundle size tracking
- CI/CD integration ready with bundle-stats.json

## Performance Considerations

### Development Impact

- Minimal performance impact in development
- Tools are lazy-loaded when possible
- Performance monitoring uses efficient APIs

### Production Safety

- Zero production bundle size impact
- All development code is tree-shaken out
- Environment-based conditional loading

## Best Practices

### Performance Monitoring

- Use performance tracking for critical operations
- Monitor bundle size when adding new dependencies
- Set performance budgets and alerts
- Track component render performance

### Development Workflow

1. Use React Query DevTools to debug server state
2. Monitor bundle size when adding new dependencies
3. Check performance metrics regularly
4. Use console utilities for debugging

## Troubleshooting

### Tools Not Appearing

1. Verify `NODE_ENV=development`
2. Check browser console for errors
3. Ensure development dependencies are installed

### Bundle Analyzer Issues

1. Ensure `webpack-bundle-analyzer` is installed
2. Check that build completes successfully
3. Verify port 8888 is available
