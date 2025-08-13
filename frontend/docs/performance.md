# Performance Optimization

## Overview

This document outlines performance optimization strategies, monitoring tools, and best practices for the Flocus frontend application.

## Current Performance Metrics

### Bundle Size Analysis

- **Main Bundle**: 291.84 kB (gzipped)
- **CSS Bundle**: 12.85 kB (gzipped)
- **Total**: ~305 kB (gzipped)

### Performance Budget

- **Target Bundle Size**: < 350 kB (gzipped)
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.5s

## Bundle Optimization

### Tree Shaking

Ensure only used code is included in the final bundle:

```typescript
// Good: Named imports for tree shaking
import { debounce, throttle } from "lodash-es";

// Avoid: Default imports that include entire library
import _ from "lodash";
```

### Code Splitting

Implement route-based code splitting:

```typescript
import { lazy, Suspense } from "react";

// Lazy load route components
const TasksPage = lazy(() => import("./pages/TasksPage"));
const TemplatesPage = lazy(() => import("./pages/TemplatesPage"));

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
```

### Dynamic Imports

Load heavy components only when needed:

```typescript
// Dynamic import for heavy components
const HeavyChart = lazy(() => import("./components/HeavyChart"));

const Dashboard = () => {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      {showChart && (
        <Suspense fallback={<ChartSkeleton />}>
          <HeavyChart />
        </Suspense>
      )}
    </div>
  );
};
```

## Runtime Performance

### React Optimization

#### Memoization

```typescript
// Memoize expensive calculations
const ExpensiveComponent = ({ data }) => {
  const processedData = useMemo(() => {
    return data.map((item) => expensiveTransformation(item));
  }, [data]);

  return <div>{processedData}</div>;
};

// Memoize components to prevent unnecessary re-renders
const TaskItem = React.memo(({ task, onUpdate }) => {
  return (
    <div>
      <h3>{task.title}</h3>
      <button onClick={() => onUpdate(task.id)}>Update</button>
    </div>
  );
});

// Memoize callback functions
const TaskList = ({ tasks }) => {
  const handleTaskUpdate = useCallback((taskId) => {
    // Update logic
  }, []);

  return (
    <div>
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onUpdate={handleTaskUpdate} />
      ))}
    </div>
  );
};
```

#### Virtualization

For large lists, implement virtualization:

```typescript
import { FixedSizeList as List } from "react-window";

const VirtualizedTaskList = ({ tasks }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <TaskItem task={tasks[index]} />
    </div>
  );

  return (
    <List height={600} itemCount={tasks.length} itemSize={80} width="100%">
      {Row}
    </List>
  );
};
```

### State Management Optimization

#### Zustand Selective Subscriptions

```typescript
// Good: Subscribe only to needed state
const userName = useAuthStore((state) => state.user?.name);
const isLoading = useAuthStore((state) => state.isLoading);

// Avoid: Subscribing to entire store
const authStore = useAuthStore(); // Causes re-renders on any change
```

#### React Query Optimization

```typescript
// Optimize query settings
const useTasks = () => {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => data.filter((task) => !task.completed), // Only re-render if filtered data changes
  });
};

// Prefetch related data
const useTaskWithPrefetch = (taskId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch related tasks
    queryClient.prefetchQuery({
      queryKey: ["tasks", "related", taskId],
      queryFn: () => fetchRelatedTasks(taskId),
    });
  }, [taskId, queryClient]);

  return useQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => fetchTask(taskId),
  });
};
```

## Animation Performance

### GPU Acceleration

Use CSS transforms for smooth animations:

```css
/* Good: GPU-accelerated properties */
.animated-element {
  transform: translateX(100px);
  opacity: 0.5;
  will-change: transform, opacity;
}

/* Avoid: Layout-triggering properties */
.slow-animation {
  left: 100px; /* Triggers layout */
  width: 200px; /* Triggers layout */
}
```

### Auto-animate Optimization

```typescript
import { useAutoAnimate } from "@formkit/auto-animate/react";

const OptimizedList = ({ items }) => {
  const [parent] = useAutoAnimate({
    duration: 200, // Keep animations short
    easing: "ease-out",
  });

  return (
    <div ref={parent}>
      {items.map((item) => (
        <div key={item.id}>{item.content}</div>
      ))}
    </div>
  );
};
```

## Image and Asset Optimization

### Image Optimization

```typescript
// Use appropriate image formats and sizes
const OptimizedImage = ({ src, alt, width, height }) => {
  return (
    <picture>
      <source srcSet={`${src}.webp`} type="image/webp" />
      <source srcSet={`${src}.jpg`} type="image/jpeg" />
      <img
        src={`${src}.jpg`}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
      />
    </picture>
  );
};
```

### Font Loading

```css
/* Optimize font loading */
@font-face {
  font-family: "CustomFont";
  src: url("./fonts/custom-font.woff2") format("woff2");
  font-display: swap; /* Improve perceived performance */
}
```

## Monitoring and Measurement

### Performance Monitoring

```typescript
// Custom performance monitoring
export const performanceMonitor = {
  measure: (name: string, fn: () => void) => {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`${name}: ${end - start}ms`);
  },

  measureAsync: async (name: string, fn: () => Promise<void>) => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    console.log(`${name}: ${end - start}ms`);
  },
};

// Usage in components
const ExpensiveComponent = () => {
  useEffect(() => {
    performanceMonitor.measure("expensive-calculation", () => {
      // Expensive operation
    });
  }, []);

  return <div>Component content</div>;
};
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run analyze

# Generate bundle stats
npm run build -- --analyze
```

### Web Vitals Tracking

```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from "web-vitals";

// Track Core Web Vitals
getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## Development Tools

### Performance DevTools

```typescript
// Development-only performance tracking
if (process.env.NODE_ENV === "development") {
  // React DevTools Profiler
  import("react-dom/profiling").then(({ unstable_trace }) => {
    window.trace = unstable_trace;
  });

  // Performance observer
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`${entry.name}: ${entry.duration}ms`);
    }
  });

  observer.observe({ entryTypes: ["measure", "navigation", "paint"] });
}
```

### Bundle Analyzer Integration

```javascript
// craco.config.js
const BundleAnalyzerPlugin =
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

module.exports = {
  webpack: {
    plugins: [
      ...(process.env.ANALYZE === "true" ? [new BundleAnalyzerPlugin()] : []),
    ],
  },
};
```

## Performance Checklist

### Build Optimization

- [ ] Tree shaking enabled for all libraries
- [ ] Code splitting implemented for routes
- [ ] Dynamic imports used for heavy components
- [ ] Bundle size within performance budget
- [ ] Source maps optimized for production

### Runtime Optimization

- [ ] React.memo used for expensive components
- [ ] useMemo/useCallback used appropriately
- [ ] Virtualization implemented for large lists
- [ ] Images optimized and lazy loaded
- [ ] Fonts loaded efficiently

### State Management

- [ ] Zustand selectors used to prevent unnecessary re-renders
- [ ] React Query cache settings optimized
- [ ] State normalized to prevent deep object comparisons
- [ ] Context providers optimized to prevent cascading updates

### Animation Performance

- [ ] CSS transforms used instead of layout properties
- [ ] will-change property used sparingly
- [ ] Animation duration kept under 300ms
- [ ] Reduced motion preferences respected

## Performance Testing

### Automated Testing

```typescript
// Performance test example
import { render } from "@testing-library/react";
import { performance } from "perf_hooks";

test("component renders within performance budget", () => {
  const start = performance.now();

  render(<ExpensiveComponent data={largeDataSet} />);

  const end = performance.now();
  const renderTime = end - start;

  expect(renderTime).toBeLessThan(16); // 60fps budget
});
```

### Lighthouse CI Integration

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.8.x
          lhci autorun
```

## Best Practices

### General Guidelines

1. Measure before optimizing
2. Focus on user-perceived performance
3. Optimize for the critical rendering path
4. Use performance budgets to prevent regressions
5. Monitor real user metrics

### React-Specific

1. Use React DevTools Profiler to identify bottlenecks
2. Implement proper key props for list items
3. Avoid creating objects/functions in render
4. Use React.memo judiciously (not everywhere)
5. Optimize context providers to prevent unnecessary updates

### Bundle Management

1. Regularly audit dependencies for size and usage
2. Use tree-shakeable libraries when possible
3. Implement proper code splitting strategy
4. Monitor bundle size in CI/CD pipeline
5. Remove unused dependencies regularly
