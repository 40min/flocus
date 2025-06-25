import React, { useEffect, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Modal from './Modal';
import { TimeWindowCreateRequest, TimeWindow } from '../../types/timeWindow';
import { Category } from '../../types/category';
import { formatMinutesToHHMM, hhMMToMinutes, checkTimeWindowOverlap } from '../../lib/utils';
import { useMessage } from '../../context/MessageContext';
import { TimeWindowAllocation } from '../../types/dailyPlan';

interface CreateTimeWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (newTimeWindowAllocation: TimeWindowAllocation) => void;
  categories: Category[];
  existingTimeWindows: TimeWindowAllocation[];
}

const createTimeWindowSchemaBase = z.object({
  description: z.string().optional(),
  start_time: z.number(),
  end_time: z.number(),
  category_id: z.string().min(1, 'Category is required'),
});


const CreateTimeWindowModal: React.FC<CreateTimeWindowModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
  categories,
  existingTimeWindows,
}) => {
  const createTimeWindowSchema = useMemo(() => {
    return createTimeWindowSchemaBase.refine(data => data.end_time > data.start_time, {
      message: 'End time must be after start time.',
      path: ['end_time']
    }).refine(data => {
      return !checkTimeWindowOverlap(data, existingTimeWindows);
    }, {
      message: 'New time window overlaps with an existing one.',
      path: ['start_time']
    });
  }, [existingTimeWindows]);

  const { showMessage } = useMessage();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<TimeWindowCreateRequest>({
    resolver: zodResolver(createTimeWindowSchema),
    defaultValues: {
      description: '',
      start_time: 540, // Default to 9:00 AM
      end_time: 600,   // Default to 10:00 AM
      category_id: '',
    },
  });

  const startTime = watch('start_time');
  const endTime = watch('end_time');

  useEffect(() => {
    if (isOpen) {
      const defaultCategoryId = categories.length > 0 ? categories[0].id : '';
      reset({
        description: '',
        start_time: 540,
        end_time: 600,
        category_id: defaultCategoryId,
      });
    }
  }, [isOpen, categories, reset]);


  const onSubmit: SubmitHandler<TimeWindowCreateRequest> = async (data) => {
    try {
      const tempId = `temp-${Date.now()}`;
      const selectedCategory = categories.find(cat => cat.id === data.category_id);

      const newTimeWindow: TimeWindow = {
        id: tempId,
        description: data.description,
        start_time: data.start_time,
        end_time: data.end_time,
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
      showMessage('Failed to create time window.', 'error');
      console.error('Failed to create time window:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Time Window">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-slate-700">Category</label>
          <select
            id="category_id"
            {...register('category_id')}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {errors.category_id && <p className="text-red-500 text-sm">{errors.category_id.message}</p>}
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description (Optional)</label>
          <input
            type="text"
            id="description"
            {...register('description')}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="e.g., Focus on project X"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-slate-700">Start Time</label>
            <input
              type="time"
              id="start_time"
              value={formatMinutesToHHMM(startTime)}
              onChange={(e) => setValue('start_time', hhMMToMinutes(e.target.value) || 0, { shouldValidate: true })}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.start_time && <p className="text-red-500 text-sm">{errors.start_time.message}</p>}
          </div>
          <div>
            <label htmlFor="end_time" className="block text-sm font-medium text-slate-700">End Time</label>
            <input
              type="time"
              id="end_time"
              value={formatMinutesToHHMM(endTime)}
              onChange={(e) => setValue('end_time', hhMMToMinutes(e.target.value) || 0, { shouldValidate: true })}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.end_time && <p className="text-red-500 text-sm">{errors.end_time.message}</p>}
          </div>
        </div>
        {errors.start_time && errors.start_time.type === 'custom' && <p className="text-red-500 text-sm">{errors.start_time.message}</p>}
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
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer rounded-lg h-10 px-4 bg-slate-900 text-white text-sm font-medium shadow-sm hover:bg-slate-800 transition-colors"
          >
            {isSubmitting ? 'Adding...' : 'Add Time Window'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTimeWindowModal;
