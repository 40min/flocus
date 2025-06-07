import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { TimeWindowCreateRequest, TimeWindow } from '../../types/timeWindow';
import { Category } from '../../types/category';
import { formatMinutesToHHMM, hhMMToMinutes } from '../../lib/utils';
import { useError } from '../../context/ErrorContext';
import { TimeWindowAllocation } from '../../types/dailyPlan';

interface CreateTimeWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (newTimeWindowAllocation: TimeWindowAllocation) => void;
  categories: Category[];
}

const CreateTimeWindowModal: React.FC<CreateTimeWindowModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
  categories,
}) => {
  const { showError } = useError();
  const [formData, setFormData] = useState<TimeWindowCreateRequest>({
    name: '',
    start_time: 540, // Default to 9:00 AM
    end_time: 600,   // Default to 10:00 AM
    category_id: '', // Initialize as empty string for select
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        start_time: 540,
        end_time: 600,
        category_id: '',
      });
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const minutes = hhMMToMinutes(value);
    if (minutes !== null) {
      setFormData({ ...formData, [name]: minutes });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const tempId = `temp-${Date.now()}`;
      const selectedCategory = categories.find(cat => cat.id === formData.category_id);

      const newTimeWindow: TimeWindow = {
        id: tempId,
        name: formData.name,
        start_time: formData.start_time,
        end_time: formData.end_time,
        category: selectedCategory || { id: '', name: 'Uncategorized', user_id: '', is_deleted: false }, // Ensure is_deleted is present
        day_template_id: '', // Not applicable for daily plan time windows
        user_id: '', // Not applicable for daily plan time windows
        is_deleted: false, // Default to false
      };

      const newTimeWindowAllocation: TimeWindowAllocation = {
        time_window: newTimeWindow,
        tasks: [], // New time windows start with no tasks
      };

      onSubmitSuccess(newTimeWindowAllocation);
      onClose();
    } catch (err) {
      showError('Failed to create time window.');
      console.error('Failed to create time window:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Time Window">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">Name</label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-slate-700">Start Time</label>
            <input
              type="time"
              name="start_time"
              id="start_time"
              value={formatMinutesToHHMM(formData.start_time)}
              onChange={handleTimeChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="end_time" className="block text-sm font-medium text-slate-700">End Time</label>
            <input
              type="time"
              name="end_time"
              id="end_time"
              value={formatMinutesToHHMM(formData.end_time)}
              onChange={handleTimeChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-slate-700">Category</label>
          <select
            name="category_id"
            id="category_id"
            value={formData.category_id || ''}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">No Category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Adding...' : 'Add Time Window'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTimeWindowModal;
