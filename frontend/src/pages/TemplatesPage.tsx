import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { deleteDayTemplate } from '../services/dayTemplateService';
import { formatMinutesToHHMM } from '../lib/utils';
import { TimeWindow } from '../types/timeWindow';
import { useTemplates } from '../hooks/useTemplates';
import Button from '../components/Button';

const TemplatesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: templates = [], isLoading, error } = useTemplates();
  const navigate = useNavigate();

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteDayTemplate(id);
        queryClient.invalidateQueries({ queryKey: ['templates'] });
      } catch (err) {
        console.error(err);
        // Optionally show an error message to the user
      }
    }
  };

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Templates</h1>
        <p className="text-slate-600 mt-1">Create and manage your day templates.</p>
      </header>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error.message}</div>}

      <div className="bg-white shadow-sm rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">My Templates</h2>
          <Button
            onClick={() => navigate('/templates/new')}
            variant="slate"
            size="medium"
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="truncate">Create Template</span>
          </Button>
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
              {isLoading && (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">Loading templates...</td></tr>
              )}
              {!isLoading && !error && templates.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                    No templates found. Create one to get started!
                  </td>
                </tr>
              )}
              {!isLoading && !error && templates.map((template) => (
                <tr key={template.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 align-top">{template.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 align-top">{template.description || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 align-top">
                    {template.time_windows && template.time_windows.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {template.time_windows.slice().sort((a, b) => a.start_time - b.start_time).map((tw: TimeWindow) => {
                          return (
                            <div
                              key={tw.id}
                              className="text-xs"
                            >
                              <span className="font-semibold" style={{ color: tw.category?.color || 'inherit' }}>
                                {tw.category.name}
                              </span>
                              <span className="text-slate-500"> ({formatMinutesToHHMM(tw.start_time)}-{formatMinutesToHHMM(tw.end_time)})</span>
                              {tw.description && (
                                <p className="text-slate-400 italic pl-1">{tw.description}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      'No time windows'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/templates/edit/${template.id}`)}
                        title='Edit Template'
                      >
                        <Edit size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template.id)}
                        title='Delete Template'
                      >
                        <Trash2 size={18} />
                      </Button>
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
