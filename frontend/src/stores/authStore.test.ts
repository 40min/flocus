import { renderHook, act } from "@testing-library/react";
import { useAuthStore, initializeAuth } from "./authStore";
import { getCurrentUser } from "../services/userService";

// Mock the userService
jest.mock("../services/userService");
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

// Mock window.dispatchEvent
const mockDispatchEvent = jest.fn();
Object.defineProperty(window, "dispatchEvent", {
  value: mockDispatchEvent,
});

describe("AuthStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });

  describe("login", () => {
    it("should login successfully and fetch user data", async () => {
      const mockUser = {
        id: "1",
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        preferences: {
          pomodoro_timeout_minutes: 25,
          pomodoro_long_timeout_minutes: 15,
          pomodoro_working_interval: 4,
          system_notifications_enabled: true,
          pomodoro_timer_sound: "ding",
        },
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login("test-token");
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "access_token",
        "test-token"
      );
      expect(result.current.token).toBe("test-token");
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle login failure", async () => {
      mockGetCurrentUser.mockRejectedValue(new Error("Failed to fetch user"));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login("invalid-token");
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("access_token");
      expect(result.current.token).toBe(null);
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("logout", () => {
    it("should logout and clear state", () => {
      const { result } = renderHook(() => useAuthStore());

      // Set initial authenticated state
      act(() => {
        useAuthStore.setState({
          user: { id: "1" } as any,
          token: "test-token",
          isAuthenticated: true,
          isLoading: false,
        });
      });

      act(() => {
        result.current.logout();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("access_token");
      expect(result.current.token).toBe(null);
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        new CustomEvent("triggerLogout")
      );
    });
  });

  describe("fetchUserData", () => {
    it("should fetch user data when token exists", async () => {
      const mockUser = {
        id: "1",
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        preferences: {
          pomodoro_timeout_minutes: 25,
          pomodoro_long_timeout_minutes: 15,
          pomodoro_working_interval: 4,
          system_notifications_enabled: true,
          pomodoro_timer_sound: "ding",
        },
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuthStore());

      // Set token first
      act(() => {
        useAuthStore.setState({ token: "test-token" });
      });

      await act(async () => {
        await result.current.fetchUserData();
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("should not fetch user data when no token exists", async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.fetchUserData();
      });

      expect(mockGetCurrentUser).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("initializeAuth", () => {
    it("should initialize auth with existing token", async () => {
      const mockUser = {
        id: "1",
        username: "testuser",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        preferences: {
          pomodoro_timeout_minutes: 25,
          pomodoro_long_timeout_minutes: 15,
          pomodoro_working_interval: 4,
          system_notifications_enabled: true,
          pomodoro_timer_sound: "ding",
        },
      };

      mockGetCurrentUser.mockResolvedValue(mockUser);

      // Set token in store
      act(() => {
        useAuthStore.setState({ token: "existing-token" });
      });

      await act(async () => {
        await initializeAuth();
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it("should initialize auth without token", async () => {
      await act(async () => {
        await initializeAuth();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });
});
