import { useState, useCallback } from 'react';
import * as taskService from 'services/taskService';
import { LLMImprovementResponse, LlmAction } from 'types/task';
import { UseFormGetValues, UseFormSetValue } from 'react-hook-form';

// A generic interface for form values that the hook can interact with.
// This avoids a direct dependency on the modal's internal form types.
interface LlmFormInputs {
  title: string;
  description?: string;
  status: string;
  priority: string;
  [key: string]: any;
}

export const useLlmSuggestions = (
  getValues: UseFormGetValues<LlmFormInputs>,
  setValue: UseFormSetValue<LlmFormInputs>,
) => {
  const [titleSuggestion, setTitleSuggestion] = useState<string | null>(null);
  const [descriptionSuggestion, setDescriptionSuggestion] = useState<string | null>(null);
  const [loadingTitleSuggestion, setLoadingTitleSuggestion] = useState<boolean>(false);
  const [loadingDescriptionSuggestion, setLoadingDescriptionSuggestion] = useState<boolean>(false);

  const handleImproveTitle = async () => {
    setLoadingTitleSuggestion(true);
    setTitleSuggestion(null);
    try {
      const currentTitle = getValues('title');
      const response: LLMImprovementResponse = await taskService.getLlmImprovement({
        action: 'improve_title' as LlmAction,
        title: currentTitle,
      });
      if (response.improved_title) {
        setTitleSuggestion(response.improved_title);
      }
    } catch (error) {
      console.error('Error improving title:', error);
    } finally {
      setLoadingTitleSuggestion(false);
    }
  };

  const handleImproveDescription = async () => {
    setLoadingDescriptionSuggestion(true);
    setDescriptionSuggestion(null);
    try {
      const currentDescription = getValues('description') || '';
      const currentTitle = getValues('title');
      const action: LlmAction = currentDescription
        ? 'improve_description'
        : 'generate_description_from_title';

      const response: LLMImprovementResponse = await taskService.getLlmImprovement({
        action: action,
        title: currentTitle,
        description: currentDescription,
      });
      if (response.improved_description) {
        setDescriptionSuggestion(response.improved_description);
      }
    } catch (error) {
      console.error('Error improving description:', error);
    } finally {
      setLoadingDescriptionSuggestion(false);
    }
  };

  const applyTitleSuggestion = () => {
    if (titleSuggestion) {
      setValue('title', titleSuggestion);
      setTitleSuggestion(null);
    }
  };

  const rejectTitleSuggestion = () => {
    setTitleSuggestion(null);
  };

  const applyDescriptionSuggestion = () => {
    if (descriptionSuggestion) {
      setValue('description', descriptionSuggestion);
      setDescriptionSuggestion(null);
    }
  };

  const rejectDescriptionSuggestion = () => {
    setDescriptionSuggestion(null);
  };

  const resetSuggestions = useCallback(() => {
    setTitleSuggestion(null);
    setDescriptionSuggestion(null);
    setLoadingTitleSuggestion(false);
    setLoadingDescriptionSuggestion(false);
  }, []);

  return {
    titleSuggestion,
    descriptionSuggestion,
    loadingTitleSuggestion,
    loadingDescriptionSuggestion,
    handleImproveTitle,
    handleImproveDescription,
    applyTitleSuggestion,
    rejectTitleSuggestion,
    applyDescriptionSuggestion,
    rejectDescriptionSuggestion,
    resetSuggestions,
  };
};
