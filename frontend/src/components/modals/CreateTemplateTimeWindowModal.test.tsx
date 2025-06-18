import React from 'react';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import '@testing-library/jest-dom';
import CreateTemplateTimeWindowModal from './CreateTemplateTimeWindowModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MessageProvider } from '../../context/MessageContext';
import { Category } from '../../types/category';
import { TimeWindow } from '../../types/timeWindow';

const queryClient = new QueryClient();

const mockCategories: Category[] = [
  { id: 'cat1', name: 'Work', user_id: 'user1', is_deleted: false },
  { id: 'cat2', name: 'Break', user_id: 'user1', is_deleted: false },
];

const mockExistingTimeWindows: TimeWindow[] = [
  {
    id: 'tw1',
    description: 'Morning Work',
    start_time: 540, // 09:00
    end_time: 720,   // 12:00
    category: mockCategories[0],
    day_template_id: 'template1',
    user_id: 'user1',
    is_deleted: false,
  },
];

const renderModal = (props: Partial<React.ComponentProps<typeof CreateTemplateTimeWindowModal>> = {}) => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    availableCategories: mockCategories,
    existingTimeWindows: mockExistingTimeWindows,
    ...props,
  };

  const { rerender, ...rest } = render(
    <QueryClientProvider client={queryClient}>
      <MessageProvider>
        <CreateTemplateTimeWindowModal {...defaultProps} />
      </MessageProvider>
    </QueryClientProvider>
  );

  return { rerender, ...rest };
};

describe('CreateTemplateTimeWindowModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly in add mode', () => {
    renderModal();
    expect(screen.getByText('Add New Time Window')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Time Window/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/i)).toHaveValue('');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('');
  });

  it('renders correctly in edit mode with pre-filled data', () => {
    const editingTimeWindow: TimeWindow = {
      id: 'tw2',
      description: 'Afternoon Break',
      start_time: 780, // 13:00
      end_time: 840,   // 14:00
      category: mockCategories[1],
      day_template_id: 'template1',
      user_id: 'user1',
      is_deleted: false,
    };
    renderModal({ editingTimeWindow });

    expect(screen.getByText('Edit Time Window')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Time Window/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/i)).toHaveValue(editingTimeWindow.category.id);
    expect(screen.getByLabelText(/Description/i)).toHaveValue(editingTimeWindow.description);
  });

  it('calls onSubmit with correct data in add mode', async () => {
    const handleSubmit = jest.fn();
    renderModal({ onSubmit: handleSubmit });

    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: mockCategories[0].id } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'New Time' } });

    // For DatePicker, direct input change might not work as expected.
    // We'll simulate selecting times by setting the input value directly for simplicity in tests.
    // In a real scenario, you might use userEvent.type or more complex date picker interactions.
    const startTimeInput = screen.getByLabelText(/Start Time/i);
    await userEvent.type(startTimeInput, '10:00');
    fireEvent.blur(startTimeInput); // Keep blur to trigger validation

    const endTimeInput = screen.getByLabelText(/End Time/i);
    await userEvent.type(endTimeInput, '11:00');
    fireEvent.blur(endTimeInput);

    fireEvent.click(screen.getByRole('button', { name: /Add Time Window/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'New Time',
          start_time: 600, // 10:00 in minutes
          end_time: 660,   // 11:00 in minutes
          category_id: mockCategories[0].id,
        })
      );
    });
  });

  it('calls onSubmit with correct data in edit mode', async () => {
    const handleSubmit = jest.fn();
    const editingTimeWindow: TimeWindow = {
      id: 'tw2',
      description: 'Afternoon Break',
      start_time: 780, // 13:00
      end_time: 840,   // 14:00
      category: mockCategories[1],
      day_template_id: 'template1',
      user_id: 'user1',
      is_deleted: false,
    };
    renderModal({ onSubmit: handleSubmit, editingTimeWindow });

    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Updated Break' } });

    const startTimeInput = screen.getByLabelText(/Start Time/i);
    await userEvent.type(startTimeInput, '13:30');
    fireEvent.blur(startTimeInput);

    const endTimeInput = screen.getByLabelText(/End Time/i);
    await userEvent.type(endTimeInput, '14:30');
    fireEvent.blur(endTimeInput);

    fireEvent.click(screen.getByRole('button', { name: /Update Time Window/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Updated Break',
          start_time: 810, // 13:30 in minutes
          end_time: 870,   // 14:30 in minutes
          category_id: editingTimeWindow.category.id, // Category should remain the same unless changed
        })
      );
    });
  });

  it('shows error for overlapping time windows', async () => {
    const handleSubmit = jest.fn();
    renderModal({ onSubmit: handleSubmit });

    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: mockCategories[0].id } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Overlapping Time' } });

    const startTimeInput = screen.getByLabelText(/Start Time/i);
    await userEvent.type(startTimeInput, '09:30'); // Overlaps with tw1 (09:00-12:00)
    fireEvent.blur(startTimeInput);

    const endTimeInput = screen.getByLabelText(/End Time/i);
    await userEvent.type(endTimeInput, '10:30');
    fireEvent.blur(endTimeInput);

    fireEvent.click(screen.getByRole('button', { name: /Add Time Window/i }));

    await waitFor(() => {
      expect(handleSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('New time window overlaps with an existing one.')).toBeInTheDocument();
    });
  });

  it('does not show overlap error for editing time window against itself', async () => {
    const handleSubmit = jest.fn();
    const editingTimeWindow: TimeWindow = {
      id: 'tw1', // This is the existing time window
      description: 'Morning Work',
      start_time: 540, // 09:00
      end_time: 720,   // 12:00
      category: mockCategories[0],
      day_template_id: 'template1',
      user_id: 'user1',
      is_deleted: false,
    };
    renderModal({ onSubmit: handleSubmit, editingTimeWindow, existingTimeWindows: mockExistingTimeWindows });

    // Change description, but keep times within original range (no new overlap)
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Morning Work Updated' } });

    fireEvent.click(screen.getByRole('button', { name: /Update Time Window/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('New time window overlaps with an existing one.')).not.toBeInTheDocument();
    });
  });

  it('resets form on close', async () => {
    const handleClose = jest.fn();
    const { rerender } = renderModal({ onClose: handleClose });

    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Some text' } });
    expect(screen.getByLabelText(/Description/i)).toHaveValue('Some text');

    fireEvent.click(screen.getByRole('button', { name: /Close/i }));

    await waitFor(() => {
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    // Simulate modal closing and re-opening
    rerender(
      <QueryClientProvider client={queryClient}>
        <MessageProvider>
          <CreateTemplateTimeWindowModal isOpen={false} onClose={handleClose} onSubmit={jest.fn()} availableCategories={mockCategories} existingTimeWindows={mockExistingTimeWindows} />
        </MessageProvider>
      </QueryClientProvider>
    );

    rerender(
      <QueryClientProvider client={queryClient}>
        <MessageProvider>
          <CreateTemplateTimeWindowModal isOpen={true} onClose={handleClose} onSubmit={jest.fn()} availableCategories={mockCategories} existingTimeWindows={mockExistingTimeWindows} />
        </MessageProvider>
      </QueryClientProvider>
    );

    expect(screen.getByLabelText(/Description/i)).toHaveValue('');
  });
});
