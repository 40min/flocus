import { getAllUsers, getCurrentUser, getUserById, updateUser } from './userService';
import api from './api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { User, UserUpdatePayload } from '../types/user';

jest.mock('./api');

const mockUser: User = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  preferences: {
    pomodoro_timeout_minutes: 5,
    pomodoro_working_interval: 25,
    system_notifications_enabled: true,
    pomodoro_timer_sound: 'none'
 },
};

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should fetch all users successfully', async () => {
      const mockUsers: User[] = [mockUser];
      (api.get as jest.Mock).mockResolvedValueOnce({ data: mockUsers });

      const result = await getAllUsers();

      expect(api.get).toHaveBeenCalledWith(`${API_ENDPOINTS.USERS_BASE}/`);
      expect(result).toEqual(mockUsers);
    });

    it('should throw an error if fetching users fails', async () => {
      const errorMessage = 'Failed to fetch users';
      (api.get as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(getAllUsers()).rejects.toThrow(errorMessage);
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch the current user successfully', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({ data: mockUser });

      const result = await getCurrentUser();

      expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.USERS_ME);
      expect(result).toEqual(mockUser);
    });

    it('should throw an error if fetching the current user fails', async () => {
      const errorMessage = 'Failed to fetch current user';
      (api.get as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(getCurrentUser()).rejects.toThrow(errorMessage);
    });
  });

  describe('getUserById', () => {
    const userId = '1';

    it('should fetch a user by ID successfully', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({ data: mockUser });

      const result = await getUserById(userId);

      expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.USER_BY_ID(userId));
      expect(result).toEqual(mockUser);
    });

    it('should throw an error if fetching a user by ID fails', async () => {
      const errorMessage = 'Failed to fetch user';
      (api.get as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(getUserById(userId)).rejects.toThrow(errorMessage);
    });
  });

  describe('updateUser', () => {
    const userId = '1';
    const updatedUserData: UserUpdatePayload = { first_name: 'Updated' };
    const mockUpdatedUser: User = {
      ...mockUser,
      ...updatedUserData,
      preferences: { ...mockUser.preferences, ...updatedUserData.preferences },
    };

    it('should update a user successfully', async () => {
      (api.put as jest.Mock).mockResolvedValueOnce({ data: mockUpdatedUser });

      const result = await updateUser(userId, updatedUserData);

      expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.USER_BY_ID(userId), updatedUserData);
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should throw an error if updating a user fails', async () => {
      const errorMessage = 'Failed to update user';
      (api.put as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(updateUser(userId, updatedUserData)).rejects.toThrow(errorMessage);
    });
  });
});
