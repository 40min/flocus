import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { DayTemplateCreateRequest, DayTemplateUpdateRequest, DayTemplateResponse } from '../types/dayTemplate';
import { TimeWindow, TimeWindowInput } from '../types/timeWindow';
import { Category } from '../types/category';
import { createDayTemplate, updateDayTemplate } from '../services/dayTemplateService';
import { useTemplateById } from '../hooks/useTemplates';
import { useCategories } from '../hooks/useCategories';
import { formatMinutesToHHMM } from '../lib/utils';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CreateTemplateTimeWindowModal from '../components/modals/CreateTemplateTimeWindowModal';

const EditTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { templateId: routeTemplateId } = useParams<{ templateId?: string }>();
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(!routeTemplateId);

  const { data: template, isLoading: isLoadingTemplate, error: templateError } = useTemplateById(routeTemplateId);
  const { data: availableCategories = [], isLoading: isLoadingCategories } = useCategories();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateTimeWindows, setTemplateTimeWindows] = useState<TimeWindow[]>([]);
  const [initialName, setInitialName] = useState('');
  const [initialDescription, setInitialDescription] = useState('');
  const [initialTemplateTimeWindows, setInitialTemplateTimeWindows] = useState<TimeWindow[]>([]);
  const [hasChangesForSaveButton, setHasChangesForSaveButton] = useState(false);
  const [hasChangesForBeforeUnload, setHasChangesForBeforeUnload] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [isTimeWindowModalOpen, setIsTimeWindowModalOpen] = useState(false);

  const handleCreateTimeWindow = useCallback((newTimeWindowInput: TimeWindowInput) => {
    const startTimeMinutes = newTimeWindowInput.start_time;
    const endTimeMinutes = newTimeWindowInput.end_time;

    // Check for overlaps with existing time windows
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
      id: `temp-${Date.now()}`, // Temporary client-side ID
      description: newTimeWindowInput.description,
      start_time: startTimeMinutes,
      end_time: endTimeMinutes,
      category: selectedCategory, // Embed the full category object
      day_template_id: routeTemplateId || '', // May be empty if template is new
      user_id: '', // Will be set by backend; not crucial for local display before save
      is_deleted: false,
    };

    setTemplateTimeWindows(prev => [...prev, newLocalTimeWindow]);
    setIsTimeWindowModalOpen(false);
    setFormError(null); // Clear general page errors if any
  }, [templateTimeWindows, availableCategories, routeTemplateId]);

  useEffect(() => {
    if (template && !isCreatingNew) {
      setName(template.name);
      setInitialName(template.name);
      setDescription(template.description || '');
      setInitialDescription(template.description || '');
      const fetchedTimeWindows = template.time_windows || [];
      setTemplateTimeWindows(fetchedTimeWindows);
      setInitialTemplateTimeWindows(fetchedTimeWindows);
      setHasChangesForSaveButton(false);
      setHasChangesForBeforeUnload(false);
    } else {
      setName('');
      setDescription('');
      setTemplateTimeWindows([]);
      setInitialName('');
      setInitialDescription('');
      setInitialTemplateTimeWindows([]);
      setHasChangesForSaveButton(false);
      setHasChangesForBeforeUnload(false);
    }
  }, [template, isCreatingNew]);

  useEffect(() => {
    const checkChanges = () => {
      const nameChanged = name !== initialName;
      const descriptionChanged = description !== initialDescription;

      // Filter out temporary time windows for comparison with initial state
      const currentPersistedTimeWindows = templateTimeWindows.filter(tw => !tw.id.startsWith('temp-'));

      // Check for deleted or modified existing time windows
      const hasDeletedOrModifiedPersistedTimeWindows =
        initialTemplateTimeWindows.length !== currentPersistedTimeWindows.length ||
        JSON.stringify(initialTemplateTimeWindows.map(tw => ({ // Simplified for comparison
          id: tw.id,
          description: tw.description,
          start_time: tw.start_time,
          end_time: tw.end_time,
          category_id: tw.category.id
        })).sort((a, b) => a.id.localeCompare(b.id))) !==
        JSON.stringify(currentPersistedTimeWindows.map(tw => ({
          id: tw.id,
          description: tw.description,
          start_time: tw.start_time,
          end_time: tw.end_time,
          category_id: tw.category.id
        })).sort((a, b) => a.id.localeCompare(b.id)));

      setHasChangesForBeforeUnload(nameChanged || descriptionChanged || hasDeletedOrModifiedPersistedTimeWindows);

      // Logic for hasChangesForSaveButton (includes new temporary time windows)
      const hasNewTimeWindows = templateTimeWindows.some(tw => tw.id.startsWith('temp-'));
      setHasChangesForSaveButton(nameChanged || descriptionChanged || hasNewTimeWindows || hasDeletedOrModifiedPersistedTimeWindows);
    };

    if (!isLoadingTemplate && (routeTemplateId || isCreatingNew)) {
       checkChanges();
    }
  }, [name, description, templateTimeWindows, initialName, initialDescription, initialTemplateTimeWindows, isLoadingTemplate, routeTemplateId, isCreatingNew]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasChangesForBeforeUnload) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChangesForBeforeUnload]);

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
      setHasChangesForSaveButton(false);
      setHasChangesForBeforeUnload(false);
      navigate('/templates');
    },
    onError: (err: any) => {
      setFormError(`Failed to save template: ${err.response?.data?.detail || err.message || 'Unknown error'}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
          name: name,
          description: description,
          time_windows: time_windows_payload,
      };
      createTemplateMutation.mutate(createPayload);
    } else if (routeTemplateId) {
      const updatePayload: DayTemplateUpdateRequest = {
          name,
          description,
          time_windows: time_windows_payload,
      };
      updateTemplateMutation.mutate({ id: routeTemplateId, data: updatePayload });
    }
  };

  const isLoading = isLoadingTemplate || isLoadingCategories || createTemplateMutation.isPending || updateTemplateMutation.isPending;
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
              <ChevronRightIcon sx={{ fontSize: '1.25rem', marginX: '0.25rem' }} />
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <h2 className="text-gray-800 text-lg font-semibold mb-4">Template Details</h2>
          <div className="max-w-md space-y-4">
            <div>
              <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-1.5">Template Name</label>
              <input
                type="text"
                id="templateName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="form-input w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 placeholder-gray-400 py-2.5 px-3.5 text-sm"
                placeholder="e.g., Morning Focus Session"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">Description (Optional)</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="form-input w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 placeholder-gray-400 py-2.5 px-3.5 text-sm"
                placeholder="e.g., A template for deep work sessions in the morning."
              />
            </div>
          </div>
        </div>

          {/* Time Windows panel is now always visible */}
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
                  <button
                    type="button"
                    onClick={() => handleDeleteTimeWindow(tw.id)}
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                    title="Delete time window"
                    disabled={isLoading}
                  >
                    <DeleteOutlinedIcon sx={{ fontSize: '1.125rem' }} />
                  </button>
                </div>
              )) : <p className="text-sm text-gray-500">This template has no time windows yet. Add some below.</p>}
            </div>
              <button
                type="button"
                onClick={() => { setIsTimeWindowModalOpen(true); }}
                className="btn-standard mt-4 text-xs disabled:opacity-50 px-4 py-2 flex items-center disabled:cursor-not-allowed"
                disabled={isLoading}
                title={"Add new time window"}
              >
                <AddCircleOutlineIcon sx={{ fontSize: '1.25rem' }} />
                Add new time window
              </button>
          </div>

        <CreateTemplateTimeWindowModal
          isOpen={isTimeWindowModalOpen}
          onClose={() => setIsTimeWindowModalOpen(false)}
          onSubmit={handleCreateTimeWindow}
          availableCategories={availableCategories}
          existingTimeWindows={templateTimeWindows}
        />


        <div className="flex justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={() => {
              if (hasChangesForBeforeUnload) { // Use hasChangesForBeforeUnload for the confirmation dialog
                if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                  navigate('/templates');
                }
              } else {
                navigate('/templates');
              }
            }}
            className="btn-standard bg-gray-200 hover:bg-gray-300 text-gray-700"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`btn-standard ${hasChangesForSaveButton ? 'bg-green-500 hover:bg-green-600 save-button-unsaved' : 'bg-gray-700 hover:bg-gray-900'}`}
            disabled={isLoading || (!hasChangesForSaveButton && !isCreatingNew) } // Disable if no unsaved changes unless it's a new template (which might be empty but still saveable)
          >
            {isLoading ? 'Saving...' : (hasChangesForSaveButton || isCreatingNew ? 'Save Changes' : 'Saved')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditTemplatePage;
