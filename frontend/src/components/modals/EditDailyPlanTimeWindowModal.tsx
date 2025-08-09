import React, { useMemo } from "react";
import Modal from "components/modals/Modal";
import { TimeWindowCreateRequest } from "types/timeWindow";
import { hhMMToMinutes, minutesToDate } from "lib/utils";
import TimeWindowForm, {
  TimeWindowFormInputs,
  createTimeWindowFormSchema,
} from "./TimeWindowForm";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TimeWindowAllocation } from "types/dailyPlan";

interface EditDailyPlanTimeWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TimeWindowCreateRequest & { id: string }) => void;
  editingTimeWindow: TimeWindowAllocation;
  existingTimeWindows: TimeWindowAllocation[];
}

const EditDailyPlanTimeWindowModal: React.FC<
  EditDailyPlanTimeWindowModalProps
> = ({ isOpen, onClose, onSubmit, editingTimeWindow, existingTimeWindows }) => {
  const initialData = useMemo(() => {
    if (!editingTimeWindow) {
      return {
        description: "",
        startTime: null,
        endTime: null,
        categoryId: "",
      };
    }
    return {
      description: editingTimeWindow.time_window.description || "",
      startTime: minutesToDate(editingTimeWindow.time_window.start_time),
      endTime: minutesToDate(editingTimeWindow.time_window.end_time),
      categoryId: editingTimeWindow.time_window.category.id,
    };
  }, [editingTimeWindow]);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TimeWindowFormInputs>({
    resolver: zodResolver(
      createTimeWindowFormSchema(
        existingTimeWindows,
        editingTimeWindow.time_window.id
      )
    ),
    defaultValues: initialData,
  });

  const handleFormSubmit: SubmitHandler<TimeWindowFormInputs> = (data) => {
    const { description, startTime, endTime } = data;
    if (!startTime || !endTime) return;

    const startTimeMinutes = hhMMToMinutes(
      `${startTime.getHours()}:${startTime.getMinutes()}`
    );
    const endTimeMinutes = hhMMToMinutes(
      `${endTime.getHours()}:${endTime.getMinutes()}`
    );

    if (startTimeMinutes === null || endTimeMinutes === null) return;

    onSubmit({
      id: editingTimeWindow.time_window.id,
      category_id: editingTimeWindow.time_window.category.id,
      description: description,
      start_time: startTimeMinutes,
      end_time: endTimeMinutes,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit: ${editingTimeWindow.time_window.category.name}`}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <TimeWindowForm
          onClose={onClose}
          initialData={initialData}
          availableCategories={[editingTimeWindow.time_window.category]}
          existingTimeWindows={existingTimeWindows}
          editingTimeWindowId={editingTimeWindow.time_window.id}
          submitButtonContent="Save Changes"
          categoryDisabled={true}
          control={control}
          register={register}
          errors={errors}
          isSubmitting={isSubmitting}
          reset={reset}
        />
      </form>
    </Modal>
  );
};

export default EditDailyPlanTimeWindowModal;
