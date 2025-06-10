import {
  getAllTimeWindows,
  createTimeWindow,
  updateTimeWindow,
  deleteTimeWindow,
} from './timeWindowService';
import api from './api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { TimeWindow, TimeWindowCreateRequest, TimeWindowUpdateRequest } from '../types/timeWindow';
import { Category } from '../types/category';

jest.mock('./api');

const mockCategory: Category = {
  id: 'cat1',
  name: 'Work',
  user_id: 'user1',
  is_deleted: false,
};

const mockTimeWindow: TimeWindow = {
  id: 'tw1',
  description: 'Morning Focus',
  start_time: 540,
  end_time: 660,
  category: mockCategory,
  day_template_id: 'dt1',
  user_id: 'user1',
  is_deleted: false,
};

describe('timeWindowService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTimeWindows', () => {
    it('should fetch all time windows successfully', async () => {
      const mockTimeWindows: TimeWindow[] = [mockTimeWindow];
      (api.get as jest.Mock).mockResolvedValueOnce({ data: mockTimeWindows });

      const result = await getAllTimeWindows();

      expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.TIME_WINDOWS_BASE);
      expect(result).toEqual(mockTimeWindows);
    });

    it('should throw an error if fetching time windows fails', async () => {
      const errorMessage = 'Failed to fetch time windows';
      (api.get as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(getAllTimeWindows()).rejects.toThrow(errorMessage);
    });
  });

  describe('createTimeWindow', () => {
    const newTimeWindowData: TimeWindowCreateRequest = {
      description: 'New Focus Block',
      start_time: 720,
      end_time: 780,
      category_id: 'cat1',
    };
    const mockCreatedTimeWindow: TimeWindow = { ...mockTimeWindow, ...newTimeWindowData, id: 'tw2' };

    it('should create a time window successfully', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({ data: mockCreatedTimeWindow });

      const result = await createTimeWindow(newTimeWindowData);

      expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.TIME_WINDOWS_BASE, newTimeWindowData);
      expect(result).toEqual(mockCreatedTimeWindow);
    });

    it('should throw an error if creating a time window fails', async () => {
      const errorMessage = 'Failed to create time window';
      (api.post as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(createTimeWindow(newTimeWindowData)).rejects.toThrow(errorMessage);
    });
  });

  describe('updateTimeWindow', () => {
    const timeWindowId = 'tw1';
    const updatedTimeWindowData: TimeWindowUpdateRequest = { description: 'Updated Morning Focus' };
    const mockUpdatedTimeWindow: TimeWindow = { ...mockTimeWindow, ...updatedTimeWindowData };

    it('should update a time window successfully', async () => {
      (api.patch as jest.Mock).mockResolvedValueOnce({ data: mockUpdatedTimeWindow });

      const result = await updateTimeWindow(timeWindowId, updatedTimeWindowData);

      expect(api.patch).toHaveBeenCalledWith(API_ENDPOINTS.TIME_WINDOW_BY_ID(timeWindowId), updatedTimeWindowData);
      expect(result).toEqual(mockUpdatedTimeWindow);
    });

    it('should throw an error if updating a time window fails', async () => {
      const errorMessage = 'Failed to update time window';
      (api.patch as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(updateTimeWindow(timeWindowId, updatedTimeWindowData)).rejects.toThrow(errorMessage);
    });
  });

  describe('deleteTimeWindow', () => {
    const timeWindowId = 'tw1';

    it('should delete a time window successfully', async () => {
      (api.delete as jest.Mock).mockResolvedValueOnce({});

      await deleteTimeWindow(timeWindowId);

      expect(api.delete).toHaveBeenCalledWith(API_ENDPOINTS.TIME_WINDOW_BY_ID(timeWindowId));
    });

    it('should throw an error if deleting a time window fails', async () => {
      const errorMessage = 'Failed to delete time window';
      (api.delete as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(deleteTimeWindow(timeWindowId)).rejects.toThrow(errorMessage);
    });
  });
});
