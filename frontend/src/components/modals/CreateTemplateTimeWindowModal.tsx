import React, { useEffect, useRef, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useForm, Controller } from 'react-hook-form';
import { TimeWindow, TimeWindowInput } from '../../types/timeWindow';
import { Category } from '../../types/category';
import { formatMinutesToHHMM, hhMMToMinutes } from '../../lib/utils';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import Modal from './Modal'; // Assuming Modal component is available

interface CreateTemplateTimeWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (timeWindow: TimeWindowInput) => void;
  availableCategories: Category[];
  existingTimeWindows: TimeWindow[];
}

interface TimeWindowFormInputs {
  name: string;
  startTime: Date | null;
  endTime: Date | null;
  categoryId: string;
}

const CreateTemplateTimeWindowModal: React.FC<CreateTemplateTimeWindowModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availableCategories,
  existingTimeWindows,
}) => {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<TimeWindowFormInputs>({
    defaultValues: {
      name: '',
      startTime: null,
      endTime: null,
      categoryId: availableCategories.length > 0 ? availableCategories[0].id : '',
    },
  });

  const newTimeWindowForm = watch(); // Watch all fields to react to changes
  const firstModalFocusableElementRef = useRef<HTMLSelectElement>(null);

  const generateTimeWindowName = useCallback((
    categoryName: string,
    currentExistingTimeWindows: TimeWindow[]
  ) => {
    if (!categoryName) return '';

    const relevantTimeWindows = currentExistingTimeWindows;
    let newName = categoryName;
    if (!relevantTimeWindows.some(tw => tw.name === newName)) {
      return newName;
    }

    let count = 1;
    while (true) {
      const currentNameCandidate = `${categoryName}-${count}`;
      if (!relevantTimeWindows.some(tw => tw.name === currentNameCandidate)) {
        newName = currentNameCandidate;
        break;
      }
      count++;
    }
    return newName;
  }, []);

  useEffect(() => {
    if (isOpen) {
      reset({
        name: '',
        startTime: null,
        endTime: null,
        categoryId: availableCategories.length > 0 ? availableCategories[0].id : '',
      });
      firstModalFocusableElementRef.current?.focus();
    }
  }, [isOpen, reset, availableCategories]);

  useEffect(() => {
    const selectedCategory = availableCategories.find(cat => cat.id === newTimeWindowForm.categoryId);
    if (selectedCategory && !newTimeWindowForm.name) { // Only autofill if name is empty
      const newName = generateTimeWindowName(selectedCategory.name, existingTimeWindows);
      setValue('name', newName);
    }
  }, [newTimeWindowForm.categoryId, availableCategories, generateTimeWindowName, existingTimeWindows, setValue, newTimeWindowForm.name]);


  const handleInternalSubmit = (data: TimeWindowFormInputs, event: React.BaseSyntheticEvent | undefined) => {
    event?.preventDefault(); // Ensure default form submission is prevented
    const { name, startTime, endTime, categoryId } = data;

    if (!categoryId) {
      // This should ideally be caught by react-hook-form validation, but as a fallback
      return;
    }
    if (!startTime || !endTime) {
      // This should ideally be caught by react-hook-form validation, but as a fallback
      return;
    }

    const formatTime = (date: Date): string => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    const startTimeStr = formatTime(startTime);
    const endTimeStr = formatTime(endTime);
    const startTimeMinutes = hhMMToMinutes(startTimeStr);
    const endTimeMinutes = hhMMToMinutes(endTimeStr);

    if (startTimeMinutes === null || endTimeMinutes === null || endTimeMinutes <= startTimeMinutes) {
      // This should be handled by validation rules
      return;
    }

    for (const existingTW of existingTimeWindows) {
      if (
        startTimeMinutes < existingTW.end_time &&
        endTimeMinutes > existingTW.start_time
      ) {
        // This should be handled by validation rules
        return;
      }
    }

    const selectedCategory = availableCategories.find(cat => cat.id === categoryId);
    if (!selectedCategory) {
      // This should ideally be caught by react-hook-form validation
      return;
    }

    const newTimeWindow: TimeWindowInput = {
      name: name || selectedCategory.name,
      start_time: startTimeMinutes,
      end_time: endTimeMinutes,
      category_id: categoryId,
    };

    onSubmit(newTimeWindow);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Time Window">
      <form onSubmit={handleSubmit(handleInternalSubmit)} className="space-y-4">
        <div>
          <label htmlFor="twCategory" className="block text-sm font-medium text-gray-700">Category</label>
          <select
            id="twCategory"
            {...register('categoryId', { required: 'Category is required' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 py-2.5 px-3.5 text-sm"
            ref={firstModalFocusableElementRef}
          >
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>}
        </div>
        <div>
          <label htmlFor="twName" className="block text-sm font-medium text-gray-700">Time Window Name</label>
          <input
            type="text"
            id="twName"
            {...register('name', { required: 'Time window name is required' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 py-2.5 px-3.5 text-sm"
            placeholder="e.g., Deep Work"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div className="flex space-x-4">
          <div className="w-1/2">
            <label htmlFor="twStartTime" className="block text-sm font-medium text-gray-700">Start Time</label>
            <Controller
              control={control}
              name="startTime"
              rules={{ required: 'Start time is required' }}
              render={({ field }) => (
                <DatePicker
                  selected={field.value}
                  onChange={(date) => field.onChange(date)}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="h:mm aa"
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
              rules={{
                required: 'End time is required',
                validate: (value) => {
                  const startTime = watch('startTime');
                  if (startTime && value && value <= startTime) {
                    return 'End time must be after start time';
                  }
                  return true;
                },
              }}
              render={({ field }) => (
                <DatePicker
                  selected={field.value}
                  onChange={(date) => field.onChange(date)}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="h:mm aa"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 py-2.5 px-3.5 text-sm"
                />
              )}
            />
            {errors.endTime && <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>}
          </div>
        </div>
        {/* Manual overlap validation error display */}
        {errors.startTime?.type === 'validate' && errors.startTime.message && (
          <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>
        )}
        {errors.endTime?.type === 'validate' && errors.endTime.message && (
          <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>
        )}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-sm px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary text-sm px-4 py-2"
          >
            <AddCircleOutlineIcon sx={{ fontSize: '1.25rem', mr: 1 }} />
            Add Time Window
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTemplateTimeWindowModal;
