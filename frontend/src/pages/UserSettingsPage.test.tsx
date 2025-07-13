import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, AuthContextType } from '../context/AuthContext';
import UserSettingsPage from './UserSettingsPage';
import * as userService from '../services/userService';
import { User } from '../types/user';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../services/userService');
const mockedUpdateUser = userService.updateUser as jest.Mock;

const queryClient = new QueryClient();

const mockUser: User = {
  id: 'user1',
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  preferences: {
    pomodoro_timeout_minutes: 5,
    pomodoro_long_timeout_minutes: 15,
    pomodoro_working_interval: 25,
    system_notifications_enabled: true,
    pomodoro_timer_sound: 'none',
  },
};

const mockLogin = jest.fn();

const renderComponent = (user: User | null) => {
  const authContextValue: AuthContextType = {
    isAuthenticated: !!user,
    user,
    token: user ? 'test-token' : null,
    login: mockLogin,
    logout: jest.fn(),
    isLoading: false,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthContext.Provider value={authContextValue}>
          <UserSettingsPage />
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('UserSettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state if user is not available yet', () => {
    renderComponent(null);
    expect(screen.getByText('Loading user data...')).toBeInTheDocument();
  });

  it('renders form with user data pre-filled', () => {
    renderComponent(mockUser);
    expect(screen.getByLabelText('Username')).toHaveValue(mockUser.username);
    expect(screen.getByLabelText('Username')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Email')).toHaveValue(mockUser.email);
    expect(screen.getByLabelText('First Name')).toHaveValue(mockUser.first_name);
    expect(screen.getByLabelText('Last Name')).toHaveValue(mockUser.last_name);
  });

  it('pre-fills preferences form with user data', () => {
    renderComponent(mockUser);
    expect(screen.getByRole('combobox', { name: 'Pomodoro working interval' })).toHaveValue(String(mockUser.preferences.pomodoro_working_interval));
    expect(screen.getByRole('combobox', { name: 'Pomodoro long break duration' })).toHaveValue(String(mockUser.preferences.pomodoro_long_timeout_minutes));
    expect(screen.getByRole('combobox', { name: 'Pomodoro break duration' })).toHaveValue(String(mockUser.preferences.pomodoro_timeout_minutes));
    expect(screen.getByRole('checkbox', { name: 'System notifications' })).toBeChecked();
    expect(screen.getByLabelText('Timer Sound')).toHaveValue('none');
  });

  it('submits form with updated data and shows success message', async () => {
    mockedUpdateUser.mockResolvedValue({ ...mockUser, first_name: 'Updated' });
    renderComponent(mockUser);

    await act(async () => {
      fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Updated' } });
      fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpassword123' } });
      fireEvent.change(screen.getByRole('combobox', { name: 'Pomodoro long break duration' }), { target: { value: '20' } });
      fireEvent.change(screen.getByRole('combobox', { name: 'Pomodoro working interval' }), { target: { value: '45' } });
      fireEvent.change(screen.getByRole('combobox', { name: 'Pomodoro break duration' }), { target: { value: '5' } });
            fireEvent.change(screen.getByLabelText('Timer Sound'), { target: { value: 'ding.mp3' } });
      fireEvent.click(screen.getByRole('checkbox', { name: 'System notifications' }));
      fireEvent.click(screen.getByRole('button', { name: 'Update Account' }));
    });

    await waitFor(() => {
      expect(mockedUpdateUser).toHaveBeenCalledWith('user1', {
        email: 'test@example.com',
        first_name: 'Updated',
        last_name: 'User',
        password: 'newpassword123',
        preferences: {
          pomodoro_timeout_minutes: 5,
          pomodoro_long_timeout_minutes: 20,
          pomodoro_working_interval: 45,
          system_notifications_enabled: false,
          pomodoro_timer_sound: 'ding.mp3',
        },
      });
    });

    expect(await screen.findByText('Account updated successfully!')).toBeInTheDocument();
    expect(mockLogin).toHaveBeenCalledWith('test-token');
  });

  it('shows an error message if the update fails', async () => {
    const errorMessage = 'Failed to update';
    mockedUpdateUser.mockRejectedValue(new Error(errorMessage));
    renderComponent(mockUser);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Update Account' }));
    });

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });

  it('disables the submit button while the form is submitting', async () => {
    mockedUpdateUser.mockResolvedValue({ ...mockUser });
    renderComponent(mockUser);

    fireEvent.click(screen.getByRole('button', { name: 'Update Account' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Update Account' })).toBeDisabled();
    });
  });

  it('shows validation errors for invalid fields', async () => {
    renderComponent(mockUser);

    await act(async () => {
      fireEvent.change(screen.getByLabelText('First Name'), { target: { value: '' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
      fireEvent.click(screen.getByRole('button', { name: 'Update Account' }));
    });

    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
    expect(mockedUpdateUser).not.toHaveBeenCalled();
  });

  it('allows updating preferences without changing the password', async () => {
    mockedUpdateUser.mockResolvedValue({ ...mockUser });
    renderComponent(mockUser);

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Pomodoro working interval' }), { target: { value: '60' } });
      fireEvent.click(screen.getByRole('button', { name: 'Update Account' }));
    });

    await waitFor(() => {
      expect(mockedUpdateUser).toHaveBeenCalledWith('user1', {
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        preferences: {
          pomodoro_timeout_minutes: 5,
          pomodoro_long_timeout_minutes: 15,
          pomodoro_working_interval: 60,
          system_notifications_enabled: true,
          pomodoro_timer_sound: 'none',
        },
      });
    });
  });

  it('clears the success message after a timeout', async () => {
    jest.useFakeTimers();
    mockedUpdateUser.mockResolvedValue({ ...mockUser });
    renderComponent(mockUser);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Update Account' }));
    });

    expect(await screen.findByText('Account updated successfully!')).toBeInTheDocument();

    await act(async () => {
      jest.runAllTimers();
    });

    expect(screen.queryByText('Account updated successfully!')).not.toBeInTheDocument();
    jest.useRealTimers();
  });
});
