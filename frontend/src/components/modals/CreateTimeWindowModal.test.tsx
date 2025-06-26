import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import CreateTimeWindowModal from './CreateTimeWindowModal';
import { MessageProvider } from 'context/MessageContext';
import { Category } from 'types/category';
import { TimeWindowAllocation } from 'types/dailyPlan';

// Mock the useMessage hook
jest.mock('context/MessageContext', () => ({
  ...jest.requireActual('context/MessageContext'),
  useMessage: () => ({
    showMessage: jest.fn(),
  }),
}));

const mockCategories: Category[] = [
  { id: 'cat1', name: 'Work', user_id: 'user1', is_deleted: false },
  { id: 'cat2', name: 'Personal', user_id: 'user1', is_deleted: false },
];

const mockExistingTimeWindows: TimeWindowAllocation[] = [
  {
    time_window: {
      id: 'tw1',
      description: 'Morning Work',
      start_time: 540, // 09:00
      end_time: 600,   // 10:00
      category: mockCategories[0],
      day_template_id: 'template1',
      user_id: 'user1',
      is_deleted: false,
    },
    tasks: [],
  },
];

const renderComponent = (props: Partial<React.ComponentProps<typeof CreateTimeWindowModal>> = {}) => {
  const defaultProps: React.ComponentProps<typeof CreateTimeWindowModal> = {
    isOpen: true,
    onClose: jest.fn(),
    onSubmitSuccess: jest.fn(),
    categories: mockCategories,
    existingTimeWindows: [],
    ...props,
  };

  return render(
    <MessageProvider>
      <CreateTimeWindowModal {...defaultProps} />
    </MessageProvider>
  );
};

describe('CreateTimeWindowModal', () => {
  it('does not render when isOpen is false', () => {
    renderComponent({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the modal with default values when open', () => {
    renderComponent();
    expect(screen.getByText('Add New Time Window')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toHaveValue('');
    expect(screen.getByLabelText('Description (Optional)')).toHaveValue('');
    expect(screen.getByLabelText('Start Time')).toHaveValue('09:00');
    expect(screen.getByLabelText('End Time')).toHaveValue('10:00');
    expect(screen.getByRole('button', { name: /Add Time Window/i })).toBeInTheDocument();
expect(screen.getByLabelText('Category')).toHaveValue('');
    expect(screen.getByLabelText('Description (Optional)')).toHaveValue('');
    expect(screen.getByLabelText('Start Time')).toHaveValue('09:00');
    expect(screen.getByLabelText('End Time')).toHaveValue('10:00');
    expect(screen.getByRole('button', { name: /Add Time Window/i })).toBeInTheDocument();
  });

  it('renders with default start and end times based on latest existing time window', () => {
    const latestEndTime = 720; // 12:00
    const existingWindowsWithLatest = [
      ...mockExistingTimeWindows,
      {
        time_window: {
          id: 'tw2',
          description: 'Afternoon Work',
          start_time: 660, // 11:00
          end_time: latestEndTime, // 12:00
          category: mockCategories[0],
          day_template_id: 'template1',
          user_id: 'user1',
          is_deleted: false,
        },
        tasks: [],
      },
    ];
    renderComponent({ existingTimeWindows: existingWindowsWithLatest });

    expect(screen.getByLabelText('Start Time')).toHaveValue('12:00');
    expect(screen.getByLabelText('End Time')).toHaveValue('13:00'); // 12:00 + 1 hour
  });

  it('caps the end time at 23:59 (1439 minutes)', () => {
    const latestEndTime = 1400; // 23:20
    const existingWindowsWithLateEnd = [
      {
        time_window: {
          id: 'tw3',
          description: 'Late Night',
          start_time: 1340, // 22:20
          end_time: latestEndTime, // 23:20
          category: mockCategories[0],
          day_template_id: 'template1',
          user_id: 'user1',
          is_deleted: false,
        },
        tasks: [],
      },
    ];
    renderComponent({ existingTimeWindows: existingWindowsWithLateEnd });

    expect(screen.getByLabelText('Start Time')).toHaveValue('23:20');
    expect(screen.getByLabelText('End Time')).toHaveValue('23:59'); // Capped at 23:59
  });

  it('resets form with default values when modal opens with new existingTimeWindows', async () => {
    const { rerender } = renderComponent({ isOpen: false, existingTimeWindows: [] });

    // Open the modal initially, it should have default 09:00-10:00
    rerender(
      <MessageProvider>
        <CreateTimeWindowModal
          isOpen={true}
          onClose={jest.fn()}
          onSubmitSuccess={jest.fn()}
          categories={mockCategories}
          existingTimeWindows={[]}
        />
      </MessageProvider>
    );
    expect(screen.getByLabelText('Start Time')).toHaveValue('09:00');
    expect(screen.getByLabelText('End Time')).toHaveValue('10:00');

    // Simulate existing time windows changing and modal re-opening
    const latestEndTime = 720; // 12:00
    const updatedExistingWindows = [
      {
        time_window: {
          id: 'tw2',
          description: 'Afternoon Work',
          start_time: 660, // 11:00
          end_time: latestEndTime, // 12:00
          category: mockCategories[0],
          day_template_id: 'template1',
          user_id: 'user1',
          is_deleted: false,
        },
        tasks: [],
      },
    ];

    rerender(
      <MessageProvider>
        <CreateTimeWindowModal
          isOpen={true}
          onClose={jest.fn()}
          onSubmitSuccess={jest.fn()}
          categories={mockCategories}
          existingTimeWindows={updatedExistingWindows}
        />
      </MessageProvider>
    );

    // Expect the form to reset with new default times based on updated existingTimeWindows
    await waitFor(() => expect(screen.getByLabelText('Start Time')).toHaveValue('12:00'));
    await waitFor(() => expect(screen.getByLabelText('End Time')).toHaveValue('13:00'));
  });

  it('renders the modal with default values when open and no categories', () => {
    renderComponent({ categories: [] });
    expect(screen.getByText('Add New Time Window')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toHaveValue('');
  });

  it('handles form submission with valid data', async () => {
    const onSubmitSuccessMock = jest.fn();
    const onCloseMock = jest.fn();
    renderComponent({ onSubmitSuccess: onSubmitSuccessMock, onClose: onCloseMock });

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'cat2' } });
    fireEvent.change(screen.getByLabelText('Description (Optional)'), { target: { value: 'Lunch Break' } });
    fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '12:00' } });
    fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '13:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Add Time Window/i }));

    await waitFor(() => {
      expect(onSubmitSuccessMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(onSubmitSuccessMock).toHaveBeenCalledWith(
        expect.objectContaining({
          time_window: expect.objectContaining({
            description: 'Lunch Break',
            start_time: 720,
            end_time: 780,
            category: mockCategories[1],
          }),
          tasks: [],
        })
      );
    });
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  it('shows validation error if end time is not after start time', async () => {
    const onSubmitSuccessMock = jest.fn();
    renderComponent({ onSubmitSuccess: onSubmitSuccessMock });

    fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '14:00' } });
    fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '13:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Add Time Window/i }));

    expect(await screen.findByText('End time must be after start time.')).toBeInTheDocument();
    expect(onSubmitSuccessMock).not.toHaveBeenCalled();
  });

  it('shows validation error for overlapping time windows', async () => {
    const onSubmitSuccessMock = jest.fn();
    renderComponent({
      onSubmitSuccess: onSubmitSuccessMock,
      existingTimeWindows: mockExistingTimeWindows
    });

    fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '09:30' } });
    fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '10:30' } });

    fireEvent.click(screen.getByRole('button', { name: /Add Time Window/i }));

    expect(await screen.findByText('New time window overlaps with an existing one.')).toBeInTheDocument();
    expect(onSubmitSuccessMock).not.toHaveBeenCalled();
  });

  it('shows validation error when category is missing', async () => {
    const onSubmitSuccessMock = jest.fn();
    renderComponent({ onSubmitSuccess: onSubmitSuccessMock, categories: [] });

    fireEvent.click(screen.getByRole('button', { name: /Add Time Window/i }));

    expect(await screen.findByText('Category is required')).toBeInTheDocument();
    expect(onSubmitSuccessMock).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onCloseMock = jest.fn();
    renderComponent({ onClose: onCloseMock });

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
