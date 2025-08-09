import React, { useMemo } from "react";
import Modal from "./Modal";
import { TimeWindowCreateRequest, TimeWindow } from "../../types/timeWindow";
import { Category } from "../../types/category";
import { hhMMToMinutes, minutesToDate } from "../../lib/utils";
import { useMessage } from "../../context/MessageContext";
import { TimeWindowAllocation } from "../../types/dailyPlan";
import TimeWindowForm, {
  TimeWindowFormInputs,
  createTimeWindowFormSchema,
} from "./TimeWindowForm";
import { PlusCircle } from "lucide-react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

interface TimeWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  existingTimeWindows: TimeWindowAllocation[];
  // For create mode
  onCreateSuccess?: (timeWindowAllocation: TimeWindowAllocation) => void;
  // For edit mode
  onEditSubmit?: (data: TimeWindowCreateRequest & { id: string }) => void;
  editingTimeWindow?: TimeWindowAllocation;
}

const TimeWindowModal: React.FC<TimeWindowModalProps> = ({
  isOpen,
  onClose,
  categories,
  existingTimeWindows,
  onCreateSuccess,
  onEditSubmit,
  editingTimeWindow,
}) => {
  const { showMessage } = useMessage();
  const isEditMode = !!editingTimeWindow;

  const initialData = useMemo(() => {
    if (isEditMode && editingTimeWindow) {
      return {
        description: editingTimeWindow.time_window.description || "",
        startTime: minutesToDate(editingTimeWindow.time_window.start_time),
        endTime: minutesToDate(editingTimeWindow.time_window.end_time),
        categoryId: editingTimeWindow.time_window.category.id,
      };
    }

    // Create mode - calculate next available time slot
    let startTimeMinutes = 540; // 9:00 AM default
    if (existingTimeWindows.length > 0) {
      startTimeMinutes = Math.max(
        ...existingTimeWindows.map((alloc) => alloc.time_window.end_time)
      );
    }

    const endTimeMinutes = Math.min(startTimeMinutes + 60, 1439);
    return {
      description: "",
      startTime: minutesToDate(startTimeMinutes),
      endTime: minutesToDate(endTimeMinutes),
      categoryId: "",
    };
  }, [existingTimeWindows, editingTimeWindow, isEditMode]);

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
        isEditMode ? editingTimeWindow?.time_window.id : undefined
      )
    ),
    defaultValues: initialData,
  });

  const handleFormSubmit: SubmitHandler<TimeWindowFormInputs> = (data) => {
    const { description, startTime, endTime, categoryId } = data;
    if (!startTime || !endTime) return;

    const startTimeMinutes = hhMMToMinutes(
      `${startTime.getHours()}:${startTime.getMinutes()}`
    );
    const endTimeMinutes = hhMMToMinutes(
      `${endTime.getHours()}:${endTime.getMinutes()}`
    );

    if (startTimeMinutes === null || endTimeMinutes === null) return;

    if (isEditMode && editingTimeWindow && onEditSubmit) {
      // Edit mode
      onEditSubmit({
        id: editingTimeWindow.time_window.id,
        category_id: editingTimeWindow.time_window.category.id,
        description: description,
        start_time: startTimeMinutes,
        end_time: endTimeMinutes,
      });
      onClose();
    } else if (!isEditMode && onCreateSuccess && categoryId) {
      // Create mode
      try {
        const tempId = `temp-${Date.now()}`;
        const selectedCategory = categories.find(
          (cat) => cat.id === categoryId
        );

        const newTimeWindow: TimeWindow = {
          id: tempId,
          description: description,
          start_time: startTimeMinutes,
          end_time: endTimeMinutes,
          category: selectedCategory || {
            id: "",
            name: "Uncategorized",
            user_id: "",
            is_deleted: false,
          },
          day_template_id: "",
          user_id: "",
          is_deleted: false,
        };

        const newTimeWindowAllocation: TimeWindowAllocation = {
          time_window: newTimeWindow,
          tasks: [],
        };

        onCreateSuccess(newTimeWindowAllocation);
        showMessage("Time window added successfully!", "success");
        onClose();
      } catch (error) {
        showMessage("Failed to add time window.", "error");
        console.error("Failed to add time window:", error);
      }
    }
  };

  const modalTitle = isEditMode
    ? `Edit: ${editingTimeWindow?.time_window.category.name}`
    : "Add New Time Window";

  const submitButtonContent = isEditMode ? (
    "Save Changes"
  ) : (
    <>
      <PlusCircle size={18} /> Add Time Window
    </>
  );

  const availableCategories =
    isEditMode && editingTimeWindow
      ? [editingTimeWindow.time_window.category]
      : categories;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <form
        key={isEditMode ? editingTimeWindow?.time_window.id : "create"}
        onSubmit={handleSubmit(handleFormSubmit)}
        className="space-y-4"
      >
        <TimeWindowForm
          onClose={onClose}
          initialData={initialData}
          availableCategories={availableCategories}
          existingTimeWindows={existingTimeWindows}
          editingTimeWindowId={
            isEditMode ? editingTimeWindow?.time_window.id : undefined
          }
          submitButtonContent={submitButtonContent}
          categoryDisabled={isEditMode}
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

export default TimeWindowModal;
