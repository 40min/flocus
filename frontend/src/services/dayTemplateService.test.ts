import {
  getAllDayTemplates,
  getDayTemplateById,
  createDayTemplate,
  updateDayTemplate,
  deleteDayTemplate,
} from './dayTemplateService';
import api from './api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { DayTemplateCreateRequest, DayTemplateUpdateRequest, DayTemplateResponse } from '../types/dayTemplate';

jest.mock('./api');

describe('dayTemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllDayTemplates', () => {
    it('should fetch all day templates successfully', async () => {
      const mockDayTemplates: DayTemplateResponse[] = [
        { id: '1', name: 'Morning Routine', user_id: 'user1', time_windows: [] },
        { id: '2', name: 'Evening Routine', user_id: 'user1', time_windows: [] },
      ];
      (api.get as jest.Mock).mockResolvedValueOnce({ data: mockDayTemplates });

      const result = await getAllDayTemplates();

      expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.DAY_TEMPLATES_BASE);
      expect(result).toEqual(mockDayTemplates);
    });

    it('should throw an error if fetching day templates fails', async () => {
      const errorMessage = 'Failed to fetch day templates';
      (api.get as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(getAllDayTemplates()).rejects.toThrow(errorMessage);
    });
  });

  describe('getDayTemplateById', () => {
    const templateId = '1';
    const mockDayTemplate: DayTemplateResponse = {
      id: templateId,
      name: 'Morning Routine',
      user_id: 'user1',
      time_windows: [],
    };

    it('should fetch a day template by ID successfully', async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({ data: mockDayTemplate });

      const result = await getDayTemplateById(templateId);

      expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.DAY_TEMPLATE_BY_ID(templateId));
      expect(result).toEqual(mockDayTemplate);
    });

    it('should throw an error if fetching a day template by ID fails', async () => {
      const errorMessage = 'Failed to fetch day template';
      (api.get as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(getDayTemplateById(templateId)).rejects.toThrow(errorMessage);
    });
  });

  describe('createDayTemplate', () => {
    const newTemplateData: DayTemplateCreateRequest = { name: 'New Template', time_windows: [] };
    const mockCreatedTemplate: DayTemplateResponse = {
      id: '3',
      name: 'New Template',
      user_id: 'user1',
      time_windows: [],
    };

    it('should create a day template successfully', async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({ data: mockCreatedTemplate });

      const result = await createDayTemplate(newTemplateData);

      expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.DAY_TEMPLATES_BASE, newTemplateData);
      expect(result).toEqual(mockCreatedTemplate);
    });

    it('should throw an error if creating a day template fails', async () => {
      const errorMessage = 'Failed to create day template';
      (api.post as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(createDayTemplate(newTemplateData)).rejects.toThrow(errorMessage);
    });
  });

  describe('updateDayTemplate', () => {
    const templateId = '1';
    const updatedTemplateData: DayTemplateUpdateRequest = { name: 'Updated Morning Routine' };
    const mockUpdatedTemplate: DayTemplateResponse = {
      id: templateId,
      name: 'Updated Morning Routine',
      user_id: 'user1',
      time_windows: [],
    };

    it('should update a day template successfully', async () => {
      (api.patch as jest.Mock).mockResolvedValueOnce({ data: mockUpdatedTemplate });

      const result = await updateDayTemplate(templateId, updatedTemplateData);

      expect(api.patch).toHaveBeenCalledWith(API_ENDPOINTS.DAY_TEMPLATE_BY_ID(templateId), updatedTemplateData);
      expect(result).toEqual(mockUpdatedTemplate);
    });

    it('should throw an error if updating a day template fails', async () => {
      const errorMessage = 'Failed to update day template';
      (api.patch as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(updateDayTemplate(templateId, updatedTemplateData)).rejects.toThrow(errorMessage);
    });
  });

  describe('deleteDayTemplate', () => {
    const templateId = '1';

    it('should delete a day template successfully', async () => {
      (api.delete as jest.Mock).mockResolvedValueOnce({});

      await deleteDayTemplate(templateId);

      expect(api.delete).toHaveBeenCalledWith(API_ENDPOINTS.DAY_TEMPLATE_BY_ID(templateId));
    });

    it('should throw an error if deleting a day template fails', async () => {
      const errorMessage = 'Failed to delete day template';
      (api.delete as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(deleteDayTemplate(templateId)).rejects.toThrow(errorMessage);
    });
  });
});
