import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { DayTemplateCreateRequest, DayTemplateUpdateRequest } from '../types/dayTemplate';
import { TimeWindow } from '../types/timeWindow'; // Removed TimeWindowCreateRequest
import { Category } from '../types/category';
import { getDayTemplateById, createDayTemplate, updateDayTemplate } from '../services/dayTemplateService';
// Removed timeWindowService imports
import * as categoryService from '../services/categoryService';
import { formatMinutesToHHMM, hhMMToMinutes } from '../lib/utils';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import AddIcon from '@mui/icons-material/Add';

const EditTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  const { templateId: routeTemplateId } = useParams<{ templateId?: string }>();
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(!routeTemplateId);
  const [actualTemplateId, setActualTemplateId] = useState<string | undefined>(routeTemplateId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateTimeWindows, setTemplateTimeWindows] = useState<TimeWindow[]>([]); // Stores the actual TimeWindow objects for the current template
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTimeWindowModalOpen, setIsTimeWindowModalOpen] = useState(false);
  const [isNameAutofilled, setIsNameAutofilled] = useState(false);

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
    currentTemplateId: string | undefined, // Can be undefined if template is not saved yet
    existingTimeWindows: TimeWindow[]
  ) => {
    if (!categoryName) return '';

    const relevantTimeWindows = existingTimeWindows.filter(tw => tw.day_template_id === currentTemplateId);
    let newName = categoryName;
    let count = 0;
    while (relevantTimeWindows.some(tw => tw.name === newName)) {
      count++;
      newName = `${categoryName} (${count})`;
    }
    return newName;
  }, []);

  const handleCategoryChange = useCallback((categoryId: string) => {
    const selectedCategory = availableCategories.find(cat => cat.id === categoryId);
    const newName = selectedCategory
      ? generateTimeWindowName(selectedCategory.name, actualTemplateId, templateTimeWindows)
      : '';

    setNewTimeWindowForm(prev => ({
      ...prev,
      categoryId,
      name: newName,
    }));
    setIsNameAutofilled(!!selectedCategory);
  }, [availableCategories, generateTimeWindowName, actualTemplateId, templateTimeWindows]);


  useEffect(() => {
    const fetchTemplateDetails = async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const template = await getDayTemplateById(id);
        setName(template.name);
        setDescription(template.description || '');
        setTemplateTimeWindows(template.time_windows || []); // Ensure it's an array
        setIsCreatingNew(false); // Now we are editing
        setActualTemplateId(id); // Ensure actualTemplateId is set when editing
      } catch (err) {
        setError('Failed to fetch template details.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (routeTemplateId) {
      fetchTemplateDetails(routeTemplateId);
    }
  }, [routeTemplateId]);

  const loadCategories = useCallback(async () => {
    // No need to setIsLoading here as it's for the modal, not the whole page
    try {
      const cats = await categoryService.getAllCategories();
      setAvailableCategories(cats);
      if (cats.length > 0 && !newTimeWindowForm.categoryId) { // Only autofill if categoryId is not already set
        const selectedCategory = cats[0];
        setNewTimeWindowForm((prev) => ({
          ...prev,
          categoryId: selectedCategory.id,
          name: generateTimeWindowName(selectedCategory.name, actualTemplateId, templateTimeWindows)
        }));
        setIsNameAutofilled(true);
      }
    } catch (err) {
      console.error("Error loading categories:", err);
      setError(
        (prevError) => (prevError ? prevError + " " : "") + "Failed to load categories for new time window."
      );
    }
  }, [generateTimeWindowName, newTimeWindowForm.categoryId, actualTemplateId, templateTimeWindows]);

  useEffect(() => {
    if (isTimeWindowModalOpen) {
      loadCategories();
    }
  }, [isTimeWindowModalOpen, loadCategories]);
  useEffect(() => {
    if (isTimeWindowModalOpen && availableCategories.length > 0) {
      // Only set initial category if form is in initial state
      const isFormEmpty = !newTimeWindowForm.name && !newTimeWindowForm.startTime && !newTimeWindowForm.endTime;
      if (isFormEmpty) {
        handleCategoryChange(availableCategories[0].id);
      }
    }
  }, [
    isTimeWindowModalOpen,
    availableCategories,
    handleCategoryChange,
    newTimeWindowForm.name,
    newTimeWindowForm.startTime,
    newTimeWindowForm.endTime
  ]);


  const handleCreateTimeWindow = async () => {
    if (!newTimeWindowForm.categoryId) { // Allow adding TW even if templateId is not yet set (for new templates)
        setError("A category must be selected before adding a time window.");
        return;
    }
    if (!newTimeWindowForm.startTime || !newTimeWindowForm.endTime) {
      setError("Please select both start and end times.");
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
      setError("Invalid time range. End time must be after start time.");
      return;
    }

    const selectedCategory = availableCategories.find(cat => cat.id === newTimeWindowForm.categoryId);
    if (!selectedCategory) {
      setError("Selected category not found.");
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
      day_template_id: actualTemplateId || '', // May be empty if template is new
      user_id: '', // Will be set by backend; not crucial for local display before save
      is_deleted: false,
    };

    setTemplateTimeWindows(prev => [...prev, newLocalTimeWindow]);
    setIsTimeWindowModalOpen(false);
    setNewTimeWindowForm({ name: '', startTime: null, endTime: null, categoryId: availableCategories.length > 0 ? availableCategories[0].id : '' });
    setIsNameAutofilled(false);
    setError(null); // Clear previous errors
  };

  const handleDeleteTimeWindow = (timeWindowId: string) => {
    // No API call, just update local state.
    // The actual deletion will happen when the template is saved with the new list of time windows.
    setTemplateTimeWindows(prev => prev.filter(tw => tw.id !== timeWindowId));
    setError(null); // Clear any previous errors
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let savedTemplate;
      if (isCreatingNew) {
        const createPayload: DayTemplateCreateRequest = {
            name: name,
            description: description,
            // Map local TimeWindow state to TimeWindowInput for creation
            time_windows: templateTimeWindows.map(tw => ({
              name: tw.name,
              start_time: tw.start_time,
              end_time: tw.end_time,
              category_id: tw.category.id, // Assumes tw.category is populated
            })),
        };
        savedTemplate = await createDayTemplate(createPayload);
        // Navigate to edit page, which will then fetch the template including its new ID.
        navigate(`/templates/edit/${savedTemplate.id}`, { replace: true });
        // No need to set state here, the navigation and subsequent useEffect will handle it.
        //setIsCreatingNew(false); // This will be handled by route change
        //setActualTemplateId(savedTemplate.id);

      } else if (actualTemplateId) {
        const updatePayload: DayTemplateUpdateRequest = {
            name,
            description,
            time_windows: templateTimeWindows.map(tw => ({
              name: tw.name,
              start_time: tw.start_time,
              end_time: tw.end_time,
              category_id: tw.category.id, // Assuming tw.category is populated and has an id
            })),
        };
        savedTemplate = await updateDayTemplate(actualTemplateId, updatePayload);
        // After update, re-fetch to ensure UI reflects the true state from backend
        const freshTemplate = await getDayTemplateById(actualTemplateId);
        setName(freshTemplate.name);
        setDescription(freshTemplate.description || '');
        setTemplateTimeWindows(freshTemplate.time_windows || []);
      }
      console.log('Template saved:', savedTemplate);

    } catch (err: any) {
      setError(`Failed to save template: ${err.response?.data?.detail || err.message || 'Unknown error'}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

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
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
                onClick={() => setIsTimeWindowModalOpen(true)}
                className="mt-4 flex items-center gap-2 rounded-lg h-9 px-3.5 bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors duration-150 disabled:opacity-50"
                disabled={isLoading}
                title={"Add new time window"}
              >
                <AddIcon sx={{ fontSize: '1.25rem' }} />
                Add new time window
              </button>
          </div>

        {isTimeWindowModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add New Time Window</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="twCategory" className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    id="twCategory"
                    value={newTimeWindowForm.categoryId}
                    onChange={e => handleCategoryChange(e.target.value)}
                    required
                    className="form-input mt-1 block w-full py-1.5 px-3 text-sm"
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
                  <button type="button" onClick={() => setIsTimeWindowModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200" disabled={isLoading}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleCreateTimeWindow} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300" disabled={isLoading}>
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
            onClick={() => navigate('/templates')}
            className="flex items-center justify-center rounded-lg h-10 px-4 bg-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-300 transition-colors duration-150"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center justify-center rounded-lg h-10 px-4 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors duration-150 disabled:bg-blue-300"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditTemplatePage;
