import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthContextType } from '../context/AuthContext';
import LoginPage from './LoginPage';
import * as authService from '../services/authService';
import { User } from '../types/user';

// Mock authService
jest.mock('../services/authService');
const mockedLoginUser = authService.loginUser as jest.MockedFunction<typeof authService.loginUser>;

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockUser: User = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
};

const mockLogin = jest.fn();
const mockLogout = jest.fn();

const initialAuthContextValue: AuthContextType = {
  isAuthenticated: false,
  user: null,
  token: null,
  login: mockLogin,
  logout: mockLogout,
  isLoading: false,
};

const renderLoginPage = (authContextValue: AuthContextType = initialAuthContextValue) => {
  return render(
    <AuthContext.Provider value={authContextValue}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set initial route to /login for each test
    window.history.pushState({}, 'Test page', '/login');
  });

  test('renders login form correctly', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account\? register here/i)).toBeInTheDocument();
  });

  test('allows typing in username and password fields', () => {
    renderLoginPage();
    const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(usernameInput.value).toBe('testuser');
    expect(passwordInput.value).toBe('password123');
  });

  test('submits form and calls loginUser and AuthContext.login on successful login, then navigates to home', async () => {
    mockedLoginUser.mockResolvedValueOnce({ access_token: 'fake_token', token_type: 'bearer' });
    mockLogin.mockResolvedValueOnce(undefined); // AuthContext's login

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in.../i })).toBeDisabled();

    await waitFor(() => {
      expect(mockedLoginUser).toHaveBeenCalledWith({ username: 'testuser', password: 'password123' });
    });
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('fake_token');
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('displays error message on failed login (generic error)', async () => {
    mockedLoginUser.mockRejectedValueOnce(new Error('Login failed'));

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'wronguser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Login failed')).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('displays specific error message from AxiosError on failed login', async () => {
    const axiosError = new Error('Request failed with status code 400') as any;
    axiosError.isAxiosError = true;
    axiosError.response = { data: { detail: 'Invalid credentials provided.' } };
    mockedLoginUser.mockRejectedValueOnce(axiosError);

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials provided.')).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('clears error message when user types in input fields', async () => {
    mockedLoginUser.mockRejectedValueOnce(new Error('Initial error')); // For the first submit
    renderLoginPage();

    // Trigger initial error
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText('Initial error')).toBeInTheDocument();
    });

    // Type in username field
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'u' } });
    expect(screen.queryByText('Initial error')).not.toBeInTheDocument();

    // Trigger error again
    // Ensure the mock is set up for the second submit as well
    mockedLoginUser.mockRejectedValueOnce(new Error('Initial error again'));
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText('Initial error again')).toBeInTheDocument();
    });

    // Type in password field
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'p' } });
    expect(screen.queryByText('Initial error again')).not.toBeInTheDocument();
  });

  test('navigates to register page when "Register here" link is clicked', () => {
    renderLoginPage();
    const registerLink = screen.getByRole('link', { name: /don't have an account\? register here/i });
    fireEvent.click(registerLink);
    // We can't directly test navigation with mockNavigate here as it's a Link component
    // but we can check if the link has the correct href
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  test('shows loading state on submit button during login process', async () => {
    mockedLoginUser.mockImplementation(() => {
      return new Promise(resolve => setTimeout(() => resolve({ access_token: 'token', token_type: 'bearer' }), 100));
    });
    mockLogin.mockResolvedValueOnce(undefined);

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in.../i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /signing in.../i })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
    });
  });
});
