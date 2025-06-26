import React, { useMemo } from 'react';
import Modal from './Modal';
import { TimeWindowCreateRequest, TimeWindow } from '../../types/timeWindow';
import { Category } from '../../types/category';
import { hhMMToMinutes, minutesToDate } from '../../lib/utils';
import { useMessage } from '../../context/MessageContext';
import { TimeWindowAllocation } from '../../types/dailyPlan';
import TimeWindowForm, { TimeWindowFormInputs } from './TimeWindowForm';
import { PlusCircle } from 'lucide-react';

interface CreateTimeWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (timeWindowAllocation: TimeWindowAllocation) => void;
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
  const { showMessage } = useMessage();

  const initialData = useMemo(() => {
    const defaultCategoryId = categories.length > 0 ? categories[0].id : '';
    return {
      description: '',
      startTime: minutesToDate(540),
      endTime: minutesToDate(600),
      categoryId: defaultCategoryId,
    };
  }, [categories]);

  const handleFormSubmit = (data: TimeWindowFormInputs) => {
    const { description, startTime, endTime, categoryId } = data;
    if (!startTime || !endTime || !categoryId) return;

    const startTimeMinutes = hhMMToMinutes(`${startTime.getHours()}:${startTime.getMinutes()}`);
    const endTimeMinutes = hhMMToMinutes(`${endTime.getHours()}:${endTime.getMinutes()}`);

    if (startTimeMinutes === null || endTimeMinutes === null) return;

    const timeWindowData: TimeWindowCreateRequest = {
      description: description,
      start_time: startTimeMinutes,
      end_time: endTimeMinutes,
      category_id: categoryId,
    };

    try {
      const tempId = `temp-${Date.now()}`;
      const selectedCategory = categories.find((cat) => cat.id === timeWindowData.category_id);

      const newTimeWindow: TimeWindow = {
        id: tempId,
        ...timeWindowData,
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
      showMessage('Time window added successfully!', 'success');
      onClose();
    } catch (error) {
      showMessage('Failed to add time window.', 'error');
      console.error('Failed to add time window:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Time Window">
      <TimeWindowForm
        onSubmit={handleFormSubmit}
        onClose={onClose}
        initialData={initialData}
        availableCategories={categories}
        existingTimeWindows={existingTimeWindows}
        submitButtonContent={
          <>
            <PlusCircle size={18} /> Add Time Window
          </>
        }
      />
    </Modal>
  );
};

export default CreateTimeWindowModal;
