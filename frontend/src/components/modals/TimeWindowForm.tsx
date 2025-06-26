import React, { useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Controller } from 'react-hook-form';
import * as z from 'zod';
import { Category } from '../../types/category';
import { TimeWindowAllocation } from '../../types/dailyPlan';
import { checkTimeWindowOverlap, hhMMToMinutes } from '../../lib/utils';
import Button from 'components/Button';

export interface TimeWindowFormInputs {
  description?: string;
  startTime: Date | null;
  endTime: Date | null;
  categoryId: string;
}

interface TimeWindowFormProps {
  onClose: () => void;
  initialData: Partial<TimeWindowFormInputs>;
  availableCategories: Category[];
  existingTimeWindows: TimeWindowAllocation[];
  editingTimeWindowId?: string | null;
  submitButtonContent: React.ReactNode;
  categoryDisabled?: boolean;
  control: any;
  register: any;
  errors: any;
  isSubmitting: boolean;
  reset: any;
onFormSubmit: () => void;
}

export const timeWindowFormSchemaBase = z.object({
  description: z.string().optional(),
  startTime: z.date({ invalid_type_error: 'Start time is required' }).nullable(),
  endTime: z.date({ invalid_type_error: 'End time is required' }).nullable(),
  categoryId: z.string().min(1, 'Category is required'),
}).refine((data) => (data.startTime && data.endTime ? data.endTime > data.startTime : true), {
  message: 'End time must be after start time.',
  path: ['endTime'],
});

export const createTimeWindowFormSchema = (existingTimeWindows: TimeWindowAllocation[], editingTimeWindowId?: string | null) => {
  return timeWindowFormSchemaBase.refine(
    (data) => {
      if (!data.startTime || !data.endTime) return true;

      const startTimeMinutes = hhMMToMinutes(`${data.startTime.getHours()}:${data.startTime.getMinutes()}`);
      const endTimeMinutes = hhMMToMinutes(`${data.endTime.getHours()}:${data.endTime.getMinutes()}`);

      if (startTimeMinutes === null || endTimeMinutes === null) return true;

      const newTimeWindowCandidate = { start_time: startTimeMinutes, end_time: endTimeMinutes, category_id: 'dummy' };

      const timeWindowsForOverlapCheck = existingTimeWindows.filter(
        (alloc) => alloc.time_window.id !== editingTimeWindowId
      );

      return !checkTimeWindowOverlap(newTimeWindowCandidate, timeWindowsForOverlapCheck);
    },
    {
      message: 'New time window overlaps with an existing one.',
      path: ['startTime'],
    }
  );
};

const TimeWindowForm: React.FC<TimeWindowFormProps> = ({
  onClose,
  initialData,
  availableCategories,
  submitButtonContent,
  categoryDisabled,
  control,
  register,
  errors,
  isSubmitting,
  reset,
  onFormSubmit,
}) => {
  const firstModalFocusableElementRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    reset(initialData);
    if (!categoryDisabled && initialData) {
      setTimeout(() => firstModalFocusableElementRef.current?.focus(), 0);
    }
  }, [initialData, reset, categoryDisabled]);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="twCategory" className="block text-sm font-medium text-gray-700">Category</label>
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <select
              id="twCategory"
              {...field}
              disabled={categoryDisabled}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 py-2.5 px-3.5 text-sm disabled:bg-slate-200 disabled:text-slate-500"
              ref={firstModalFocusableElementRef}
            >
              <option value="">Select a category</option>
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          )}
        />
        {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>}
      </div>
      <div>
        <label htmlFor="twDescription" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
        <input type="text" id="twDescription" {...register('description')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 py-2.5 px-3.5 text-sm" placeholder="e.g., Focus on project X" />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
      </div>
      <div className="flex space-x-4">
        <div className="w-1/2">
          <label htmlFor="twStartTime" className="block text-sm font-medium text-gray-700">Start Time</label>
          <Controller control={control} name="startTime" render={({ field }) => ( <DatePicker id="twStartTime" selected={field.value} onChange={(date) => field.onChange(date)} showTimeSelect showTimeSelectOnly timeIntervals={15} timeCaption="Time" dateFormat="HH:mm" timeFormat="HH:mm" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 py-2.5 px-3.5 text-sm" /> )} />
          {errors.startTime && <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>}
        </div>
        <div className="w-1/2">
          <label htmlFor="twEndTime" className="block text-sm font-medium text-gray-700">End Time</label>
          <Controller control={control} name="endTime" render={({ field }) => ( <DatePicker id="twEndTime" selected={field.value} onChange={(date) => field.onChange(date)} showTimeSelect showTimeSelectOnly timeIntervals={15} timeCaption="Time" dateFormat="HH:mm" timeFormat="HH:mm" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 py-2.5 px-3.5 text-sm" /> )} />
          {errors.endTime && <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>}
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <Button type="button" variant="secondary" size="medium" onClick={onClose}> Cancel </Button>
        <Button type="button" variant="slate" size="medium" disabled={isSubmitting} className="flex items-center gap-2" onClick={onFormSubmit}> {submitButtonContent} </Button>
      </div>
    </div>
  );
};

export default TimeWindowForm;
