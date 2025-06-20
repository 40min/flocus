import React, { useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Modal from 'components/ui/Modal';
import { Input } from 'components/ui/Input';
import { Button } from 'components/ui/Button';
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
    return endTimeMinutes > startTimeMinutes;
  }, {
    message: "End time must be after start time",
    path: ["endTime"],
  }).refine(data => {
    const startTimeMinutes = hhMMToMinutes(data.startTime);
    const endTimeMinutes = hhMMToMinutes(data.endTime);
    const otherTimeWindows = existingTimeWindows.filter(tw => tw.id !== editingTimeWindow.id);

    // checkTimeWindowOverlap expects TimeWindowAllocation[] for the second argument.
    // It internally accesses `allocation.time_window.start_time` etc.
    // However, the `editingTimeWindow` and `existingTimeWindows` props are TimeWindowAllocation,
    // which has start_time and end_time directly at the root, not under `time_window`.
    // This indicates a mismatch in type expectation or utility function usage.
    // For now, let's assume checkTimeWindowOverlap should work with {start_time, end_time} objects directly
    // and the types in utils.ts might need an update or this modal needs to adapt.
    // Given the current utils.ts, it would be:
    // newTimeWindow: { start_time: number, end_time: number }
    // existingTimeWindows: TimeWindowAllocation[] where TimeWindowAllocation is { id: string, ..., start_time: number, end_time: number, category: Category, time_window: TimeWindow }
    // The utility actually uses allocation.time_window.start_time, which is problematic if existingTimeWindows are direct allocations.

    // Let's re-evaluate based on the structure of TimeWindowAllocation from types/dailyPlan.ts
    // type TimeWindowAllocation = {
    //   id: string;
    //   day: string; // YYYY-MM-DD
    //   start_time: number; // minutes from midnight
    //   end_time: number; // minutes from midnight
    //   description?: string;
    //   category: Category;
    //   task_allocations: TaskAllocation[];
    //   // no nested time_window object
    // };
    // This means the checkTimeWindowOverlap in utils.ts is NOT compatible as is.
    // It expects `allocation.time_window.start_time`.
    // The utility should be:
    // export function checkTimeWindowOverlap(
    //   newTimeWindow: { start_time: number, end_time: number },
    //   existingTimeWindows: Array<{ start_time: number, end_time: number }> // Simpler array
    // ): boolean
    //
    // For now, I will adapt the call here to match the simpler expectation,
    // and a follow-up task should be to fix the utility or use a different one.
    // The current `otherTimeWindows` is TimeWindowAllocation[], which has start_time/end_time directly.
    // So, the .map() was actually correct if the utility expected an array of simple time objects.
    //
    // The `checkTimeWindowOverlap` in `utils.ts` has this signature:
    // checkTimeWindowOverlap(
    //   newTimeWindow: TimeWindowCreateRequest, // { category_id, start_time, end_time, description }
    //   existingTimeWindows: TimeWindowAllocation[] // { id, day, start_time, end_time, ... time_window: { id, category_id, ...}}
    // )
    // And it uses `allocation.time_window.start_time` and `allocation.time_window.end_time`.
    // This is a critical mismatch with the actual structure of `TimeWindowAllocation` from `types/dailyPlan.ts`
    // which does *not* have a nested `time_window` object. It has `start_time` and `end_time` directly.

    // The `existingTimeWindows` prop *is* `TimeWindowAllocation[]`.
    // `TimeWindowAllocation` has `start_time` and `end_time` directly.
    // The `checkTimeWindowOverlap` utility in `utils.ts` is expecting a nested `time_window` property
    // on the elements of its second argument. This is incorrect.

    // The simplest fix is to make checkTimeWindowOverlap generic or have two versions.
    // For THIS subtask, I will assume checkTimeWindowOverlap can be made to work with direct start/end times.
    // The current implementation of checkTimeWindowOverlap IS:
    // for (const allocation of existingTimeWindows) {
    //   const existingStart = allocation.time_window.start_time;
    //   const existingEnd = allocation.time_window.end_time;
    // So the .map() in the original code *was* an attempt to feed it what it *thought* it needed, but it's more complex.

    // The most direct way to use the current `checkTimeWindowOverlap` from `utils.ts`
    // is to ensure the second argument's elements *do* have a `time_window` property.
    // The `otherTimeWindows` is `TimeWindowAllocation[]`.
    // `TimeWindowAllocation` is `{ id, day, start_time, end_time, description, category, task_allocations }`
    // It does *not* have a `time_window` property.
    // The utility function `checkTimeWindowOverlap` IS WRONGLY DEFINED for use with `TimeWindowAllocation[]`.

    // I will proceed with the assumption that `checkTimeWindowOverlap` should accept an array of objects
    // that directly have `start_time` and `end_time` properties.
    // This means the original `.map(tw => ({ start_time: tw.start_time, end_time: tw.end_time }))` was correct
    // IF the utility was defined as:
    // `checkTimeWindowOverlap(newTW, existingTWs: {start_time, end_time}[])`
    // But it's not. It's `checkTimeWindowOverlap(newTW: TimeWindowCreateRequest, existingTWs: TimeWindowAllocation[])`
    // and then it tries to access `existingTWs[i].time_window.start_time`.
    // This is a bug in `checkTimeWindowOverlap` when used with `TimeWindowAllocation`.

    // For the purpose of this subtask, I will modify the call to `checkTimeWindowOverlap`
    // to pass data in the structure the current faulty `checkTimeWindowOverlap` expects,
    // by manufacturing the nested `time_window` object. This is not ideal but unblocks this task.
    // A separate task should fix `checkTimeWindowOverlap`.

    const mappedOtherTimeWindows = otherTimeWindows.map(tw => ({
      ...tw, // Spread other TimeWindowAllocation properties
      time_window: { // Manufacture the nested time_window object
        id: tw.id, // or some other placeholder if id is not from a "TimeWindow" type
        user_id: '', // placeholder
        category_id: tw.category.id,
        description: tw.description,
        start_time: tw.start_time,
        end_time: tw.end_time,
      }
    }));

    return !checkTimeWindowOverlap(
      { category_id: editingTimeWindow.category.id, start_time: startTimeMinutes, end_time: endTimeMinutes, description: data.description },
      mappedOtherTimeWindows
    );
  }, {
    message: "Time window overlaps with an existing time window",
    path: ["startTime"], // Or endTime, or a general form error
  });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: editingTimeWindow.description || '',
      startTime: formatMinutesToHHMM(editingTimeWindow.start_time),
      endTime: formatMinutesToHHMM(editingTimeWindow.end_time),
    },
  });

  useEffect(() => {
    if (editingTimeWindow) {
      reset({
        description: editingTimeWindow.description || '',
        startTime: formatMinutesToHHMM(editingTimeWindow.start_time),
        endTime: formatMinutesToHHMM(editingTimeWindow.end_time),
      });
    }
  }, [editingTimeWindow, reset, isOpen]);

  const handleFormSubmit: SubmitHandler<FormValues> = (data) => {
    const startTimeMinutes = hhMMToMinutes(data.startTime);
    const endTimeMinutes = hhMMToMinutes(data.endTime);

    onSubmit({
      id: editingTimeWindow.id,
      category_id: editingTimeWindow.category.id,
      description: data.description,
      start_time: startTimeMinutes,
      end_time: endTimeMinutes,
    });
    onClose(); // Close modal on successful submission
  };

  if (!isOpen || !editingTimeWindow) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit: ${editingTimeWindow.category.name}`}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <Input
            id="categoryName"
            type="text"
            value={editingTimeWindow.category.name}
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
          <Button type="button" variant="outline" onClick={onClose}>
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
