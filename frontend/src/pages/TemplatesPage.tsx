import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DayTemplateResponse } from '../types/dayTemplate';
import { getAllDayTemplates, deleteDayTemplate } from '../services/dayTemplateService';
import { formatMinutesToHHMM } from '../lib/utils';
import { TimeWindow } from '../types/timeWindow';

const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<DayTemplateResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllDayTemplates();
      setTemplates(data);
    } catch (err) {
      setError('Failed to fetch templates.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      setIsLoading(true);
      setError(null);
      try {
        await deleteDayTemplate(id);
        fetchTemplates(); // Refresh templates list
      } catch (err) {
        setError('Failed to delete template.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Templates</h1>
        <p className="text-slate-600 mt-1">Create and manage your day templates.</p>
      </header>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}
      {isLoading && <div className="mb-4">Loading templates...</div>}

      <div className="bg-white shadow-sm rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">My Templates</h2>
          <button
            onClick={() => navigate('/templates/new')}
            className="btn-standard"
          >
            <AddIcon sx={{ fontSize: '1.125rem' }} />
            <span className="truncate">Create Template</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Template Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time Windows</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {!isLoading && templates.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                    No templates found. Create one to get started!
                  </td>
                </tr>
              )}
              {templates.map((template) => (
                <tr key={template.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 align-top">{template.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 align-top">{template.description || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 align-top">
                    {template.time_windows && template.time_windows.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {template.time_windows.map((tw: TimeWindow) => {
                          const categoryColor = tw.category?.color;
                          const chipStyle: React.CSSProperties = categoryColor
                            ? { backgroundColor: `${categoryColor}33`, color: categoryColor, borderColor: categoryColor }
                            : {};

                          return (
                            <span
                              key={tw.id}
                              className={`px-2 py-0.5 text-xs rounded-full font-medium border w-fit ${!categoryColor ? 'bg-slate-100 text-slate-700 border-slate-300' : ''}`}
                              style={chipStyle}
                            >
                              {tw.name} ({formatMinutesToHHMM(tw.start_time)}-{formatMinutesToHHMM(tw.end_time)}) - {tw.category.name}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      'No time windows'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/templates/edit/${template.id}`)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        <EditOutlinedIcon sx={{ fontSize: '1.125rem' }} /> Edit
                      </button>
                      <button onClick={() => handleDelete(template.id)} className="text-red-500 hover:text-red-700 flex items-center gap-1">
                        <DeleteOutlinedIcon sx={{ fontSize: '1.125rem' }} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TemplatesPage;
