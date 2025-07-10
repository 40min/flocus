import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { User } from '../types/user';
import * as userService from '../services/userService';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const TestComponent: React.FC = () => {
  const { isAuthenticated, user, token, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="isAuthenticated">{isAuthenticated.toString()}</div>
      <div data-testid="user">{JSON.stringify(user)}</div>
      <div data-testid="token">{token}</div>
      <button onClick={() => login('test-token')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks(); // Clear all mocks before each test
  });

  test('initial context state', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('token')).toHaveTextContent('');
  });

  test('login action updates context and localStorage', async () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      preferences: {
        pomodoro_timeout_minutes: 25,
        pomodoro_working_interval: 25,
        system_notifications_enabled: true,
      },
    };
    // Mock getCurrentUser to simulate successful user fetch
    const getCurrentUserSpy = jest.spyOn(userService, 'getCurrentUser').mockResolvedValue(mockUser);

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(getCurrentUserSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
    expect(screen.getByTestId('token')).toHaveTextContent('test-token');
    expect(localStorageMock.getItem('access_token')).toBe('test-token');
    // User data is not directly stored in localStorage by AuthContext, only token
    expect(localStorageMock.getItem('user')).toBeNull();
  });

  test('logout action clears context and localStorage', async () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      preferences: {
        pomodoro_timeout_minutes: 25,
        pomodoro_working_interval: 25,
        system_notifications_enabled: true,
      },
    };
    const getCurrentUserSpy = jest.spyOn(userService, 'getCurrentUser').mockResolvedValue(mockUser);

    // First, log in
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(getCurrentUserSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true'); // Verify login was successful

    // Then, log out
    act(() => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('token')).toHaveTextContent('');
    expect(localStorageMock.getItem('access_token')).toBeNull();
    expect(localStorageMock.getItem('user')).toBeNull();
  });

  test('loads token and user from localStorage on initial mount', async () => {
    const mockStoredUser: User = {
      id: '2',
      email: 'stored@example.com',
      username: 'storeduser',
      first_name: 'Stored',
      last_name: 'User',
      preferences: {
        pomodoro_timeout_minutes: 25,
        pomodoro_working_interval: 25,
        system_notifications_enabled: true,
      },
    };
    localStorageMock.setItem('access_token', 'stored-token');
    // AuthContext does not store user in localStorage, it fetches it.
    // So, we mock getCurrentUser for this scenario as well.
    const getCurrentUserSpy = jest.spyOn(userService, 'getCurrentUser').mockResolvedValue(mockStoredUser);


    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
        render(
          <MemoryRouter>
            <AuthProvider>
              <TestComponent />
            </AuthProvider>
          </MemoryRouter>
          );
    });


    expect(getCurrentUserSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockStoredUser));
    expect(screen.getByTestId('token')).toHaveTextContent('stored-token');
  });
});
