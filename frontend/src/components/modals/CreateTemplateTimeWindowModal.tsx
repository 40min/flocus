import React, { useEffect, useMemo, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { TimeWindow, TimeWindowInput } from '../../types/timeWindow';
import { Category } from '../../types/category';
import { minutesToDate, hhMMToMinutes, checkTimeWindowOverlap } from '../../lib/utils';
import { Plus, Edit } from 'lucide-react';
import Modal from './Modal'; // Assuming Modal component is available
import Button from 'components/Button';

interface CreateTemplateTimeWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (timeWindow: TimeWindowInput) => void;
  availableCategories: Category[];
  existingTimeWindows: TimeWindow[];
  editingTimeWindow?: TimeWindow | null;
}

const timeWindowFormSchemaBase = z.object({
  description: z.string().optional(),
  startTime: z.date({ required_error: 'Start time is required' }).nullable().optional(),
  endTime: z.date({ required_error: 'End time is required' }).nullable().optional(),
  categoryId: z.string().min(1, "Category is required"),
});

type TimeWindowFormInputs = z.infer<typeof timeWindowFormSchemaBase>;

const CreateTemplateTimeWindowModal: React.FC<CreateTemplateTimeWindowModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availableCategories,
  existingTimeWindows,
  editingTimeWindow,
}) => {
  const timeWindowFormSchema = useMemo(() => {
    return timeWindowFormSchemaBase.refine((data) => {
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    }, {
      message: 'End time must be after start time',
      path: ['endTime'],
    }).refine((data) => {
      const startTimeMinutes = data.startTime ? hhMMToMinutes(`${data.startTime.getHours()}:${data.startTime.getMinutes()}`) : null;
      const endTimeMinutes = data.endTime ? hhMMToMinutes(`${data.endTime.getHours()}:${data.endTime.getMinutes()}`) : null;

      if (startTimeMinutes === null || endTimeMinutes === null) return true;

      // Add a dummy category_id to satisfy TimeWindowCreateRequest
      const newTimeWindowCandidate = { start_time: startTimeMinutes, end_time: endTimeMinutes, category_id: "dummy" };
      const timeWindowsForOverlapCheck = existingTimeWindows
        .filter(tw => editingTimeWindow ? tw.id !== editingTimeWindow.id : true)
        .map(tw => ({ time_window: tw, tasks: [] }));

      return !checkTimeWindowOverlap(newTimeWindowCandidate, timeWindowsForOverlapCheck);
    }, {
      message: "New time window overlaps with an existing one.",
      path: ["startTime"],
    });
  }, [existingTimeWindows, editingTimeWindow]);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TimeWindowFormInputs>({
    resolver: zodResolver(timeWindowFormSchema),
    defaultValues: {
      description: '',
      startTime: undefined,
      endTime: undefined,
      categoryId: '',
    },
  });

  const firstModalFocusableElementRef = useRef<HTMLSelectElement>(null);


  useEffect(() => {
    if (isOpen) {
      if (editingTimeWindow) {
        reset({
          description: editingTimeWindow.description || '',
          startTime: minutesToDate(editingTimeWindow.start_time),
          endTime: minutesToDate(editingTimeWindow.end_time),
          categoryId: editingTimeWindow.category.id,
        });
      } else {
        reset({
          description: '',
          startTime: undefined,
          endTime: undefined,
          categoryId: '',
        });
      }
      firstModalFocusableElementRef.current?.focus();
    }
  }, [isOpen, reset, editingTimeWindow]);



  const handleInternalSubmit = (data: TimeWindowFormInputs) => {
    const { description, startTime, endTime, categoryId } = data;

    const startTimeStr = startTime ? `${startTime.getHours()}:${startTime.getMinutes()}` : '';
    const endTimeStr = endTime ? `${endTime.getHours()}:${endTime.getMinutes()}` : '';
    const startTimeMinutes = hhMMToMinutes(startTimeStr);
    const endTimeMinutes = hhMMToMinutes(endTimeStr);

    if (startTimeMinutes === null || endTimeMinutes === null || endTimeMinutes <= startTimeMinutes) {
      return;
    }

    const selectedCategory = availableCategories.find(cat => cat.id === categoryId);
    if (!selectedCategory) {
      return;
    }

    const newTimeWindow: TimeWindowInput = {
      description: description || selectedCategory.name,
      start_time: startTimeMinutes,
      end_time: endTimeMinutes,
      category_id: categoryId,
    };
    onSubmit(newTimeWindow);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTimeWindow ? "Edit Time Window" : "Add New Time Window"}>
      <form onSubmit={handleSubmit(handleInternalSubmit)} className="space-y-4">
        <div>
          <label htmlFor="twCategory" className="block text-sm font-medium text-gray-700">Category</label>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <select
                id="twCategory"
                {...field}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 py-2.5 px-3.5 text-sm"
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
          <input
            type="text"
            id="twDescription"
            {...register('description')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 py-2.5 px-3.5 text-sm"
            placeholder="e.g., Focus on project X"
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
        </div>
        <div className="flex space-x-4">
          <div className="w-1/2">
            <label htmlFor="twStartTime" className="block text-sm font-medium text-gray-700">Start Time</label>
            <Controller
              control={control}
              name="startTime"
              render={({ field }) => (
                <DatePicker
                  id="twStartTime"
                  selected={field.value}
                  onChange={(date) => field.onChange(date)}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="HH:mm"
                  timeFormat="HH:mm"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 py-2.5 px-3.5 text-sm"
                />
              )}
            />
            {errors.startTime && <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>}
          </div>
          <div className="w-1/2">
            <label htmlFor="twEndTime" className="block text-sm font-medium text-gray-700">End Time</label>
            <Controller
              control={control}
              name="endTime"
              render={({ field }) => (
                <DatePicker
                  id="twEndTime"
                  selected={field.value}
                  onChange={(date) => field.onChange(date)}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="HH:mm"
                  timeFormat="HH:mm"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 py-2.5 px-3.5 text-sm"
                />
              )}
            />
            {errors.endTime && <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>}
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button
          variant="slate"
          size='medium'
          onClick={handleSubmit(handleInternalSubmit)}
          className="mt-4 flex items-center gap-2"
          >
            {editingTimeWindow ? <Edit size={20} className="mr-1" /> : <Plus size={20} className="mr-1" />}
            {editingTimeWindow ? "Update Time Window" : "Add Time Window"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTemplateTimeWindowModal;
