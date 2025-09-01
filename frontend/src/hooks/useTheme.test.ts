import { renderHook } from '@testing-library/react';
import { useTheme } from './useTheme';
import { useAuthStore } from '../stores/authStore';
import { updateUser } from '../services/userService';

// Mock the auth store
jest.mock('../stores/authStore');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock the updateUser service
jest.mock('../services/userService');
const mockUpdateUser = updateUser as jest.MockedFunction<typeof updateUser>;

describe('useTheme hook', () => {
  const mockSetTheme = jest.fn();
  const mockUser = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    preferences: {
      pomodoro_timeout_minutes: 25,
      pomodoro_long_timeout_minutes: 15,
      pomodoro_working_interval: 4,
      system_notifications_enabled: true,
      pomodoro_timer_sound: 'ding',
      theme: 'summer',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      token: 'test-token',
      theme: 'summer',
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      fetchUserData: jest.fn(),
      setLoading: jest.fn(),
      setNavigate: jest.fn(),
      setTheme: mockSetTheme,
    });

    // Mock document.documentElement
    Object.defineProperty(document, 'documentElement', {
      value: {
        classList: {
          remove: jest.fn(),
          add: jest.fn(),
          [Symbol.iterator]: function* () {
            yield 'some-class';
            yield 'theme-summer';
            yield 'theme-autumn';
            yield 'another-class';
          },
        },
      },
      writable: true,
    });
  });

  it('should return current theme and setTheme function', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('summer');
    expect(typeof result.current.setTheme).toBe('function');
  });

  it('should apply theme class to document element on mount', () => {
    renderHook(() => useTheme());

    expect(document.documentElement.classList.remove).toHaveBeenCalledWith('theme-summer');
    expect(document.documentElement.classList.remove).toHaveBeenCalledWith('theme-autumn');
    expect(document.documentElement.classList.add).toHaveBeenCalledWith('theme-summer');
  });

  it('should update theme when setTheme is called', async () => {
    mockUpdateUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useTheme());

    await result.current.setTheme('autumn');

    expect(mockSetTheme).toHaveBeenCalledWith('autumn');
    expect(mockUpdateUser).toHaveBeenCalledWith('1', { preferences: { theme: 'autumn' } });
  });

  it('should revert theme on API error', async () => {
    mockUpdateUser.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useTheme());

    await result.current.setTheme('autumn');

    expect(mockSetTheme).toHaveBeenCalledWith('autumn');
    expect(mockSetTheme).toHaveBeenCalledWith('summer'); // Revert on error
  });

  it('should not update if no user', async () => {
    mockUseAuthStore.mockReturnValue({
      ...mockUseAuthStore(),
      user: null,
    });

    const { result } = renderHook(() => useTheme());

    await result.current.setTheme('autumn');

    expect(mockSetTheme).not.toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});
