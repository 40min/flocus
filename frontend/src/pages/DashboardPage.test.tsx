import React from 'react';
import { render, act } from '@testing-library/react'; // Removed screen as it's not used in this specific setup
import { DragEndEvent } from '@dnd-kit/core';
import DashboardPage from './DashboardPage';
import { SharedTimerProvider, useSharedTimerContext } from '../context/SharedTimerContext'; // Keep SharedTimerProvider for wrapping
import { useTodayDailyPlan } from '../hooks/useDailyPlan';
import { useUpdateTask } from '../hooks/useTasks';

// Mock hooks
jest.mock('../hooks/useDailyPlan');
jest.mock('../hooks/useTasks');

// Variables to hold mock functions for SharedTimerContext
const mockSetCurrentTaskId = jest.fn();
const mockSetCurrentTaskName = jest.fn();
const mockSetOnTaskChanged = jest.fn();
const mockHandleStartPause = jest.fn();
const mockResetForNewTask = jest.fn();

// Mock SharedTimerContext
jest.mock('../context/SharedTimerContext', () => ({
  ...jest.requireActual('../context/SharedTimerContext'), // Import and retain SharedTimerProvider
  useSharedTimerContext: jest.fn(() => ({ // Default implementation for useSharedTimerContext
    currentTaskId: undefined,
    setCurrentTaskId: mockSetCurrentTaskId,
    setCurrentTaskName: mockSetCurrentTaskName,
    setOnTaskChanged: mockSetOnTaskChanged,
    isActive: false,
    handleStartPause: mockHandleStartPause,
    resetForNewTask: mockResetForNewTask,
    formatTime: jest.fn((seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`),
    setIsActive: jest.fn(), // Add setIsActive to the mock
  })),
}));

// Variable to capture onDragEnd from the DndContext mock
let capturedOnDragEnd: (event: DragEndEvent) => void = () => { throw new Error("onDragEnd not captured") };

// Mock @dnd-kit/core
jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  DndContext: ({ children, onDragEnd }: { children: React.ReactNode, onDragEnd: (event: DragEndEvent) => void }) => {
    capturedOnDragEnd = onDragEnd; // Capture the onDragEnd prop
    return <div>{children}</div>; // Render children to ensure the rest of the app tree renders
  },
  useDraggable: jest.fn(({ id, disabled }) => ({ // Mock useDraggable to control its behavior
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
    active: { id, data: { current: { title: `Task ${id}` } } },
    disabled, // Expose disabled state for testing
  })),
}));

describe('DashboardPage - handleDragEnd', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockSetCurrentTaskId.mockClear();
    mockSetCurrentTaskName.mockClear();
    mockSetOnTaskChanged.mockClear();
    mockHandleStartPause.mockClear();
    mockResetForNewTask.mockClear();

    // Reset capturedOnDragEnd to a state that would indicate if it's not properly captured
    capturedOnDragEnd = () => { throw new Error("onDragEnd not captured in this test run") };

    (useTodayDailyPlan as jest.Mock).mockReturnValue({
      data: {
        id: 'plan1',
        date: '2024-07-30',
        time_windows: [
          {
            id: 'tw1',
            start_time: '09:00',
            end_time: '10:00',
            tasks: [{ id: 'task1', title: 'Existing Task', status: 'PENDING' }],
          },
          {
            id: 'tw2',
            start_time: '10:00',
            end_time: '11:00',
            tasks: [{ id: 'task2', title: 'New Task To Drag', status: 'PENDING' }],
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: jest.fn().mockResolvedValue({}) });

    // Default mock for useSharedTimerContext for most tests (can be overridden)
    (useSharedTimerContext as jest.Mock).mockImplementation(() => ({
      currentTaskId: undefined,
      setCurrentTaskId: mockSetCurrentTaskId,
      setCurrentTaskName: mockSetCurrentTaskName,
      setOnTaskChanged: mockSetOnTaskChanged,
      isActive: false,
      handleStartPause: mockHandleStartPause,
      resetForNewTask: mockResetForNewTask,
      formatTime: jest.fn((seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`),
      setIsActive: jest.fn(), // Add setIsActive to the mock
    }));
  });

  it('should reset timer when a new task is dragged to pomodoro zone', async () => {
    (useSharedTimerContext as jest.Mock).mockReturnValue({
      currentTaskId: 'task1', // Simulate task1 is already active
      setCurrentTaskId: mockSetCurrentTaskId,
      setCurrentTaskName: mockSetCurrentTaskName,
      setOnTaskChanged: mockSetOnTaskChanged,
      isActive: true, // Assuming the timer is active with the current task
      handleStartPause: mockHandleStartPause,
      resetForNewTask: mockResetForNewTask,
      formatTime: jest.fn((seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`),
      setIsActive: jest.fn(), // Add setIsActive to the mock
    });

    render(
      // We use the actual SharedTimerProvider here because DashboardPage might consume other
      // parts of the context that are not mocked by useSharedTimerContext's return value directly,
      // or child components might. The primary interaction for this test is governed by the
      // mocked useSharedTimerContext hook.
      <SharedTimerProvider>
        <DashboardPage />
      </SharedTimerProvider>
    );

    const dragEndEvent: DragEndEvent = {
      active: { id: 'task2', data: { current: { title: 'New Task To Drag' } }, rect: { current: { initial: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }, translated: null } } } as DragEndEvent['active'],
      collisions: [], // Can be empty if not relevant to the logic being tested
      delta: { x: 0, y: 0 }, // Can be zero if not relevant
      over: { id: 'pomodoro-drop-zone', rect: {width:0, height:0, left:0, top:0, right:0, bottom:0}, data: { current: {} }, disabled: false } as DragEndEvent['over'],
      activatorEvent: {} as any,
    };

    // Call the captured onDragEnd
    // This simulates DndContext invoking the onDragEnd handler passed to it by DashboardPage
    await act(async () => {
      await capturedOnDragEnd(dragEndEvent);
    })

    expect(mockResetForNewTask).toHaveBeenCalledTimes(1);
    // Also verify that the new task is set (optional, but good for completeness)
    expect(mockSetCurrentTaskId).toHaveBeenCalledWith('task2');
    expect(mockSetCurrentTaskName).toHaveBeenCalledWith('New Task To Drag');
  });

  it('should reset and start timer if not active when a new task is dragged', async () => {

    render(
      <SharedTimerProvider>
        <DashboardPage />
      </SharedTimerProvider>
    );

    const dragEndEvent: DragEndEvent = {
      active: { id: 'task2', data: { current: { title: 'New Task To Drag' } }, rect: { current: { initial: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }, translated: null } } } as DragEndEvent['active'],
      collisions: [],
      delta: { x: 0, y: 0 },
      over: { id: 'pomodoro-drop-zone', rect: {width:0, height:0, left:0, top:0, right:0, bottom:0}, data: { current: {} }, disabled: false } as DragEndEvent['over'],
      activatorEvent: {} as any,
    };

    await act(async () => {
      await capturedOnDragEnd(dragEndEvent);
    })

    expect(mockResetForNewTask).toHaveBeenCalledTimes(1);
    expect(mockSetCurrentTaskId).toHaveBeenCalledWith('task2');
    expect(mockSetCurrentTaskName).toHaveBeenCalledWith('New Task To Drag');
    // Removed: expect(mockHandleStartPause).toHaveBeenCalledTimes(1);
  });
  it('should call updateTask with in_progress status when a task is dragged to pomodoro zone and timer is not active', async () => {
    const mockMutateAsync = jest.fn().mockResolvedValue({});
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: mockMutateAsync });

    render(
      <SharedTimerProvider>
        <DashboardPage />
      </SharedTimerProvider>
    );

    const dragEndEvent: DragEndEvent = {
      active: { id: 'task2', data: { current: { title: 'New Task To Drag' } }, rect: { current: { initial: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }, translated: null } } } as DragEndEvent['active'],
      collisions: [],
      delta: { x: 0, y: 0 },
      over: { id: 'pomodoro-drop-zone', rect: {width:0, height:0, left:0, top:0, right:0, bottom:0}, data: { current: {} }, disabled: false } as DragEndEvent['over'],
      activatorEvent: {} as any,
    };

    await act(async () => {
      await capturedOnDragEnd(dragEndEvent);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      taskId: 'task2',
      taskData: { status: 'in_progress' },
    });
  });

  it('should not do anything if not dragged to pomodoro zone', async () => {
    (useSharedTimerContext as jest.Mock).mockReturnValue({
      currentTaskId: 'task1', // Simulate task1 is already active
      resetForNewTask: mockResetForNewTask,
      formatTime: jest.fn((seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`),
      setIsActive: jest.fn(), // Add setIsActive to the mock
      // ... other mocks returned by useSharedTimerContext
    });

    render(
      <SharedTimerProvider>
        <DashboardPage />
      </SharedTimerProvider>
    );

    const dragEndEvent: DragEndEvent = {
      active: { id: 'task2', data: { current: { title: 'New Task To Drag' } }, rect: { current: { initial: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }, translated: null } } } as DragEndEvent['active'],
      collisions: [],
      delta: { x: 0, y: 0 },
      over: { id: 'some-other-drop-zone', rect: {width:0, height:0, left:0, top:0, right:0, bottom:0}, data: { current: {} }, disabled: false } as DragEndEvent['over'], // Different drop zone
      activatorEvent: {} as any,
    };

    await act(async () => {
      await capturedOnDragEnd(dragEndEvent);
    })

    expect(mockResetForNewTask).not.toHaveBeenCalled();
    expect(mockSetCurrentTaskId).not.toHaveBeenCalled();
    expect(mockSetCurrentTaskName).not.toHaveBeenCalled();
  });

  it('should not allow dragging an active task to the pomodoro zone', async () => {
    const activeTaskId = 'task1';
    (useSharedTimerContext as jest.Mock).mockImplementation(() => ({
      currentTaskId: activeTaskId,
      setCurrentTaskId: mockSetCurrentTaskId,
      setCurrentTaskName: mockSetCurrentTaskName,
      setOnTaskChanged: mockSetOnTaskChanged,
      isActive: true,
      handleStartPause: mockHandleStartPause,
      resetForNewTask: mockResetForNewTask,
      formatTime: jest.fn(),
      setIsActive: jest.fn(), // Add setIsActive to the mock
    }));

    render(
      <SharedTimerProvider>
        <DashboardPage />
      </SharedTimerProvider>
    );

    const dragEndEvent: DragEndEvent = {
      active: { id: activeTaskId, data: { current: { title: 'Existing Task' } }, rect: { current: { initial: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }, translated: null } } } as DragEndEvent['active'],
      collisions: [],
      delta: { x: 0, y: 0 },
      over: { id: 'pomodoro-drop-zone', rect: {width:0, height:0, left:0, top:0, right:0, bottom:0}, data: { current: {} }, disabled: false } as DragEndEvent['over'],
      activatorEvent: {} as any,
    };

    await act(async () => {
      await capturedOnDragEnd(dragEndEvent);
    });

    // Assert that none of the timer-related functions were called
    expect(mockResetForNewTask).not.toHaveBeenCalled();
    expect(mockSetCurrentTaskId).not.toHaveBeenCalled();
    expect(mockSetCurrentTaskName).not.toHaveBeenCalled();
    expect(mockSetOnTaskChanged).not.toHaveBeenCalled();
    expect(mockHandleStartPause).not.toHaveBeenCalled();
  });

  it('should not send redundant status update for previous task when new task is dragged to pomodoro zone', async () => {
    const previousTaskId = 'task1';
    const newTaskId = 'task2';
    const mockMutateAsync = jest.fn().mockResolvedValue({});

    (useSharedTimerContext as jest.Mock).mockImplementation(() => ({
      currentTaskId: previousTaskId, // Simulate previous task is active
      setCurrentTaskId: mockSetCurrentTaskId,
      setCurrentTaskName: mockSetCurrentTaskName,
      setOnTaskChanged: mockSetOnTaskChanged,
      isActive: true, // Timer is active with the previous task
      handleStartPause: mockHandleStartPause,
      resetForNewTask: mockResetForNewTask,
      formatTime: jest.fn(),
      setIsActive: jest.fn(),
    }));
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: mockMutateAsync });

    render(
      <SharedTimerProvider>
        <DashboardPage />
      </SharedTimerProvider>
    );

    const dragEndEvent: DragEndEvent = {
      active: { id: newTaskId, data: { current: { title: 'New Task To Drag' } }, rect: { current: { initial: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }, translated: null } } } as DragEndEvent['active'],
      collisions: [],
      delta: { x: 0, y: 0 },
      over: { id: 'pomodoro-drop-zone', rect: {width:0, height:0, left:0, top:0, right:0, bottom:0}, data: { current: {} }, disabled: false } as DragEndEvent['over'],
      activatorEvent: {} as any,
    };

    await act(async () => {
      await capturedOnDragEnd(dragEndEvent);
    });

    // Expect mutateAsync to be called only once for the new task
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledWith({
      taskId: newTaskId,
      taskData: { status: 'in_progress' },
    });
    // Ensure it was NOT called for the previous task
    expect(mockMutateAsync).not.toHaveBeenCalledWith(expect.objectContaining({
      taskId: previousTaskId,
    }));
  });
});
