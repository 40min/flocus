import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditDailyPlanTimeWindowModal from './EditDailyPlanTimeWindowModal';
import { TimeWindowAllocation } from 'types/dailyPlan';
import { Category } from 'types/category';
import { formatMinutesToHHMM, hhMMToMinutes } from 'lib/utils'; // checkTimeWindowOverlap is also here

const mockCategory: Category = {
  id: 'cat1',
  name: 'Work',
  color: '#FF0000',
  user_id: 'user1',
  is_deleted: false,
};

const mockEditingTimeWindow: TimeWindowAllocation = {
  time_window: {
    id: 'tw1',
    description: 'Morning session',
    start_time: 540, // 09:00
    end_time: 600,   // 10:00
    category: mockCategory,
    day_template_id: 'template1', // Placeholder
    user_id: 'user1', // Placeholder
    is_deleted: false,
  },
  tasks: [],
};

const mockExistingTimeWindows: TimeWindowAllocation[] = [
  {
    time_window: {
      id: 'tw2',
      description: 'Lunch break',
      start_time: 660, // 11:00
      end_time: 720,   // 12:00
      category: { ...mockCategory, id: 'cat2', name: 'Break' },
      day_template_id: 'template1', // Placeholder
      user_id: 'user1', // Placeholder
      is_deleted: false,
    },
    tasks: [],
  },
  {
    time_window: {
      id: 'tw3',
      description: 'Afternoon session',
      start_time: 780, // 13:00
      end_time: 840,   // 14:00
      category: mockCategory,
      day_template_id: 'template1', // Placeholder
      user_id: 'user1', // Placeholder
      is_deleted: false,
    },
    tasks: [],
  },
];

describe('EditDailyPlanTimeWindowModal', () => {
  let mockOnClose: jest.Mock;
  let mockOnSubmit: jest.Mock;

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnSubmit = jest.fn();
  });

  const renderModal = (
    editingTW: TimeWindowAllocation = mockEditingTimeWindow,
    existingTWs: TimeWindowAllocation[] = mockExistingTimeWindows
  ) => {
    return render(
      <EditDailyPlanTimeWindowModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        editingTimeWindow={editingTW}
        existingTimeWindows={existingTWs}
      />
    );
  };

  test('pre-fills form correctly with editingTimeWindow data', () => {
    renderModal();

    expect(screen.getByLabelText(/description/i)).toHaveValue(mockEditingTimeWindow.time_window.description);
    expect(screen.getByLabelText(/start time/i)).toHaveValue(formatMinutesToHHMM(mockEditingTimeWindow.time_window.start_time));
    expect(screen.getByLabelText(/end time/i)).toHaveValue(formatMinutesToHHMM(mockEditingTimeWindow.time_window.end_time));

    const categoryInput = screen.getByLabelText(/category/i) as HTMLInputElement;
    expect(categoryInput).toHaveValue(mockEditingTimeWindow.time_window.category.id);
    expect(categoryInput).toBeDisabled();
  });

  test('calls onSubmit with correct data for valid submission', async () => {
    renderModal();

    const newDescription = 'Updated session';
    const newStartTime = '09:30'; // 570 minutes
    const newEndTime = '10:30';   // 630 minutes

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: newDescription } });
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: newStartTime } });
    fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: newEndTime } });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        id: mockEditingTimeWindow.time_window.id,
        category_id: mockEditingTimeWindow.time_window.category.id,
        description: newDescription,
        start_time: hhMMToMinutes(newStartTime),
        end_time: hhMMToMinutes(newEndTime),
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  test('shows error if end time is not after start time', async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '09:00' } });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/end time must be after start time/i)).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('shows error if time window overlaps with an existing one', async () => {
    // Editing tw1 (09:00-10:00). Existing tw2 is 11:00-12:00.
    // Let's try to move tw1 to 10:30-11:30, which overlaps with tw2.
    renderModal();

    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '10:30' } }); // 630
    fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '11:30' } });   // 690

    // Existing tw2 is 660 - 720. Overlap: (630 < 720) && (690 > 660) -> true

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/New time window overlaps with an existing one./i)).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('does not show overlap error if editing item does not overlap with others', async () => {
    // Editing tw1 (09:00-10:00)
    // Existing: tw2 (11:00-12:00), tw3 (13:00-14:00)
    // Change tw1 to 08:00-08:30. No overlap.
    renderModal();

    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '08:00' } });
    fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '08:30' } });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        id: mockEditingTimeWindow.time_window.id,
        category_id: mockEditingTimeWindow.time_window.category.id,
        description: mockEditingTimeWindow.time_window.description, // Description wasn't changed in this test
        start_time: hhMMToMinutes('08:00'),
        end_time: hhMMToMinutes('08:30'),
      });
    });
    expect(screen.queryByText(/New time window overlaps with an existing one./i)).not.toBeInTheDocument();
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('does not show overlap error with itself when times are unchanged', async () => {
    renderModal(); // Initial times are 09:00-10:00

    // Submit without changing times
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        id: mockEditingTimeWindow.time_window.id,
        category_id: mockEditingTimeWindow.time_window.category.id,
        description: mockEditingTimeWindow.time_window.description,
        start_time: mockEditingTimeWindow.time_window.start_time,
        end_time: mockEditingTimeWindow.time_window.end_time,
      });
    });
    expect(screen.queryByText(/New time window overlaps with an existing one./i)).not.toBeInTheDocument();
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

});
