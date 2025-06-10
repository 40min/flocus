import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTemplates, useTemplateById } from 'hooks/useTemplates';
import * as dayTemplateService from 'services/dayTemplateService';
import { DayTemplateResponse } from 'types/dayTemplate';

jest.mock('services/dayTemplateService');
const mockedDayTemplateService = dayTemplateService as jest.Mocked<typeof dayTemplateService>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockTemplates: DayTemplateResponse[] = [
  { id: 'template1', name: 'Morning Routine', user_id: 'user1', time_windows: [] },
  { id: 'template2', name: 'Work Day', user_id: 'user1', time_windows: [] },
];

const mockTemplate: DayTemplateResponse = {
  id: 'template1',
  name: 'Morning Routine',
  user_id: 'user1',
  time_windows: [],
};

describe('useTemplates hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  describe('useTemplates', () => {
    it('should fetch all templates', async () => {
      mockedDayTemplateService.getAllDayTemplates.mockResolvedValue(mockTemplates);

      const { result } = renderHook(() => useTemplates(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockTemplates);
      expect(mockedDayTemplateService.getAllDayTemplates).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when fetching all templates', async () => {
      const errorMessage = 'Failed to fetch templates';
      mockedDayTemplateService.getAllDayTemplates.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useTemplates(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe(errorMessage);
    });
  });

  describe('useTemplateById', () => {
    it('should fetch a template by its ID', async () => {
      mockedDayTemplateService.getDayTemplateById.mockResolvedValue(mockTemplate);

      const { result } = renderHook(() => useTemplateById('template1'), { wrapper });

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockTemplate);
      expect(mockedDayTemplateService.getDayTemplateById).toHaveBeenCalledWith('template1');
      expect(mockedDayTemplateService.getDayTemplateById).toHaveBeenCalledTimes(1);
    });

    it('should not fetch if templateId is undefined', () => {
      const { result } = renderHook(() => useTemplateById(undefined), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(mockedDayTemplateService.getDayTemplateById).not.toHaveBeenCalled();
    });

    it('should handle errors when fetching a template by ID', async () => {
      const errorMessage = 'Template not found';
      mockedDayTemplateService.getDayTemplateById.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useTemplateById('template1'), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe(errorMessage);
    });
  });
});
