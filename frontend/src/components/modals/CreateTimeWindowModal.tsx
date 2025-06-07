import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { TimeWindowCreateRequest, TimeWindow } from '../../types/timeWindow';
import { Category } from '../../types/category';
import { formatMinutesToHHMM, hhMMToMinutes, checkTimeWindowOverlap } from '../../lib/utils';
import { useError } from '../../context/ErrorContext';
import { TimeWindowAllocation } from '../../types/dailyPlan';

interface CreateTimeWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (newTimeWindowAllocation: TimeWindowAllocation) => void;
  categories: Category[];
  existingTimeWindows: TimeWindowAllocation[];
}

const CreateTimeWindowModal: React.FC<CreateTimeWindowModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
  categories,
  existingTimeWindows,
}) => {
  const { showError } = useError();
  const [formData, setFormData] = useState<TimeWindowCreateRequest>({
    name: '',
    start_time: 540, // Default to 9:00 AM
    end_time: 600,   // Default to 10:00 AM
    category_id: '',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [overlapError, setOverlapError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const defaultCategoryId = categories.length > 0 ? categories[0].id : '';
      setFormData({
        name: '',
        start_time: 540,
        end_time: 600,
        category_id: defaultCategoryId,
      });
      setOverlapError(null); // Clear error on modal open
    }
  }, [isOpen, categories]);

  useEffect(() => {
    if (formData.category_id) {
      const selectedCategory = categories.find(cat => cat.id === formData.category_id);
      if (selectedCategory) {
        let counter = 1;
        let newName = `${selectedCategory.name}-${counter}`;
        while (existingTimeWindows.some(tw => tw.time_window.name === newName && tw.time_window.category?.id === selectedCategory.id)) {
          counter++;
          newName = `${selectedCategory.name}-${counter}`;
        }
        setFormData(prev => ({ ...prev, name: newName }));
      }
    } else {
      setFormData(prev => ({ ...prev, name: '' }));
    }
  }, [formData.category_id, categories, existingTimeWindows]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setOverlapError(null); // Clear error on input change
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const minutes = hhMMToMinutes(value);
    if (minutes !== null) {
      setFormData(prev => ({ ...prev, [name]: minutes }));
      setOverlapError(null); // Clear error on time change
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.start_time >= formData.end_time) {
      setOverlapError('End time must be after start time.');
      return;
    }

    if (checkTimeWindowOverlap(formData, existingTimeWindows)) {
      setOverlapError('New time window overlaps with an existing one.');
      return;
    }

    setIsLoading(true);

    try {
      const tempId = `temp-${Date.now()}`;
      const selectedCategory = categories.find(cat => cat.id === formData.category_id);

      const newTimeWindow: TimeWindow = {
        id: tempId,
        name: formData.name,
        start_time: formData.start_time,
        end_time: formData.end_time,
        category: selectedCategory || { id: '', name: 'Uncategorized', user_id: '', is_deleted: false },
        day_template_id: '',
        user_id: '',
        is_deleted: false,
      };

      const newTimeWindowAllocation: TimeWindowAllocation = {
        time_window: newTimeWindow,
        tasks: [],
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
          <label htmlFor="category_id" className="block text-sm font-medium text-slate-700">Category</label>
          <select
            name="category_id"
            id="category_id"
            value={formData.category_id}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">Name</label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleInputChange}
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
        {overlapError && (
          <p className="text-red-500 text-sm">{overlapError}</p>
        )}
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
            disabled={isLoading || !formData.category_id || !!overlapError}
            className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer rounded-lg h-10 px-4 bg-slate-900 text-white text-sm font-medium shadow-sm hover:bg-slate-800 transition-colors"
          >
            {isLoading ? 'Adding...' : 'Add Time Window'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTimeWindowModal;
