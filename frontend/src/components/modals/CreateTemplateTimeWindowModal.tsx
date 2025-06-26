import React, { useMemo } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { TimeWindow, TimeWindowInput } from '../../types/timeWindow';
import { TimeWindowAllocation } from '../../types/dailyPlan';
import { Category } from '../../types/category';
import { minutesToDate, hhMMToMinutes } from '../../lib/utils';
import { Plus, Edit } from 'lucide-react';
import Modal from './Modal'; // Assuming Modal component is available
import TimeWindowForm, { TimeWindowFormInputs } from './TimeWindowForm';

interface CreateTemplateTimeWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (timeWindow: TimeWindowInput) => void;
  availableCategories: Category[];
  existingTimeWindows: TimeWindow[];
  editingTimeWindow?: TimeWindow | null;
}

const CreateTemplateTimeWindowModal: React.FC<CreateTemplateTimeWindowModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availableCategories,
  existingTimeWindows,
  editingTimeWindow,
}) => {
  const initialData = useMemo(() => {
    if (editingTimeWindow) {
      return {
        description: editingTimeWindow.description || '',
        startTime: minutesToDate(editingTimeWindow.start_time),
        endTime: minutesToDate(editingTimeWindow.end_time),
        categoryId: editingTimeWindow.category.id,
      };
    }
    return { description: '', startTime: null, endTime: null, categoryId: '' };
  }, [existingTimeWindows, editingTimeWindow]);

  // Convert TimeWindow[] to TimeWindowAllocation[] for the overlap check in the form
  const existingTimeWindowsForOverlapCheck: TimeWindowAllocation[] = useMemo(
    () => existingTimeWindows.map((tw) => ({ time_window: tw, tasks: [] })),
    [existingTimeWindows]
  );

  const handleFormSubmit = (data: TimeWindowFormInputs) => {
    const { description, startTime, endTime, categoryId } = data;
    if (!startTime || !endTime || !categoryId) return;

    const startTimeStr = startTime ? `${startTime.getHours()}:${startTime.getMinutes()}` : '';
    const endTimeStr = endTime ? `${endTime.getHours()}:${endTime.getMinutes()}` : '';
    const startTimeMinutes = hhMMToMinutes(startTimeStr);
    const endTimeMinutes = hhMMToMinutes(endTimeStr);

    if (startTimeMinutes === null || endTimeMinutes === null) return;

    const selectedCategory = availableCategories.find(cat => cat.id === categoryId);
    if (!selectedCategory) return;

    const newTimeWindow: TimeWindowInput = {
      description: description || selectedCategory.name,
      start_time: startTimeMinutes,
      end_time: endTimeMinutes,
      category_id: categoryId,
    };
    onSubmit(newTimeWindow);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTimeWindow ? "Edit Time Window" : "Add New Time Window"}>
      <TimeWindowForm
        onSubmit={handleFormSubmit}
        onClose={onClose}
        initialData={initialData}
        availableCategories={availableCategories}
        existingTimeWindows={existingTimeWindowsForOverlapCheck}
        editingTimeWindowId={editingTimeWindow?.id}
        submitButtonContent={
          <>
            {editingTimeWindow ? <Edit size={16} /> : <Plus size={16} />}
            {editingTimeWindow ? 'Update Time Window' : 'Add Time Window'}
          </>
        }
      />
    </Modal>
  );
};

export default CreateTemplateTimeWindowModal;
