# State Management

## Overview

The Flocus frontend uses a multi-layered state management approach, combining different tools for different types of state to optimize performance and developer experience.

## State Management Strategy

### State Categories

1. **Local Component State** - `useState`, `useReducer`
2. **Global Application State** - Zustand stores
3. **Server State** - React Query
4. **Form State** - React Hook Form
5. **URL State** - React Router

### Decision Matrix

| State Type          | Tool            | Use Case                                       |
| ------------------- | --------------- | ---------------------------------------------- |
| Component-specific  | useState        | Toggle states, form inputs, local UI state     |
| Complex local state | useReducer      | Multi-step forms, complex state transitions    |
| Global app state    | Zustand         | Authentication, user preferences, app settings |
| Server data         | React Query     | API data, caching, synchronization             |
| Form data           | React Hook Form | Form validation, submission, field management  |
| Navigation state    | React Router    | Route parameters, search params                |

## Zustand Stores

### Authentication Store (`stores/authStore.ts`)

Manages user authentication state and related operations.

**State**:

```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

**Actions**:

- `login(token: string)` - Authenticate user
- `logout()` - Clear authentication
- `fetchUserData()` - Load user profile

**Usage**:

```typescript
import { useAuthStore } from "@/stores/authStore";

const LoginComponent = () => {
  const { login, isLoading, isAuthenticated } = useAuthStore();

  const handleLogin = async (token: string) => {
    await login(token);
  };

  if (isAuthenticated) {
    return <Dashboard />;
  }

  return <LoginForm onLogin={handleLogin} loading={isLoading} />;
};
```

### Timer Store (`stores/timerStore.ts`)

Manages pomodoro timer state and functionality.

**State**:

```typescript
interface TimerState {
  isRunning: boolean;
  timeRemaining: number;
  currentSession: "work" | "break" | null;
  completedSessions: number;
}
```

**Actions**:

- `startTimer()` - Begin timer session
- `pauseTimer()` - Pause current session
- `resetTimer()` - Reset to initial state
- `completeSession()` - Mark session as complete

**Features**:

- Persistent state across page reloads
- Selective subscriptions to prevent unnecessary re-renders
- DevTools integration for debugging

### Store Best Practices

#### Selective Subscriptions

```typescript
// Good: Subscribe only to needed state
const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

// Avoid: Subscribing to entire store
const authStore = useAuthStore(); // Causes re-renders on any state change
```

#### Async Actions

```typescript
const useAuthStore = create<AuthState>((set, get) => ({
  // ... state

  login: async (token: string) => {
    set({ isLoading: true });
    try {
      const user = await fetchUserProfile(token);
      set({ user, token, isAuthenticated: true });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
}));
```

#### Persistence

```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ... store implementation
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token }), // Only persist token
    }
  )
);
```

## React Query

### Configuration

```typescript
// Query client setup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### Query Patterns

#### Basic Query

```typescript
import { useQuery } from "@tanstack/react-query";
import { fetchTasks } from "@/services/taskService";

const useTasks = () => {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
    staleTime: 5 * 60 * 1000,
  });
};
```

#### Parameterized Query

```typescript
const useTask = (taskId: string) => {
  return useQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => fetchTask(taskId),
    enabled: !!taskId,
  });
};
```

#### Mutation with Optimistic Updates

```typescript
const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTask,
    onMutate: async (updatedTask) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(["tasks"]);

      // Optimistically update
      queryClient.setQueryData(["tasks"], (old: Task[]) =>
        old.map((task) => (task.id === updatedTask.id ? updatedTask : task))
      );

      return { previousTasks };
    },
    onError: (err, updatedTask, context) => {
      // Rollback on error
      queryClient.setQueryData(["tasks"], context?.previousTasks);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};
```

### Cache Management

#### Invalidation Strategies

```typescript
// Invalidate specific queries
queryClient.invalidateQueries({ queryKey: ["tasks"] });

// Invalidate queries with partial matching
queryClient.invalidateQueries({ queryKey: ["tasks"], exact: false });

// Remove queries from cache
queryClient.removeQueries({ queryKey: ["tasks", taskId] });
```

#### Prefetching

```typescript
// Prefetch data for better UX
const prefetchTask = (taskId: string) => {
  queryClient.prefetchQuery({
    queryKey: ["tasks", taskId],
    queryFn: () => fetchTask(taskId),
    staleTime: 5 * 60 * 1000,
  });
};
```

## React Hook Form

### Form Setup

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  categoryId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

const TaskForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const onSubmit = async (data: TaskFormData) => {
    try {
      await createTask(data);
      reset();
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("title")} placeholder="Task title" />
      {errors.title && <span>{errors.title.message}</span>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Task"}
      </button>
    </form>
  );
};
```

### Advanced Form Patterns

#### Dynamic Fields

```typescript
const { fields, append, remove } = useFieldArray({
  control,
  name: "timeWindows",
});

return (
  <div>
    {fields.map((field, index) => (
      <div key={field.id}>
        <input {...register(`timeWindows.${index}.title`)} />
        <button onClick={() => remove(index)}>Remove</button>
      </div>
    ))}
    <button onClick={() => append({ title: "", startTime: "" })}>
      Add Time Window
    </button>
  </div>
);
```

#### Conditional Validation

```typescript
const schema = z
  .object({
    type: z.enum(["task", "event"]),
    title: z.string().min(1),
    duration: z.number().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "task" && !data.duration) {
        return false;
      }
      return true;
    },
    {
      message: "Duration is required for tasks",
      path: ["duration"],
    }
  );
```

## Context Usage

### Simple State Sharing

```typescript
// For simple state that doesn't need persistence or complex logic
const MessageContext = createContext<{
  message: string | null;
  showMessage: (message: string) => void;
  clearMessage: () => void;
} | null>(null);

export const MessageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [message, setMessage] = useState<string | null>(null);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const clearMessage = () => setMessage(null);

  return (
    <MessageContext.Provider value={{ message, showMessage, clearMessage }}>
      {children}
    </MessageContext.Provider>
  );
};
```

## Performance Optimization

### Preventing Unnecessary Re-renders

#### Zustand Selectors

```typescript
// Good: Specific selector
const userName = useAuthStore((state) => state.user?.name);

// Better: Memoized selector
const userName = useAuthStore(useCallback((state) => state.user?.name, []));
```

#### React Query Selectors

```typescript
const taskTitles = useQuery({
  queryKey: ["tasks"],
  queryFn: fetchTasks,
  select: (data) => data.map((task) => task.title), // Only re-render if titles change
});
```

#### Memoization

```typescript
const ExpensiveComponent = React.memo(({ data }) => {
  const processedData = useMemo(() => {
    return expensiveProcessing(data);
  }, [data]);

  return <div>{processedData}</div>;
});
```

## Debugging

### Zustand DevTools

```typescript
export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      // ... store implementation
    }),
    { name: "auth-store" }
  )
);
```

### React Query DevTools

```typescript
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>{/* ... routes */}</Routes>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## Best Practices

### State Management

1. Keep state as close to where it's used as possible
2. Use the right tool for the right type of state
3. Avoid prop drilling with context or global state
4. Normalize complex state structures

### Performance

1. Use selective subscriptions in Zustand
2. Implement proper memoization strategies
3. Optimize React Query cache settings
4. Use React.memo for expensive components

### Testing

1. Mock Zustand stores in tests
2. Use React Query testing utilities
3. Test state transitions and side effects
4. Verify error handling and loading states
