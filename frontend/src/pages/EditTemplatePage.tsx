import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DayTemplateCreateRequest, DayTemplateResponse, DayTemplateUpdateRequest } from '../types/dayTemplate';
import { TimeWindow, TimeWindowCreateRequest } from '../types/timeWindow';
import { Category } from '../types/category';
import { getDayTemplateById, createDayTemplate, updateDayTemplate } from '../services/dayTemplateService';
import { getAllTimeWindows, createTimeWindow as createTimeWindowService } from '../services/timeWindowService';
import * as categoryService from '../services/categoryService';
import { formatMinutesToHHMM, hhMMToMinutes } from '../lib/utils';

const EditTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  // Store templateId in state to allow updating it after creation
  const { templateId: routeTemplateId } = useParams<{ templateId?: string }>();
  const [templateId, setTemplateId] = useState<string | undefined>(routeTemplateId);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(routeTemplateId === undefined);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTimeWindowIds, setSelectedTimeWindowIds] = useState<string[]>([]);
  const [allAvailableTimeWindows, setAllAvailableTimeWindows] = useState<TimeWindow[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isTimeWindowModalOpen, setIsTimeWindowModalOpen] = useState(false);
  const [newTimeWindowForm, setNewTimeWindowForm] = useState({
    name: '',
    startTime: '',
    endTime: '',
    categoryId: '',
  });
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);

  const fetchTemplateDetails = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const template = await getDayTemplateById(id);
      setName(template.name);
      setDescription(template.description || '');
      setSelectedTimeWindowIds(template.time_windows.map(tw => tw.id));
    } catch (err) {
      setError('Failed to fetch template details.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAllTimeWindows = useCallback(async () => {
    setIsLoading(true);
    try {
      const timeWindows = await getAllTimeWindows();
      setAllAvailableTimeWindows(timeWindows);
    } catch (err) {
      setError('Failed to fetch time windows.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTimeWindows();
    if (templateId && !isCreatingNew) { // Check isCreatingNew state
      fetchTemplateDetails(templateId);
    }

    const loadCategories = async () => {
      try {
        const cats = await categoryService.getAllCategories();
        setAvailableCategories(cats);
        if (cats.length > 0 && !newTimeWindowForm.categoryId) {
          setNewTimeWindowForm(prev => ({ ...prev, categoryId: cats[0].id }));
        }
      } catch (err) {
        console.error("Failed to fetch categories for modal", err);
        setError(prevError => (prevError ? prevError + " " : "") + "Failed to load categories for new time window.");
      }
    };
    // Load categories if editing, or if creating and modal might open
    if ((templateId && !isCreatingNew) || isTimeWindowModalOpen) {
      loadCategories();
    }
  }, [isCreatingNew, templateId, fetchTemplateDetails, fetchAllTimeWindows, isTimeWindowModalOpen]);

  const handleTimeWindowSelection = (timeWindowId: string) => {
    setSelectedTimeWindowIds(prev =>
      prev.includes(timeWindowId)
        ? prev.filter(id => id !== timeWindowId)
        : [...prev, timeWindowId]
    );
  };

  const handleCreateTimeWindow = async () => {
    if (!templateId) {
      setError("Cannot create time window: template ID is missing. Please save the template first.");
      return;
    }
    if (!newTimeWindowForm.categoryId) {
        setError("Please select a category for the new time window.");
        return;
    }

    const startTimeMinutes = hhMMToMinutes(newTimeWindowForm.startTime);
    const endTimeMinutes = hhMMToMinutes(newTimeWindowForm.endTime);

    if (startTimeMinutes === null) {
      setError("Invalid start time format or value. Please use HH:MM and ensure time is valid.");
      return;
    }
    if (endTimeMinutes === null) {
      setError("Invalid end time format or value. Please use HH:MM and ensure time is valid.");
      return;
    }

    if (endTimeMinutes <= startTimeMinutes) {
      setError("End time must be after start time.");
      return;
    }

    const timeWindowData: TimeWindowCreateRequest = {
      name: newTimeWindowForm.name || undefined,
      start_time: startTimeMinutes,
      end_time: endTimeMinutes,
      category: newTimeWindowForm.categoryId,
      day_template_id: templateId,
    };

    setIsLoading(true);
    try {
      const createdTimeWindow = await createTimeWindowService(timeWindowData);
      setAllAvailableTimeWindows(prev => [...prev, createdTimeWindow]);
      setSelectedTimeWindowIds(prev => [...prev, createdTimeWindow.id]);
      setIsTimeWindowModalOpen(false);
      setNewTimeWindowForm({ name: '', startTime: '', endTime: '', categoryId: availableCategories.length > 0 ? availableCategories[0].id : '' });
    } catch (err: any) {
      setError(`Failed to create time window: ${err.response?.data?.detail || err.message || 'Unknown error'}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Allow saving template without time windows initially
    // if (selectedTimeWindowIds.length === 0 && isCreatingNew) { // Or always? For now, allow empty for new.
    //     setError('At least one time window must be selected for a new template.');
    //     setIsLoading(false);
    //     return;
    // }

    const payload: DayTemplateCreateRequest | DayTemplateUpdateRequest = {
      name,
      description,
      time_windows: selectedTimeWindowIds,
    };

    try {
      if (isCreatingNew) {
        const newTemplate = await createDayTemplate(payload as DayTemplateCreateRequest);
        // Instead of navigating away, update state to "editing" mode for the new template
        setTemplateId(newTemplate.id);
        setIsCreatingNew(false);
        navigate(`/templates/edit/${newTemplate.id}`, { replace: true });
        // Optionally, display a success message that template was created and they can now add time windows
      } else if (templateId) {
        await updateDayTemplate(templateId, payload as DayTemplateUpdateRequest);
        navigate('/templates'); // Navigate away only after updating an existing template
      }
    } catch (err: any) {
      let displayError = isCreatingNew ? 'Failed to create template.' : 'Failed to update template.';
      if (err.response?.data?.detail && typeof err.response.data.detail === 'string') {
        displayError = err.response.data.detail;
      } else if (err.response?.data?.detail) {
        // Log the detailed object error but don't try to render it directly
        console.error("Detailed error object from API:", err.response.data.detail);
      }
      setError(displayError);
      console.error("Error during template submission:", err.response?.data || err.message || err);
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
              <span className="material-symbols-outlined mx-1 text-sm">chevron_right</span>
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

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-gray-800 text-lg font-semibold mb-4">Select Time Windows</h2>
          <p className="text-sm text-gray-500 mb-4">Choose time windows for this template. You can add more after saving.</p>
          {isLoading && <p>Loading time windows...</p>}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allAvailableTimeWindows.length > 0 ? allAvailableTimeWindows.map(tw => (
              <div key={tw.id} className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50">
                <input
                  type="checkbox"
                  id={`tw-${tw.id}`}
                  checked={selectedTimeWindowIds.includes(tw.id)}
                  onChange={() => handleTimeWindowSelection(tw.id)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor={`tw-${tw.id}`} className="ml-3 block text-sm text-gray-700 flex-grow">
                  <span className="font-medium">{tw.name}</span>
                  <span className="text-gray-500 ml-2">
                    ({formatMinutesToHHMM(tw.start_time)} - {formatMinutesToHHMM(tw.end_time)})
                  </span>
                  {tw.category && <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-${tw.category.color?.substring(1) || 'gray'}-100 text-${tw.category.color?.substring(1) || 'gray'}-700`}>{tw.category.name}</span>}
                </label>
              </div>
            )) : <p className="text-sm text-gray-500">No time windows available. Please create some first.</p>}
          </div>
           {/* Placeholder for "Add Time Window" button if full CRUD for TimeWindows is desired on this page later */}
            <button
              type="button"
              onClick={() => setIsTimeWindowModalOpen(true)}
              className="mt-4 flex items-center gap-2 rounded-lg h-9 px-3.5 bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors duration-150 disabled:bg-gray-300"
              disabled={!templateId} // Enable if templateId exists (i.e., template is saved or being edited)
              title={!templateId ? "Save template first to enable adding new time windows" : "Add new time window"}
            >
              <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'wght' 500"}}>add</span>
              Add new time window
            </button>
        </div>

        {isTimeWindowModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Create New Time Window</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="twName" className="block text-sm font-medium text-gray-700">Name (Optional)</label>
                  <input type="text" id="twName" value={newTimeWindowForm.name} onChange={e => setNewTimeWindowForm({...newTimeWindowForm, name: e.target.value})} className="form-input mt-1 block w-full"/>
                </div>
                <div>
                  <label htmlFor="twStartTime" className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input type="time" id="twStartTime" value={newTimeWindowForm.startTime} onChange={e => setNewTimeWindowForm({...newTimeWindowForm, startTime: e.target.value})} required className="form-input mt-1 block w-full"/>
                </div>
                <div>
                  <label htmlFor="twEndTime" className="block text-sm font-medium text-gray-700">End Time</label>
                  <input type="time" id="twEndTime" value={newTimeWindowForm.endTime} onChange={e => setNewTimeWindowForm({...newTimeWindowForm, endTime: e.target.value})} required className="form-input mt-1 block w-full"/>
                </div>
                <div>
                  <label htmlFor="twCategory" className="block text-sm font-medium text-gray-700">Category</label>
                  <select id="twCategory" value={newTimeWindowForm.categoryId} onChange={e => setNewTimeWindowForm({...newTimeWindowForm, categoryId: e.target.value})} required className="form-input mt-1 block w-full">
                    {availableCategories.length === 0 && <option value="" disabled>Loading categories...</option>}
                    {availableCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
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
            disabled={isLoading} // Removed: (isCreatingNew && selectedTimeWindowIds.length === 0)
          >
            {isLoading ? (isCreatingNew ? 'Creating...' : 'Saving...') : (isCreatingNew ? 'Create Template' : 'Save Changes')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditTemplatePage;
