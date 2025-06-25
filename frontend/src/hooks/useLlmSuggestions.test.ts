import { renderHook, act, waitFor } from '@testing-library/react';
import { useLlmSuggestions } from './useLlmSuggestions';
import * as taskService from 'services/taskService';
import { LLMImprovementResponse } from 'types/task';

// Mock the taskService
jest.mock('services/taskService');

const mockGetLlmImprovement = jest.spyOn(taskService, 'getLlmImprovement');

describe('useLlmSuggestions', () => {
  let getValuesMock: jest.Mock;
  let setValueMock: jest.Mock;

  beforeEach(() => {
    getValuesMock = jest.fn();
    setValueMock = jest.fn();
    mockGetLlmImprovement.mockClear();
  });

  it('should return initial state correctly', () => {
    const { result } = renderHook(() => useLlmSuggestions(getValuesMock, setValueMock));

    expect(result.current.titleSuggestion).toBeNull();
    expect(result.current.descriptionSuggestion).toBeNull();
    expect(result.current.loadingTitleSuggestion).toBe(false);
    expect(result.current.loadingDescriptionSuggestion).toBe(false);
  });

  describe('handleImproveTitle', () => {
    it('should fetch and set title suggestion', async () => {
      getValuesMock.mockReturnValue('Old Title');
      const mockResponse: LLMImprovementResponse = { improved_title: 'New Title' };
      mockGetLlmImprovement.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useLlmSuggestions(getValuesMock, setValueMock),
      );

      act(() => {
        result.current.handleImproveTitle();
      });

      expect(result.current.loadingTitleSuggestion).toBe(true);
      expect(result.current.titleSuggestion).toBeNull();

      await waitFor(() => expect(result.current.loadingTitleSuggestion).toBe(false));

      expect(mockGetLlmImprovement).toHaveBeenCalledWith({
        action: 'improve_title',
        title: 'Old Title',
      });
      expect(result.current.titleSuggestion).toBe('New Title');
    });

    it('should handle no improved title in response', async () => {
      getValuesMock.mockReturnValue('Old Title');
      const mockResponse: LLMImprovementResponse = {};
      mockGetLlmImprovement.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useLlmSuggestions(getValuesMock, setValueMock),
      );

      act(() => {
        result.current.handleImproveTitle();
      });

      await waitFor(() => expect(result.current.loadingTitleSuggestion).toBe(false));

      expect(result.current.titleSuggestion).toBeNull();
    });

    it('should handle error during title improvement', async () => {
      getValuesMock.mockReturnValue('Old Title');
      mockGetLlmImprovement.mockRejectedValue(new Error('API Error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useLlmSuggestions(getValuesMock, setValueMock),
      );

      act(() => {
        result.current.handleImproveTitle();
      });

      await waitFor(() => expect(result.current.loadingTitleSuggestion).toBe(false));

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error improving title:', expect.any(Error));
      expect(result.current.titleSuggestion).toBeNull();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('handleImproveDescription', () => {
    it('should fetch and set description suggestion for existing description', async () => {
      getValuesMock.mockImplementation((key: string) => {
        if (key === 'description') return 'Old Description';
        if (key === 'title') return 'Task Title';
        return undefined;
      });
      const mockResponse: LLMImprovementResponse = { improved_description: 'New Description' };
      mockGetLlmImprovement.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useLlmSuggestions(getValuesMock, setValueMock),
      );

      act(() => {
        result.current.handleImproveDescription();
      });

      expect(result.current.loadingDescriptionSuggestion).toBe(true);
      expect(result.current.descriptionSuggestion).toBeNull();

      await waitFor(() => expect(result.current.loadingDescriptionSuggestion).toBe(false));

      expect(mockGetLlmImprovement).toHaveBeenCalledWith({
        action: 'improve_description',
        title: 'Task Title',
        description: 'Old Description',
      });
      expect(result.current.descriptionSuggestion).toBe('New Description');
    });

    it('should fetch and set description suggestion for empty description', async () => {
      getValuesMock.mockImplementation((key: string) => {
        if (key === 'description') return '';
        if (key === 'title') return 'Task Title';
        return undefined;
      });
      const mockResponse: LLMImprovementResponse = { improved_description: 'Generated Description' };
      mockGetLlmImprovement.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useLlmSuggestions(getValuesMock, setValueMock),
      );

      act(() => {
        result.current.handleImproveDescription();
      });

      expect(result.current.loadingDescriptionSuggestion).toBe(true);
      expect(result.current.descriptionSuggestion).toBeNull();

      await waitFor(() => expect(result.current.loadingDescriptionSuggestion).toBe(false));

      expect(mockGetLlmImprovement).toHaveBeenCalledWith({
        action: 'generate_description_from_title',
        title: 'Task Title',
        description: '',
      });
      expect(result.current.descriptionSuggestion).toBe('Generated Description');
    });

    it('should handle no improved description in response', async () => {
      getValuesMock.mockImplementation((key: string) => {
        if (key === 'description') return 'Old Description';
        if (key === 'title') return 'Task Title';
        return undefined;
      });
      const mockResponse: LLMImprovementResponse = {};
      mockGetLlmImprovement.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useLlmSuggestions(getValuesMock, setValueMock),
      );

      act(() => {
        result.current.handleImproveDescription();
      });

      await waitFor(() => expect(result.current.loadingDescriptionSuggestion).toBe(false));

      expect(result.current.descriptionSuggestion).toBeNull();
    });

    it('should handle error during description improvement', async () => {
      getValuesMock.mockImplementation((key: string) => {
        if (key === 'description') return 'Old Description';
        if (key === 'title') return 'Task Title';
        return undefined;
      });
      mockGetLlmImprovement.mockRejectedValue(new Error('API Error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useLlmSuggestions(getValuesMock, setValueMock),
      );

      act(() => {
        result.current.handleImproveDescription();
      });

      await waitFor(() => expect(result.current.loadingDescriptionSuggestion).toBe(false));

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error improving description:', expect.any(Error));
      expect(result.current.descriptionSuggestion).toBeNull();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('applyTitleSuggestion', () => {
    it('should apply title suggestion and clear it', async () => {
      getValuesMock.mockReturnValue('Old Title');
      mockGetLlmImprovement.mockResolvedValue({ improved_title: 'Suggested Title' });

      const { result } = renderHook(() => useLlmSuggestions(getValuesMock, setValueMock));

      await act(async () => {
        await result.current.handleImproveTitle();
      });

      expect(result.current.titleSuggestion).toBe('Suggested Title');

      act(() => {
        result.current.applyTitleSuggestion();
      });

      expect(setValueMock).toHaveBeenCalledWith('title', 'Suggested Title');
      expect(result.current.titleSuggestion).toBeNull();
    });

    it('should do nothing if no title suggestion exists', () => {
      const { result } = renderHook(() => useLlmSuggestions(getValuesMock, setValueMock));

      act(() => {
        result.current.applyTitleSuggestion();
      });

      expect(setValueMock).not.toHaveBeenCalled();
      expect(result.current.titleSuggestion).toBeNull();
    });
  });

  describe('rejectTitleSuggestion', () => {
    it('should clear title suggestion', async () => {
      getValuesMock.mockReturnValue('Old Title');
      mockGetLlmImprovement.mockResolvedValue({ improved_title: 'Suggested Title' });

      const { result } = renderHook(() => useLlmSuggestions(getValuesMock, setValueMock));

      await act(async () => {
        await result.current.handleImproveTitle();
      });

      expect(result.current.titleSuggestion).toBe('Suggested Title');

      act(() => {
        result.current.rejectTitleSuggestion();
      });

      expect(result.current.titleSuggestion).toBeNull();
    });
  });

  describe('applyDescriptionSuggestion', () => {
    it('should apply description suggestion and clear it', async () => {
      getValuesMock.mockImplementation((key: string) => {
        if (key === 'description') return 'Old Description';
        if (key === 'title') return 'Task Title';
        return undefined;
      });
      mockGetLlmImprovement.mockResolvedValue({ improved_description: 'Suggested Description' });

      const { result } = renderHook(() => useLlmSuggestions(getValuesMock, setValueMock));

      await act(async () => {
        await result.current.handleImproveDescription();
      });

      expect(result.current.descriptionSuggestion).toBe('Suggested Description');

      act(() => {
        result.current.applyDescriptionSuggestion();
      });

      expect(setValueMock).toHaveBeenCalledWith('description', 'Suggested Description');
      expect(result.current.descriptionSuggestion).toBeNull();
    });

    it('should do nothing if no description suggestion exists', () => {
      const { result } = renderHook(() => useLlmSuggestions(getValuesMock, setValueMock));

      act(() => {
        result.current.applyDescriptionSuggestion();
      });

      expect(setValueMock).not.toHaveBeenCalled();
      expect(result.current.descriptionSuggestion).toBeNull();
    });
  });

  describe('rejectDescriptionSuggestion', () => {
    it('should clear description suggestion', async () => {
      getValuesMock.mockImplementation((key: string) => {
        if (key === 'description') return 'Old Description';
        if (key === 'title') return 'Task Title';
        return undefined;
      });
      mockGetLlmImprovement.mockResolvedValue({ improved_description: 'Suggested Description' });

      const { result } = renderHook(() => useLlmSuggestions(getValuesMock, setValueMock));

      await act(async () => {
        await result.current.handleImproveDescription();
      });

      expect(result.current.descriptionSuggestion).toBe('Suggested Description');

      act(() => {
        result.current.rejectDescriptionSuggestion();
      });

      expect(result.current.descriptionSuggestion).toBeNull();
    });
  });

  describe('resetSuggestions', () => {
    it('should reset all suggestions and loading states', async () => {
      getValuesMock.mockReturnValue('Title for reset');
      mockGetLlmImprovement.mockResolvedValueOnce({ improved_title: 'Reset Title' });
      mockGetLlmImprovement.mockResolvedValueOnce({ improved_description: 'Reset Description' });

      const { result } = renderHook(() => useLlmSuggestions(getValuesMock, setValueMock));

      await act(async () => {
        await result.current.handleImproveTitle();
        await result.current.handleImproveDescription();
      });

      expect(result.current.titleSuggestion).toBe('Reset Title');
      expect(result.current.descriptionSuggestion).toBe('Reset Description');
      expect(result.current.loadingTitleSuggestion).toBe(false);
      expect(result.current.loadingDescriptionSuggestion).toBe(false);

      act(() => {
        result.current.resetSuggestions();
      });

      expect(result.current.titleSuggestion).toBeNull();
      expect(result.current.descriptionSuggestion).toBeNull();
      expect(result.current.loadingTitleSuggestion).toBe(false);
      expect(result.current.loadingDescriptionSuggestion).toBe(false);
    });
  });
});
