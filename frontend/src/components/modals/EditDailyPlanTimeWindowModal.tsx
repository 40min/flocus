import React, { useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Modal from 'components/modals/Modal';
import Input from 'components/Input';
import Button from 'components/Button';
import { TimeWindowAllocation } from 'types/dailyPlan';
import { TimeWindowCreateRequest } from 'types/timeWindow';
import { formatMinutesToHHMM, hhMMToMinutes, checkTimeWindowOverlap } from 'lib/utils';

interface EditDailyPlanTimeWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TimeWindowCreateRequest & { id: string }) => void;
  editingTimeWindow: TimeWindowAllocation;
  existingTimeWindows: TimeWindowAllocation[];
}

interface FormValues {
  description?: string;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
}

const EditDailyPlanTimeWindowModal: React.FC<EditDailyPlanTimeWindowModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingTimeWindow,
  existingTimeWindows,
}) => {
  // Form schema for validation
  const schema = z.object({
    description: z.string().optional(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
  }).refine(data => {
    const startTimeMinutes = hhMMToMinutes(data.startTime);
    const endTimeMinutes = hhMMToMinutes(data.endTime);
    if (startTimeMinutes === null || endTimeMinutes === null) {
      return false; // Should be caught by earlier regex validation, but as a safeguard
    }
    return endTimeMinutes > startTimeMinutes;
  }, {
    message: "End time must be after start time",
    path: ["endTime"],
  }).refine(data => {
    const startTimeMinutes = hhMMToMinutes(data.startTime);
    const endTimeMinutes = hhMMToMinutes(data.endTime);

    if (startTimeMinutes === null || endTimeMinutes === null) {
      return false; // Should be caught by earlier regex validation, but as a safeguard
    }

    const otherTimeWindows = existingTimeWindows.filter(tw => tw.time_window.id !== editingTimeWindow.time_window.id);

    return !checkTimeWindowOverlap(
      { category_id: editingTimeWindow.time_window.category.id, start_time: startTimeMinutes, end_time: endTimeMinutes, description: data.description },
      otherTimeWindows
    );
  }, {
    message: "Time window overlaps with an existing time window",
    path: ["startTime"],
  });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: editingTimeWindow.time_window.description || '',
      startTime: formatMinutesToHHMM(editingTimeWindow.time_window.start_time),
      endTime: formatMinutesToHHMM(editingTimeWindow.time_window.end_time),
    },
  });

  useEffect(() => {
    if (editingTimeWindow) {
      reset({
        description: editingTimeWindow.time_window.description || '',
        startTime: formatMinutesToHHMM(editingTimeWindow.time_window.start_time),
        endTime: formatMinutesToHHMM(editingTimeWindow.time_window.end_time),
      });
    }
  }, [editingTimeWindow, reset, isOpen]);

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    const startTimeMinutes = hhMMToMinutes(data.startTime);
    const endTimeMinutes = hhMMToMinutes(data.endTime);

    if (startTimeMinutes === null || endTimeMinutes === null) {
      // This case should ideally be caught by Zod validation, but as a safeguard
      console.error("Invalid time format detected during submission.");
      return;
    }

    onSubmit({
      id: editingTimeWindow.time_window.id,
      category_id: editingTimeWindow.time_window.category.id,
      description: data.description,
      start_time: startTimeMinutes,
      end_time: endTimeMinutes,
    });
    onClose(); // Close modal on successful submission
  };

  if (!isOpen || !editingTimeWindow) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit: ${editingTimeWindow.time_window.category.name}`}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <Input
            id="categoryName"
            type="text"
            value={editingTimeWindow.time_window.category.name}
            disabled
            className="mt-1 block w-full"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description (Optional)
          </label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Input {...field} id="description" className="mt-1 block w-full" />
            )}
          />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
        </div>

        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
            Start Time
          </label>
          <Controller
            name="startTime"
            control={control}
            render={({ field }) => (
              <Input {...field} id="startTime" type="time" className="mt-1 block w-full" />
            )}
          />
          {errors.startTime && <p className="text-red-500 text-xs mt-1">{errors.startTime.message}</p>}
        </div>

        <div>
          <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
            End Time
          </label>
          <Controller
            name="endTime"
            control={control}
            render={({ field }) => (
              <Input {...field} id="endTime" type="time" className="mt-1 block w-full" />
            )}
          />
          {errors.endTime && <p className="text-red-500 text-xs mt-1">{errors.endTime.message}</p>}
          {/* For displaying general form error like overlap if not tied to a specific field by Zod */}
          {errors.root?.message && <p className="text-red-500 text-xs mt-1">{errors.root.message}</p>}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditDailyPlanTimeWindowModal;
