import { loginUser, registerUser, logoutUser, UserCredentials, UserRegistrationData, AuthResponse } from './authService';
import api from './api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { User } from '../types/user';

// Mock the api module
jest.mock('./api', () => ({
  post: jest.fn(),
}));

// --- localStorage Mock Setup ---
let moduleLevelStore: { [key: string]: string | null } = {};

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true, // Important for Jest to be able to manage/redefine mocks if needed
});
// --- End of localStorage Mock Setup ---

describe('authService', () => {
  beforeEach(() => {
    // Reset the store's state before each test
    moduleLevelStore = {};

    // Define or redefine mock implementations for each test
    localStorageMock.getItem.mockImplementation((key: string): string | null => {
      const value = moduleLevelStore[key];
      // HTML localStorage.getItem returns null if the key does not exist.
      return value === undefined ? null : value;
    });
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      moduleLevelStore[key] = value.toString();
    });
    localStorageMock.removeItem.mockImplementation((key: string) => {
      delete moduleLevelStore[key]; // This makes the key undefined in the store
    });
    localStorageMock.clear.mockImplementation(() => {
      moduleLevelStore = {};
    });

    // Clear call history for all mocks to ensure test isolation
    (api.post as jest.Mock).mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  describe('loginUser', () => {
    const loginCredentials: UserCredentials = { username: 'test@example.com', password: 'password123' };
    const mockAuthResponse: AuthResponse = { access_token: 'fake-token', token_type: 'bearer' };

    it('should call api.post with correct endpoint and credentials, and return auth response on success', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({ data: mockAuthResponse });

      const result = await loginUser(loginCredentials);

      const expectedFormData = new URLSearchParams();
      expectedFormData.append('username', loginCredentials.username);
      expectedFormData.append('password', loginCredentials.password);

      expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.LOGIN, expectedFormData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw an error if api.post fails', async () => {
      const errorMessage = 'Login failed';
      (api.post as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(loginUser(loginCredentials)).rejects.toThrow(errorMessage);
    });
  });

  describe('registerUser', () => {
    const registerData: UserRegistrationData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
    };
    const mockUserResponse: User = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
    };

    it('should call api.post with correct endpoint and user data, and return user data on success', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({ data: mockUserResponse });

      const result = await registerUser(registerData);

      expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.REGISTER, registerData);
      expect(result).toEqual(mockUserResponse);
    });

    it('should throw an error if api.post fails', async () => {
      const errorMessage = 'Registration failed';
      (api.post as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(registerUser(registerData)).rejects.toThrow(errorMessage);
    });
  });

  describe('logoutUser', () => {
    it('should remove token and user from localStorage', () => {
      // Setup: put items into the mock store
      localStorageMock.setItem('user', JSON.stringify({ id: '1', email: 'test@example.com' }));
      localStorageMock.setItem('token', 'fake-token');

      // Action: call the function that uses localStorage.removeItem
      logoutUser();

      // Assertions
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');

      // Verify items are indeed removed (getItem should now return null)
      expect(localStorageMock.getItem('user')).toBeNull();
      expect(localStorageMock.getItem('token')).toBeNull();
    });
  });
});
