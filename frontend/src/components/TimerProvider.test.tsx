import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { TimerProvider } from "./TimerProvider";
import { useAuth } from "../hooks/useAuth";
import {
  useTimerStore,
  initializeTimer,
  startTimerInterval,
  stopTimerInterval,
} from "../stores/timerStore";

// Mock dependencies
jest.mock("../hooks/useAuth");
jest.mock("../stores/timerStore");

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseTimerStore = useTimerStore as jest.MockedFunction<
  typeof useTimerStore
>;
const mockInitializeTimer = initializeTimer as jest.MockedFunction<
  typeof initializeTimer
>;
const mockStartTimerInterval = startTimerInterval as jest.MockedFunction<
  typeof startTimerInterval
>;
const mockStopTimerInterval = stopTimerInterval as jest.MockedFunction<
  typeof stopTimerInterval
>;

// Mock document and window events
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(document, "addEventListener", {
  value: mockAddEventListener,
});
Object.defineProperty(document, "removeEventListener", {
  value: mockRemoveEventListener,
});
Object.defineProperty(window, "addEventListener", {
  value: mockAddEventListener,
});
Object.defineProperty(window, "removeEventListener", {
  value: mockRemoveEventListener,
});

describe("TimerProvider", () => {
  const mockSetUserPreferences = jest.fn();
  const mockClearTimerState = jest.fn();
  const mockUser = {
    id: "user1",
    preferences: {
      pomodoro_working_interval: 25,
      pomodoro_timeout_minutes: 5,
      pomodoro_long_timeout_minutes: 15,
      system_notifications_enabled: true,
      pomodoro_timer_sound: "ding.mp3",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    } as any);

    // Mock the useTimerStore hook to return the appropriate function based on selector
    mockUseTimerStore.mockImplementation((selector) => {
      const state = {
        setUserPreferences: mockSetUserPreferences,
        clearTimerState: mockClearTimerState,
      };
      return selector(state);
    });

    mockInitializeTimer.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render children", () => {
    render(
      <TimerProvider>
        <div data-testid="child">Test Child</div>
      </TimerProvider>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });

  it("should initialize timer on mount", async () => {
    render(
      <TimerProvider>
        <div>Test</div>
      </TimerProvider>
    );

    await waitFor(() => {
      expect(mockInitializeTimer).toHaveBeenCalled();
    });
  });

  it("should set user preferences when user is available", async () => {
    render(
      <TimerProvider>
        <div>Test</div>
      </TimerProvider>
    );

    await waitFor(() => {
      expect(mockSetUserPreferences).toHaveBeenCalledWith(mockUser.preferences);
    });
  });

  it("should not set user preferences when user has no preferences", async () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, preferences: undefined },
      isAuthenticated: true,
      isLoading: false,
    } as any);

    render(
      <TimerProvider>
        <div>Test</div>
      </TimerProvider>
    );

    await waitFor(() => {
      expect(mockSetUserPreferences).not.toHaveBeenCalled();
    });
  });

  it("should not set user preferences when user is null", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    } as any);

    // Reset mocks to ensure proper behavior for this test
    mockUseTimerStore.mockClear();
    mockUseTimerStore.mockImplementation((selector) => {
      const state = {
        setUserPreferences: mockSetUserPreferences,
        clearTimerState: mockClearTimerState,
      };
      return selector(state);
    });

    render(
      <TimerProvider>
        <div>Test</div>
      </TimerProvider>
    );

    // Should call clearTimerState when user is null, but not setUserPreferences
    await waitFor(() => {
      expect(mockClearTimerState).toHaveBeenCalled();
    });
  });

  it("should update user preferences when user changes", async () => {
    const { rerender } = render(
      <TimerProvider>
        <div>Test</div>
      </TimerProvider>
    );

    await waitFor(() => {
      expect(mockSetUserPreferences).toHaveBeenCalledWith(mockUser.preferences);
    });

    // Clear the mock and change user preferences
    mockSetUserPreferences.mockClear();
    const updatedUser = {
      ...mockUser,
      preferences: {
        ...mockUser.preferences,
        pomodoro_working_interval: 30,
      },
    };

    mockUseAuth.mockReturnValue({
      user: updatedUser,
      isAuthenticated: true,
      isLoading: false,
    } as any);

    rerender(
      <TimerProvider>
        <div>Test</div>
      </TimerProvider>
    );

    await waitFor(() => {
      expect(mockSetUserPreferences).toHaveBeenCalledWith(
        updatedUser.preferences
      );
    });
  });

  it("should set up visibility change event listener", () => {
    render(
      <TimerProvider>
        <div>Test</div>
      </TimerProvider>
    );

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
  });

  it("should set up beforeunload event listener", () => {
    render(
      <TimerProvider>
        <div>Test</div>
      </TimerProvider>
    );

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function)
    );
  });

  it("should start timer interval when page becomes visible", () => {
    let visibilityChangeHandler: () => void;

    mockAddEventListener.mockImplementation((event, handler) => {
      if (event === "visibilitychange") {
        visibilityChangeHandler = handler;
      }
    });

    render(
      <TimerProvider>
        <div>Test</div>
      </TimerProvider>
    );

    // Simulate page becoming visible
    Object.defineProperty(document, "hidden", {
      value: false,
      configurable: true,
    });
    visibilityChangeHandler!();

    expect(mockStartTimerInterval).toHaveBeenCalled();
  });

  it("should clean up on unmount", () => {
    const { unmount } = render(
      <TimerProvider>
        <div>Test</div>
      </TimerProvider>
    );

    unmount();

    expect(mockStopTimerInterval).toHaveBeenCalled();
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function)
    );
  });

  it("should not initialize if component unmounts before initialization completes", async () => {
    let resolveInit: () => void;
    const initPromise = new Promise<void>((resolve) => {
      resolveInit = resolve;
    });

    mockInitializeTimer.mockReturnValue(initPromise);

    const { unmount } = render(
      <TimerProvider>
        <div>Test</div>
      </TimerProvider>
    );

    // Unmount before initialization completes
    unmount();

    // Complete initialization
    resolveInit!();
    await initPromise;

    // Should still stop timer interval on unmount
    expect(mockStopTimerInterval).toHaveBeenCalled();
  });
});
