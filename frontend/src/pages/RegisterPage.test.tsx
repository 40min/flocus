import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext, AuthContextType } from '../context/AuthContext';
import RegisterPage from './RegisterPage';
import * as authService from '../services/authService';

// Mock authService
jest.mock('../services/authService');

const mockLogin = jest.fn();
const mockLogout = jest.fn();

const mockAuthContextValue: AuthContextType = {
  user: null,
  token: null,
  login: mockLogin,
  logout: mockLogout,
  isLoading: false,
  isAuthenticated: false,
};

const renderWithRouterAndAuthContext = (ui: React.ReactElement, authValue?: Partial<AuthContextType>) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={{ ...mockAuthContextValue, ...authValue }}>
        {ui}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders register form', () => {
    renderWithRouterAndAuthContext(<RegisterPage />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  test('allows typing in form fields', () => {
    renderWithRouterAndAuthContext(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });

    expect(screen.getByLabelText(/username/i)).toHaveValue('testuser');
    expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com');
    expect(screen.getByLabelText(/first name/i)).toHaveValue('Test');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('User');
    expect(screen.getByLabelText(/password/i)).toHaveValue('password123');
  });

  test('submits form and calls register service on successful registration', async () => {
    const mockRegister = authService.registerUser as jest.Mock;
    mockRegister.mockResolvedValueOnce({ id: '1', username: 'testuser', email: 'test@example.com' });

    renderWithRouterAndAuthContext(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        password: 'password123',
      });
    });
    // Expect navigation or success message, depending on implementation
    // For now, we just check if login was called by the AuthContext after successful registration
    // This depends on how RegisterPage handles successful registration and updates AuthContext
    // await waitFor(() => expect(mockLogin).toHaveBeenCalled()); // This might need adjustment
  });

  test('displays error message on failed registration', async () => {
    const mockRegister = authService.registerUser as jest.Mock;
    mockRegister.mockRejectedValueOnce(new Error('Registration failed'));

    renderWithRouterAndAuthContext(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        password: 'password123',
      });
    });

    // Check for the error message text
    expect(await screen.findByText(/Registration failed/i)).toBeInTheDocument();
  });

  test('navigates to login page link', () => {
    renderWithRouterAndAuthContext(<RegisterPage />);
    const loginLink = screen.getByRole('link', { name: /already have an account\? sign in here/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});
