import React, { useEffect, useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DayTemplateCreateRequest, DayTemplateUpdateRequest, DayTemplateResponse } from '../types/dayTemplate';
import { TimeWindow, TimeWindowInput } from '../types/timeWindow';
import { Category } from '../types/category';
import { createDayTemplate, updateDayTemplate } from '../services/dayTemplateService';
import { useTemplateById } from '../hooks/useTemplates';
import { useCategories } from '../hooks/useCategories';
import { formatMinutesToHHMM } from '../lib/utils';
import { ChevronRight, Trash2, PlusCircle, Plus } from 'lucide-react';
import CreateTemplateTimeWindowModal from '../components/modals/CreateTemplateTimeWindowModal';
import Button from '../components/Button';
import Input from '../components/Input';

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

const EditTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { templateId: routeTemplateId } = useParams<{ templateId?: string }>();
  const isCreatingNew = !routeTemplateId;

  const { data: template, isLoading: isLoadingTemplate, error: templateError } = useTemplateById(routeTemplateId);
  const { data: availableCategories = [], isLoading: isLoadingCategories } = useCategories();

  const [templateTimeWindows, setTemplateTimeWindows] = useState<TimeWindow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isTimeWindowModalOpen, setIsTimeWindowModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const handleCreateTimeWindow = useCallback((newTimeWindowInput: TimeWindowInput) => {
    const startTimeMinutes = newTimeWindowInput.start_time;
    const endTimeMinutes = newTimeWindowInput.end_time;

    for (const existingTW of templateTimeWindows) {
      if (
        startTimeMinutes < existingTW.end_time &&
        endTimeMinutes > existingTW.start_time
      ) {
        setFormError(
          `New time window (${formatMinutesToHHMM(startTimeMinutes)} - ${formatMinutesToHHMM(endTimeMinutes)}) overlaps with an existing one: "${existingTW.description}" (${formatMinutesToHHMM(existingTW.start_time)} - ${formatMinutesToHHMM(existingTW.end_time)}).`
        );
        return;
      }
    }

    const selectedCategory = availableCategories.find((cat: Category) => cat.id === newTimeWindowInput.category_id);
    if (!selectedCategory) {
      setFormError("Selected category not found.");
      return;
    }

    const newLocalTimeWindow: TimeWindow = {
      id: `temp-${Date.now()}`,
      description: newTimeWindowInput.description,
      start_time: startTimeMinutes,
      end_time: endTimeMinutes,
      category: selectedCategory,
      day_template_id: routeTemplateId || '',
      user_id: '',
      is_deleted: false,
    };

    setTemplateTimeWindows(prev => [...prev, newLocalTimeWindow]);
    setIsTimeWindowModalOpen(false);
    setFormError(null);
  }, [templateTimeWindows, availableCategories, routeTemplateId]);

  useEffect(() => {
    if (template && !isCreatingNew) {
      reset({
        name: template.name,
        description: template.description || '',
      });
      setTemplateTimeWindows(template.time_windows || []);
    } else {
      reset({
        name: '',
        description: '',
      });
      setTemplateTimeWindows([]);
    }
  }, [template, isCreatingNew, reset]);

  const hasTimeWindowChanges = useCallback(() => {
    if (!template) return templateTimeWindows.length > 0; // If new template, any time window is a change

    const initialTimeWindows = template.time_windows || [];

    // Check for added or removed time windows
    if (templateTimeWindows.length !== initialTimeWindows.length) {
      return true;
    }

    // Check for modified time windows (compare by relevant properties)
    const sortedCurrent = [...templateTimeWindows].sort((a, b) => a.id.localeCompare(b.id));
    const sortedInitial = [...initialTimeWindows].sort((a, b) => a.id.localeCompare(b.id));

    for (let i = 0; i < sortedCurrent.length; i++) {
      const current = sortedCurrent[i];
      const initial = sortedInitial[i];

      // If IDs don't match, or any relevant property differs, there's a change
      if (
        current.id !== initial.id ||
        current.description !== initial.description ||
        current.start_time !== initial.start_time ||
        current.end_time !== initial.end_time ||
        current.category.id !== initial.category.id
      ) {
        return true;
      }
    }
    return false;
  }, [template, templateTimeWindows]);

  const hasUnsavedChanges = isDirty || hasTimeWindowChanges();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleDeleteTimeWindow = (timeWindowId: string) => {
    setTemplateTimeWindows(prev => prev.filter(tw => tw.id !== timeWindowId));
    setFormError(null);
  };

  const createTemplateMutation = useMutation({
    mutationFn: createDayTemplate,
    onSuccess: (savedTemplate: DayTemplateResponse) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      navigate('/templates');
    },
    onError: (err: any) => {
      setFormError(`Failed to save template: ${err.response?.data?.detail || err.message || 'Unknown error'}`);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DayTemplateUpdateRequest }) => updateDayTemplate(id, data),
    onSuccess: (savedTemplate: DayTemplateResponse) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', savedTemplate.id] });
      reset(undefined, { keepValues: true, keepDirty: false }); // Reset dirty state after successful save
      setTemplateTimeWindows(savedTemplate.time_windows || []); // Update time windows from saved data
      navigate('/templates');
    },
    onError: (err: any) => {
      setFormError(`Failed to save template: ${err.response?.data?.detail || err.message || 'Unknown error'}`);
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    setFormError(null);

    const time_windows_payload = templateTimeWindows.map(tw => {
      const timeWindowPayload: TimeWindowInput = {
        description: tw.description || '',
        start_time: tw.start_time,
        end_time: tw.end_time,
        category_id: tw.category.id,
      };
      if (tw.id && !tw.id.startsWith('temp-')) {
        timeWindowPayload.id = tw.id;
      }
      return timeWindowPayload;
    });

    if (isCreatingNew) {
      const createPayload: DayTemplateCreateRequest = {
          name: data.name,
          description: data.description,
          time_windows: time_windows_payload,
      };
      createTemplateMutation.mutate(createPayload);
    } else if (routeTemplateId) {
      const updatePayload: DayTemplateUpdateRequest = {
          name: data.name,
          description: data.description,
          time_windows: time_windows_payload,
      };
      updateTemplateMutation.mutate({ id: routeTemplateId, data: updatePayload });
    }
  };

  const isLoading = isLoadingTemplate || isLoadingCategories || isSubmitting;
  const error = templateError || formError;

  return (
    <div className="p-8 @container">
      <div className="mb-6">
        <nav aria-label="Breadcrumb" className="text-sm font-medium text-gray-500">
          <ol className="list-none p-0 inline-flex">
            <li className="flex items-center">
              <a href="/templates" className="hover:text-gray-700">Templates</a>
            </li>
            <li className="flex items-center">
              <ChevronRight size={20} className="mx-1" />
              <span className="text-gray-700 font-semibold">
                {isCreatingNew ? 'Create Template' : 'Edit Template'}
              </span>
            </li>
          </ol>
        </nav>
      </div>

      <header className="mb-8">
        <h1 className="text-gray-900 text-3xl font-bold">
          {isCreatingNew ? 'Create New Template' : 'Edit Template'}
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          {isCreatingNew ? 'Define a new template for your days.' : 'Modify the template details and manage time windows.'}
        </p>
      </header>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error instanceof Error ? error.message : error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <h2 className="text-gray-800 text-lg font-semibold mb-4">Template Details</h2>
          <div className="max-w-md space-y-4">
            <div>
              <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-1.5">Template Name</label>
              <Input
                type="text"
                id="templateName"
                {...register('name')}
                placeholder="e.g., Morning Focus Session"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">Description (Optional)</label>
              <Input
                as="textarea"
                id="description"
                {...register('description')}
                rows={3}
                placeholder="e.g., A template for deep work sessions in the morning."
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
            </div>
          </div>
        </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-gray-800 text-lg font-semibold mb-4">Time Windows</h2>
            <p className="text-sm text-gray-500 mb-4">Manage time windows for this template. Add or remove as needed.</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {templateTimeWindows.length > 0 ? templateTimeWindows.slice().sort((a, b) => a.start_time - b.start_time).map(tw => (
                <div key={tw.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50">
                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{tw.category.name}</span>
                      <span className="text-gray-400 text-xs">
                        ({formatMinutesToHHMM(tw.start_time)} - {formatMinutesToHHMM(tw.end_time)})
                      </span>
                    </div>
                    {tw.description && (
                      <p className="text-sm text-gray-500 mt-1">{tw.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTimeWindow(tw.id)}
                    title="Delete time window"
                    disabled={isLoading}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              )) : <p className="text-sm text-gray-500">This template has no time windows yet. Add some below.</p>}
            </div>
              <Button
                type="button"
                variant="slate"
                size="medium"
                onClick={() => { setIsTimeWindowModalOpen(true); }}
                className="mt-4 flex items-center gap-2"
                disabled={isLoading}
                title={"Add new time window"}
              >
                <Plus size={20} />
                Add new time window
              </Button>
          </div>

        <CreateTemplateTimeWindowModal
          isOpen={isTimeWindowModalOpen}
          onClose={() => setIsTimeWindowModalOpen(false)}
          onSubmit={handleCreateTimeWindow}
          availableCategories={availableCategories}
          existingTimeWindows={templateTimeWindows}
        />


        <div className="flex justify-end gap-3 mt-8">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (hasUnsavedChanges) {
                if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                  navigate('/templates');
                }
              } else {
                navigate('/templates');
              }
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={hasUnsavedChanges || isCreatingNew ? 'primary' : 'secondary'}
            className={hasUnsavedChanges ? 'bg-green-500 hover:bg-green-600 save-button-unsaved' : 'bg-gray-700 hover:bg-gray-900'}
            disabled={isLoading || (!hasUnsavedChanges && !isCreatingNew) || !!errors.name}
          >
            {isSubmitting ? 'Saving...' : (hasUnsavedChanges || isCreatingNew ? 'Save Changes' : 'Saved')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditTemplatePage;
