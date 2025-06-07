import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { DayTemplateCreateRequest, DayTemplateUpdateRequest } from '../types/dayTemplate';
import { TimeWindow, TimeWindowInput } from '../types/timeWindow'; // Removed TimeWindowCreateRequest
import { Category } from '../types/category';
import { createDayTemplate, updateDayTemplate } from '../services/dayTemplateService';
import { useTemplateById } from '../hooks/useTemplates';
import { useCategories } from '../hooks/useCategories';
import { formatMinutesToHHMM, hhMMToMinutes } from '../lib/utils';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [isTimeWindowModalOpen, setIsTimeWindowModalOpen] = useState(false);
  const [isNameAutofilled, setIsNameAutofilled] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const addTimeWindowButtonRef = useRef<HTMLButtonElement>(null);
  const firstModalFocusableElementRef = useRef<HTMLSelectElement>(null);

  const [newTimeWindowForm, setNewTimeWindowForm] = useState<{
    name: string;
    startTime: Date | null;
    endTime: Date | null;
    categoryId: string;
  }>({
    name: '',
    startTime: null,
    endTime: null,
    categoryId: '',
  });

  const generateTimeWindowName = useCallback((
    categoryName: string,
    // currentTemplateId: string | undefined, // Parameter removed
    existingTimeWindows: TimeWindow[] // This is expected to be templateTimeWindows
  ) => {
    if (!categoryName) return '';

    // No need to filter existingTimeWindows further, as it's already the context.
    const relevantTimeWindows = existingTimeWindows;

    let newName = categoryName;
    // Check if the base name itself is unique
    if (!relevantTimeWindows.some(tw => tw.name === newName)) {
      return newName;
    }

    // If base name exists, start trying with suffix -1, -2, ...
    let count = 1;
    // Loop to find a unique name by appending a counter.
    // newName (declared above) will be assigned the first unique candidate.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const currentNameCandidate = `${categoryName}-${count}`;
      if (!relevantTimeWindows.some(tw => tw.name === currentNameCandidate)) {
        newName = currentNameCandidate; // Assign the unique name to the outer scoped 'newName'
        break;                         // Exit the loop
      }
      count++;                         // Increment counter for the next attempt
    }
    return newName;
  }, []);

  const handleCategoryChange = useCallback((categoryId: string) => {
    const selectedCategory = availableCategories.find(cat => cat.id === categoryId);
    const newName = selectedCategory
      ? generateTimeWindowName(selectedCategory.name, templateTimeWindows)
      : '';

    setNewTimeWindowForm(prev => ({
      ...prev,
      categoryId,
      name: newName,
    }));
    setIsNameAutofilled(!!selectedCategory);
  }, [availableCategories, generateTimeWindowName, templateTimeWindows]);


  useEffect(() => {
    if (template && !isCreatingNew) {
      setName(template.name);
      setInitialName(template.name);
      setDescription(template.description || '');
      setInitialDescription(template.description || '');
      const fetchedTimeWindows = template.time_windows || [];
      setTemplateTimeWindows(fetchedTimeWindows);
      setInitialTemplateTimeWindows(fetchedTimeWindows);
      setHasUnsavedChanges(false);
    } else {
      // For new templates, initialize with empty values
      setName('');
      setDescription('');
      setTemplateTimeWindows([]);
      setInitialName('');
      setInitialDescription('');
      setInitialTemplateTimeWindows([]);
      setHasUnsavedChanges(false); // Or true if we want to prompt save for a new empty template immediately
    }
  }, [template, isCreatingNew]);

  // Effect to check for unsaved changes
  useEffect(() => {
    const checkUnsavedChanges = () => {
      const nameChanged = name !== initialName;
      const descriptionChanged = description !== initialDescription;

      // Basic comparison for time windows length and properties.
      // For a more robust check, consider deep comparison or hashing.
      // This simple check might not catch all modifications if only sub-properties of time windows change without adding/removing.
      // However, our current add/delete operations for time windows should be caught.
      // And changes to name/start_time/end_time/category_id within a time window are handled by replacing the TW array on save.
      const timeWindowsChanged =
        templateTimeWindows.length !== initialTemplateTimeWindows.length ||
        JSON.stringify(templateTimeWindows.map(tw => ({id: tw.id, name: tw.name, start_time: tw.start_time, end_time: tw.end_time, category_id: tw.category.id }))) !==
        JSON.stringify(initialTemplateTimeWindows.map(tw => ({id: tw.id, name: tw.name, start_time: tw.start_time, end_time: tw.end_time, category_id: tw.category.id })));

      if (nameChanged || descriptionChanged || timeWindowsChanged) {
        setHasUnsavedChanges(true);
      } else {
        setHasUnsavedChanges(false);
      }
    };

    // Don't run this check if still loading initial data for an existing template
    if (!isLoadingTemplate && (routeTemplateId || isCreatingNew)) {
       checkUnsavedChanges();
    }
  }, [name, description, templateTimeWindows, initialName, initialDescription, initialTemplateTimeWindows, isLoadingTemplate, routeTemplateId, isCreatingNew]);

  // Effect for warning on page leave
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        // Standard way to trigger the browser's confirmation dialog
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);


  useEffect(() => {
    if (availableCategories.length > 0 && !newTimeWindowForm.categoryId) { // Only autofill if categoryId is not already set
      const selectedCategory = availableCategories[0];
      setNewTimeWindowForm((prev) => ({
        ...prev,
        categoryId: selectedCategory.id,
        name: generateTimeWindowName(selectedCategory.name, templateTimeWindows)
      }));
      setIsNameAutofilled(true);
    }
  }, [availableCategories, newTimeWindowForm.categoryId, generateTimeWindowName, templateTimeWindows]);

  useEffect(() => {
    if (isTimeWindowModalOpen) {
      firstModalFocusableElementRef.current?.focus();

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsTimeWindowModalOpen(false);
          addTimeWindowButtonRef.current?.focus();
        } else if (event.key === 'Tab' && modalRef.current) {
          const focusableElements = Array.from(
            modalRef.current.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
          ).filter(el => el.offsetParent !== null); // Check if element is visible

          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (event.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
              lastElement.focus();
              event.preventDefault();
            }
          } else {
            // Tab
            if (document.activeElement === lastElement) {
              firstElement.focus();
              event.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isTimeWindowModalOpen]);

  useEffect(() => {
    if (isTimeWindowModalOpen && availableCategories.length > 0 && !isLoadingCategories) {
      // Only set initial category if form is in initial state and categories are loaded
      const isFormEmpty = !newTimeWindowForm.name && !newTimeWindowForm.startTime && !newTimeWindowForm.endTime;
      if (isFormEmpty) {
        handleCategoryChange(availableCategories[0].id);
      }
    }
  }, [
    isTimeWindowModalOpen,
    availableCategories,
    isLoadingCategories,
    handleCategoryChange,
    newTimeWindowForm.name,
    newTimeWindowForm.startTime,
    newTimeWindowForm.endTime
  ]);


  const handleCreateTimeWindow = async () => {
    if (!newTimeWindowForm.categoryId) { // Allow adding TW even if templateId is not yet set (for new templates)
        setModalError("A category must be selected before adding a time window.");
        return;
    }
    if (!newTimeWindowForm.startTime || !newTimeWindowForm.endTime) {
      setModalError("Please select both start and end times.");
      return;
    }

    const formatTime = (date: Date | null): string => {
      if (!date) return '';
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    const startTimeStr = formatTime(newTimeWindowForm.startTime);
    const endTimeStr = formatTime(newTimeWindowForm.endTime);
    const startTimeMinutes = hhMMToMinutes(startTimeStr);
    const endTimeMinutes = hhMMToMinutes(endTimeStr);

    if (startTimeMinutes === null || endTimeMinutes === null || endTimeMinutes <= startTimeMinutes) {
      setModalError("Invalid time range. End time must be after start time.");
      return;
    }
    // Check for overlaps with existing time windows
    for (const existingTW of templateTimeWindows) {
      // Check for overlap: (StartA < EndB) and (StartB < EndA)
      if (
        startTimeMinutes < existingTW.end_time &&
        endTimeMinutes > existingTW.start_time
      ) {
        setModalError(
          `New time window (${formatMinutesToHHMM(startTimeMinutes)} - ${formatMinutesToHHMM(endTimeMinutes)}) overlaps with an existing one: "${existingTW.name}" (${formatMinutesToHHMM(existingTW.start_time)} - ${formatMinutesToHHMM(existingTW.end_time)}).`
        );
        return;
      }
    }


    const selectedCategory = availableCategories.find(cat => cat.id === newTimeWindowForm.categoryId);
    if (!selectedCategory) {
      setModalError("Selected category not found.");
      return;
    }

    // Create a new TimeWindow object for local state
    // It won't have a real backend ID or user_id until the template is saved and re-fetched.
    // day_template_id will also be set by backend if it's a new template.
    const newLocalTimeWindow: TimeWindow = {
      id: `temp-${Date.now()}`, // Temporary client-side ID
      name: newTimeWindowForm.name || selectedCategory.name, // Use category name if TW name is empty
      start_time: startTimeMinutes,
      end_time: endTimeMinutes,
      category: selectedCategory, // Embed the full category object
      day_template_id: routeTemplateId || '', // May be empty if template is new
      user_id: '', // Will be set by backend; not crucial for local display before save
      is_deleted: false,
    };

    setTemplateTimeWindows(prev => [...prev, newLocalTimeWindow]);
    setIsTimeWindowModalOpen(false);
    addTimeWindowButtonRef.current?.focus(); // Return focus
    setNewTimeWindowForm({ name: '', startTime: null, endTime: null, categoryId: availableCategories.length > 0 ? availableCategories[0].id : '' });
    setIsNameAutofilled(false);
    setModalError(null); // Clear previous modal errors
    setFormError(null); // Clear general page errors if any
  };

  const handleDeleteTimeWindow = (timeWindowId: string) => {
    // No API call, just update local state.
    // The actual deletion will happen when the template is saved with the new list of time windows.
    setTemplateTimeWindows(prev => prev.filter(tw => tw.id !== timeWindowId));
    setFormError(null); // Clear any previous errors
  };

  const createTemplateMutation = useMutation({
    mutationFn: createDayTemplate,
    onSuccess: (savedTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      navigate('/templates');
    },
    onError: (err: any) => {
      setFormError(`Failed to save template: ${err.response?.data?.detail || err.message || 'Unknown error'}`);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DayTemplateUpdateRequest }) => updateDayTemplate(id, data),
    onSuccess: (savedTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', savedTemplate.id] });
      setHasUnsavedChanges(false);
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
        name: tw.name,
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
                    <span className="font-medium text-gray-800">{tw.name}</span>
                    <span className="text-gray-500 ml-2 text-sm">
                      ({formatMinutesToHHMM(tw.start_time)} - {formatMinutesToHHMM(tw.end_time)})
                    </span>
                    {tw.category && (
                      <span
                        className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full`}
                        style={{
                          backgroundColor: tw.category.color ? `${tw.category.color}20` : '#E5E7EB',
                          color: tw.category.color || '#4B5563',
                        }}
                      >
                        {tw.category.name}
                      </span>
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
                onClick={() => { setIsTimeWindowModalOpen(true); setModalError(null); }}
                className="btn-standard mt-4 text-xs disabled:opacity-50"
                disabled={isLoading}
                title={"Add new time window"}
                ref={addTimeWindowButtonRef}
              >
                <AddCircleOutlineIcon sx={{ fontSize: '1.25rem' }} />
                Add new time window
              </button>
          </div>

        {isTimeWindowModalOpen && (
          <div ref={modalRef} className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add New Time Window</h3>
              {modalError && <div className="my-3 p-3 bg-red-100 text-red-600 text-sm rounded-md" aria-live="assertive" role="alert">{modalError}</div>}
              <div className="space-y-4">
                <div>
                  <label htmlFor="twCategory" className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    id="twCategory"
                    value={newTimeWindowForm.categoryId}
                    onChange={e => handleCategoryChange(e.target.value)}
                    required
                    className="form-input mt-1 block w-full py-1.5 px-3 text-sm"
                    ref={firstModalFocusableElementRef} disabled={isLoadingCategories}
                  >
                    {availableCategories.length === 0 && <option value="" disabled>Loading categories...</option>}
                    {availableCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="twName" className="block text-xs font-medium text-gray-500">Name (Optional)</label>
                  <input
                    type="text"
                    id="twName"
                    value={newTimeWindowForm.name}
                    onChange={e => {
                      setNewTimeWindowForm({...newTimeWindowForm, name: e.target.value});
                      setIsNameAutofilled(false); // User is typing, so it's not autofilled anymore
                    }}
                    className={`form-input mt-1 block w-full py-1.5 px-3 text-sm ${isNameAutofilled ? 'text-gray-500' : ''}`}
                    placeholder="Autofills from category, or enter custom name"
                  />
                </div>
                <div className="flex space-x-4">
                  <div className="w-1/2">
                    <label htmlFor="twStartTime" className="block text-sm font-medium text-gray-700">Start Time</label>
                    <DatePicker
                      selected={newTimeWindowForm.startTime}
                      onChange={(date: Date | null) => setNewTimeWindowForm({ ...newTimeWindowForm, startTime: date })}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={5}
                      timeCaption="Time"
                      dateFormat="HH:mm"
                      className="form-input mt-1 block w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 placeholder-gray-400 py-1.5 px-3 text-sm"
                      wrapperClassName="w-full"
                      required
                    />
                  </div>
                  <div className="w-1/2">
                    <label htmlFor="twEndTime" className="block text-sm font-medium text-gray-700">End Time</label>
                    <DatePicker
                      selected={newTimeWindowForm.endTime}
                      onChange={(date: Date | null) => setNewTimeWindowForm({ ...newTimeWindowForm, endTime: date })}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={5}
                      timeCaption="Time"
                      dateFormat="HH:mm"
                      className="form-input mt-1 block w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 placeholder-gray-400 py-1.5 px-3 text-sm"
                      wrapperClassName="w-full"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => { setModalError(null); setIsTimeWindowModalOpen(false); addTimeWindowButtonRef.current?.focus(); }} className="btn-standard bg-gray-100 hover:bg-gray-200 text-gray-700" disabled={isLoading}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleCreateTimeWindow} className="btn-standard disabled:opacity-50" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create & Add'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        <div className="flex justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={() => {
              if (hasUnsavedChanges) {
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
            className={`btn-standard ${hasUnsavedChanges ? 'bg-green-500 hover:bg-green-600 save-button-unsaved' : 'bg-gray-700 hover:bg-gray-900'}`}
            disabled={isLoading || (!hasUnsavedChanges && !isCreatingNew) } // Disable if no unsaved changes unless it's a new template (which might be empty but still saveable)
          >
            {isLoading ? 'Saving...' : (hasUnsavedChanges || isCreatingNew ? 'Save Changes' : 'Saved')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditTemplatePage;
