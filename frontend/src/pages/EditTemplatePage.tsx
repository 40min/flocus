import React, { useEffect, useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DayTemplateCreateRequest, DayTemplateUpdateRequest, DayTemplateResponse } from '../types/dayTemplate';
import { TimeWindow, TimeWindowInput } from '../types/timeWindow';
import { createDayTemplate, updateDayTemplate } from '../services/dayTemplateService';
import { useTemplateById } from '../hooks/useTemplates';
import { useCategories } from '../hooks/useCategories';
import { formatMinutesToHHMM } from '../lib/utils';
import { ChevronRight, Trash2, Plus, Edit } from 'lucide-react';
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

const [editingTimeWindow, setEditingTimeWindow] = useState<TimeWindow | null>(null);
  const [templateTimeWindows, setTemplateTimeWindows] = useState<TimeWindow[]>([]);

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

  const handleOpenEditModal = (tw: TimeWindow) => {
    setEditingTimeWindow(tw);
    setIsTimeWindowModalOpen(true);
  };

  const handleTimeWindowSubmit = (timeWindowData: TimeWindowInput) => {
    const selectedCategory = availableCategories.find(cat => cat.id === timeWindowData.category_id);
    if (!selectedCategory) {
      // This should be caught by form validation, but as a fallback
      return;
    }
    if (editingTimeWindow) {
      // Edit
      setTemplateTimeWindows(prev =>
        prev.map(tw =>
          tw.id === editingTimeWindow.id ? { ...tw, ...timeWindowData, category: selectedCategory } : tw
        )
      );
    } else {
      // Create
      const newLocalTimeWindow: TimeWindow = {
        id: `temp-${Date.now()}`,
        ...timeWindowData,
        category: selectedCategory,
        day_template_id: routeTemplateId || '',
        user_id: '',
        is_deleted: false,
      };
      setTemplateTimeWindows(prev => [...prev, newLocalTimeWindow]);
    }
    setIsTimeWindowModalOpen(false);
    setEditingTimeWindow(null);
  };

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
  };

  const createTemplateMutation = useMutation({
    mutationFn: createDayTemplate,
    onSuccess: (savedTemplate: DayTemplateResponse) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      navigate(`/templates/edit/${savedTemplate.id}`);
    },
    onError: (err: any) => {
      // Form error handling would go here if needed
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DayTemplateUpdateRequest }) => updateDayTemplate(id, data),
    onSuccess: (savedTemplate: DayTemplateResponse) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', savedTemplate.id] });
      // Reset form with saved values and mark as not dirty
      reset({ name: savedTemplate.name, description: savedTemplate.description || '' }, { keepDirty: false });
      setTemplateTimeWindows(savedTemplate.time_windows || []); // Update time windows from saved data
      // Do not navigate, stay on the current edit page
    },
    onError: (err: any) => {
      // Form error handling would go here if needed
    },
  });

  const onSubmit = (data: TemplateFormData) => {


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
const isSaving = createTemplateMutation.isPending || updateTemplateMutation.isPending;
  const error = templateError;

  return (
    <div className="p-8 @container mx-auto max-w-4xl">
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
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{tw.category.name}</span>
                      <span className="text-gray-400 text-xs">
                        ({formatMinutesToHHMM(tw.start_time)} - {formatMinutesToHHMM(tw.end_time)})
                      </span>
                    </div>
                    {tw.description && <p className="text-sm text-gray-500 mt-1 truncate">{tw.description}</p>}
                  </div>
                  <div className="flex-shrink-0 flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.preventDefault(); handleOpenEditModal(tw); }}
                      title="Edit time window"
                      disabled={isLoading}
                    >
                      <Edit size={18} />
                    </Button>
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
                </div>
              )) : <p className="text-sm text-gray-500">This template has no time windows yet. Add some below.</p>}
            </div>
              <Button
                type="button"
                variant="slate"
                size="medium"
                onClick={() => { setEditingTimeWindow(null); setIsTimeWindowModalOpen(true); }}
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
          onClose={() => {
            setIsTimeWindowModalOpen(false);
            setEditingTimeWindow(null);
          }}
          onSubmit={handleTimeWindowSubmit}
          availableCategories={availableCategories}
          existingTimeWindows={editingTimeWindow ? templateTimeWindows.filter(tw => tw.id !== editingTimeWindow.id) : templateTimeWindows}
          editingTimeWindow={editingTimeWindow}
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
                navigate(-1);
              }
            }}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={hasUnsavedChanges || isCreatingNew ? 'primary' : 'secondary'}
            className={hasUnsavedChanges ? 'bg-green-500 hover:bg-green-600 save-button-unsaved' : 'bg-slate-700 hover:bg-slate-900'}
            disabled={isSaving || (!hasUnsavedChanges && !isCreatingNew) || !!errors.name}
          >
            {isSaving ? 'Saving...' : (hasUnsavedChanges || isCreatingNew ? 'Save Changes' : 'Saved')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditTemplatePage;
