import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DayTemplateCreateRequest, DayTemplateResponse, DayTemplateUpdateRequest } from '../types/dayTemplate';
import { TimeWindow } from '../types/timeWindow';
import { getDayTemplateById, createDayTemplate, updateDayTemplate } from '../services/dayTemplateService';
import { getAllTimeWindows } from '../services/timeWindowService';
import { formatMinutesToHHMM } from '../lib/utils';

const EditTemplatePage: React.FC = () => {
  const { templateId } = useParams<{ templateId?: string }>();
  const navigate = useNavigate();
  const isCreatingNew = templateId === undefined;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTimeWindowIds, setSelectedTimeWindowIds] = useState<string[]>([]);
  const [allAvailableTimeWindows, setAllAvailableTimeWindows] = useState<TimeWindow[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!isCreatingNew && templateId) {
      fetchTemplateDetails(templateId);
    }
  }, [isCreatingNew, templateId, fetchTemplateDetails, fetchAllTimeWindows]);

  const handleTimeWindowSelection = (timeWindowId: string) => {
    setSelectedTimeWindowIds(prev =>
      prev.includes(timeWindowId)
        ? prev.filter(id => id !== timeWindowId)
        : [...prev, timeWindowId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (selectedTimeWindowIds.length === 0) {
        setError('At least one time window must be selected.');
        setIsLoading(false);
        return;
    }

    const payload: DayTemplateCreateRequest | DayTemplateUpdateRequest = {
      name,
      description,
      time_windows: selectedTimeWindowIds,
    };

    try {
      if (isCreatingNew) {
        await createDayTemplate(payload as DayTemplateCreateRequest);
      } else if (templateId) {
        await updateDayTemplate(templateId, payload as DayTemplateUpdateRequest);
      }
      navigate('/templates');
    } catch (err) {
      setError(isCreatingNew ? 'Failed to create template.' : 'Failed to update template.');
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
          <p className="text-sm text-gray-500 mb-4">Choose the time windows to include in this template. You must select at least one.</p>
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
           {/* <button type="button" className="mt-4 flex items-center gap-2 rounded-lg h-9 px-3.5 bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors">
              <span className="material-symbols-outlined text-sm">add</span> Add New Time Window
            </button> */}
        </div>

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
            disabled={isLoading || (isCreatingNew && selectedTimeWindowIds.length === 0)}
          >
            {isLoading ? (isCreatingNew ? 'Creating...' : 'Saving...') : (isCreatingNew ? 'Create Template' : 'Save Changes')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditTemplatePage;
