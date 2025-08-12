import { renderHook } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useAuthStore } from "../stores/authStore";

// Mock the auth store
jest.mock("../stores/authStore");
const mockUseAuthStore = useAuthStore as jest.MockedFunction<
  typeof useAuthStore
>;

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("useAuth hook", () => {
  const mockSetNavigate = jest.fn();
  const mockLogin = jest.fn();
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthStore.mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: mockLogout,
      fetchUserData: jest.fn(),
      setLoading: jest.fn(),
      setNavigate: mockSetNavigate,
    });
  });

  it("should return auth state and functions", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrowserRouter>{children}</BrowserRouter>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toEqual({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: mockLogout,
    });
  });

  it("should set navigate function in store", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrowserRouter>{children}</BrowserRouter>
    );

    renderHook(() => useAuth(), { wrapper });

    expect(mockSetNavigate).toHaveBeenCalledWith(mockNavigate);
  });

  it("should return authenticated state when user is logged in", () => {
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

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      token: "test-token",
      isAuthenticated: true,
      isLoading: false,
      login: mockLogin,
      logout: mockLogout,
      fetchUserData: jest.fn(),
      setLoading: jest.fn(),
      setNavigate: mockSetNavigate,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrowserRouter>{children}</BrowserRouter>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe("test-token");
    expect(result.current.isAuthenticated).toBe(true);
  });
});
