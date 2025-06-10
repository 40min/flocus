import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, AuthContextType } from 'context/AuthContext';
import UserSettingsPage from './UserSettingsPage';
import * as userService from 'services/userService';
import { User } from 'types/user';

jest.mock('services/userService');
const mockedUpdateUser = userService.updateUser as jest.Mock;

const queryClient = new QueryClient();

const mockUser: User = {
  id: 'user1',
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
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
      <AuthContext.Provider value={authContextValue}>
        <UserSettingsPage />
      </AuthContext.Provider>
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

  it('submits form with updated data and shows success message', async () => {
    mockedUpdateUser.mockResolvedValue({ ...mockUser, first_name: 'Updated' });
    renderComponent(mockUser);

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Updated' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpassword123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Update Account' }));

    await waitFor(() => {
      expect(mockedUpdateUser).toHaveBeenCalledWith('user1', {
        email: 'test@example.com',
        first_name: 'Updated',
        last_name: 'User',
        password: 'newpassword123',
      });
    });

    expect(await screen.findByText('Account updated successfully!')).toBeInTheDocument();
    expect(mockLogin).toHaveBeenCalledWith('test-token');
  });
});
