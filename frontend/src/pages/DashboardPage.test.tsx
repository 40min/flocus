import React from 'react';
import { render, act } from '@testing-library/react';
import { DragEndEvent } from '@dnd-kit/core';
import DashboardPage from './DashboardPage';
import { SharedTimerProvider, useSharedTimerContext } from '../context/SharedTimerContext';
import { useTodayDailyPlan } from '../hooks/useDailyPlan';
import { useUpdateTask } from '../hooks/useTasks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getTodayStats } from '../services/userDailyStatsService';

// Mock hooks
jest.mock('../hooks/useDailyPlan');
jest.mock('../hooks/useTasks');
jest.mock('../services/userDailyStatsService');

// Variables to hold mock functions for SharedTimerContext
const mockSetCurrentTaskId = jest.fn();
const mockSetCurrentTaskName = jest.fn();
const mockSetCurrentTaskDescription = jest.fn();
const mockHandleStartPause = jest.fn();
const mockResetForNewTask = jest.fn();
const mockHandleMarkAsDone = jest.fn(); // Added mock for handleMarkAsDone

// Mock SharedTimerContext
jest.mock('../context/SharedTimerContext', () => ({
  ...jest.requireActual('../context/SharedTimerContext'),
  useSharedTimerContext: jest.fn(() => ({
    currentTaskId: undefined,
    setCurrentTaskId: mockSetCurrentTaskId,
    setCurrentTaskName: mockSetCurrentTaskName,
    setCurrentTaskDescription: mockSetCurrentTaskDescription,
    isActive: false,
    handleStartPause: mockHandleStartPause,
    resetForNewTask: mockResetForNewTask,
    formatTime: jest.fn((seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`),
    setIsActive: jest.fn(),
    handleMarkAsDone: mockHandleMarkAsDone, // Added mock for handleMarkAsDone
  })),
}));

// Variable to capture onDragEnd from the DndContext mock
let capturedOnDragEnd: (event: DragEndEvent) => void = () => { throw new Error("onDragEnd not captured") };

// Mock @dnd-kit/core
jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  DndContext: ({ children, onDragEnd }: { children: React.ReactNode, onDragEnd: (event: DragEndEvent) => void }) => {
    capturedOnDragEnd = onDragEnd;
    return <div>{children}</div>;
  },
  useDraggable: jest.fn(({ id, disabled }) => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
    active: { id, data: { current: { title: `Task ${id}` } } },
    disabled,
  })),
}));

import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

const queryClient = new QueryClient();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <SharedTimerProvider>
            {component}
          </SharedTimerProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('DashboardPage - handleDragEnd', () => {
  beforeEach(() => {
    (getTodayStats as jest.Mock).mockResolvedValue({ pomodoros_completed: 0 });
    // Reset mocks before each test
    mockSetCurrentTaskId.mockClear();
    mockSetCurrentTaskName.mockClear();
    mockSetCurrentTaskDescription.mockClear();
    mockHandleStartPause.mockClear();
    mockResetForNewTask.mockClear();
    mockHandleMarkAsDone.mockClear(); // Clear mock for handleMarkAsDone

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
            tasks: [{ id: 'task1', title: 'Existing Task', status: 'PENDING', description: 'description for task 1' }],
          },
          {
            id: 'tw2',
            start_time: '10:00',
            end_time: '11:00',
            tasks: [{ id: 'task2', title: 'New Task To Drag', status: 'PENDING', description: 'description for task 2' }],
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: jest.fn().mockResolvedValue({}) });

    (useSharedTimerContext as jest.Mock).mockImplementation(() => ({
      currentTaskId: undefined,
      setCurrentTaskId: mockSetCurrentTaskId,
      setCurrentTaskName: mockSetCurrentTaskName,
      setCurrentTaskDescription: mockSetCurrentTaskDescription,
      isActive: false,
      handleStartPause: mockHandleStartPause,
      resetForNewTask: mockResetForNewTask,
      formatTime: jest.fn((seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`),
      setIsActive: jest.fn(),
      handleMarkAsDone: mockHandleMarkAsDone,
    }));
  });

  it('should NOT reset timer when a new task is dragged to pomodoro zone', async () => {
    (useSharedTimerContext as jest.Mock).mockReturnValue({
      currentTaskId: 'task1',
      setCurrentTaskId: mockSetCurrentTaskId,
      setCurrentTaskName: mockSetCurrentTaskName,
      setCurrentTaskDescription: mockSetCurrentTaskDescription,
      isActive: true,
      handleStartPause: mockHandleStartPause,
      resetForNewTask: mockResetForNewTask,
      formatTime: jest.fn((seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`),
      setIsActive: jest.fn(),
      handleMarkAsDone: mockHandleMarkAsDone,
    });

    renderWithProviders(<DashboardPage />);

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

    expect(mockResetForNewTask).not.toHaveBeenCalled();
    expect(mockSetCurrentTaskId).toHaveBeenCalledWith('task2');
    expect(mockSetCurrentTaskName).toHaveBeenCalledWith('New Task To Drag');
    expect(mockSetCurrentTaskDescription).toHaveBeenCalledWith('description for task 2');
  });

  it('should NOT reset and start timer if not active when a new task is dragged', async () => {

    renderWithProviders(<DashboardPage />);

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

    expect(mockResetForNewTask).not.toHaveBeenCalled();
    expect(mockSetCurrentTaskId).toHaveBeenCalledWith('task2');
    expect(mockSetCurrentTaskName).toHaveBeenCalledWith('New Task To Drag');
    expect(mockSetCurrentTaskDescription).toHaveBeenCalledWith('description for task 2');
  });
  it('should call updateTask with in_progress status when a task is dragged to pomodoro zone and timer is not active', async () => {
    const mockMutateAsync = jest.fn().mockResolvedValue({});
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: mockMutateAsync });

    renderWithProviders(<DashboardPage />);

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
      currentTaskId: 'task1',
      resetForNewTask: mockResetForNewTask,
      formatTime: jest.fn((seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`),
      setIsActive: jest.fn(),
      handleMarkAsDone: mockHandleMarkAsDone,
    });

    renderWithProviders(<DashboardPage />);

    const dragEndEvent: DragEndEvent = {
      active: { id: 'task2', data: { current: { title: 'New Task To Drag' } }, rect: { current: { initial: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }, translated: null } } } as DragEndEvent['active'],
      collisions: [],
      delta: { x: 0, y: 0 },
      over: { id: 'some-other-drop-zone', rect: {width:0, height:0, left:0, top:0, right:0, bottom:0}, data: { current: {} }, disabled: false } as DragEndEvent['over'],
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
      isActive: true,
      handleStartPause: mockHandleStartPause,
      resetForNewTask: mockResetForNewTask,
      formatTime: jest.fn(),
      setIsActive: jest.fn(),
      handleMarkAsDone: mockHandleMarkAsDone,
    }));

    renderWithProviders(<DashboardPage />);

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

    expect(mockResetForNewTask).not.toHaveBeenCalled();
    expect(mockSetCurrentTaskId).not.toHaveBeenCalled();
    expect(mockSetCurrentTaskName).not.toHaveBeenCalled();
    expect(mockHandleStartPause).not.toHaveBeenCalled();
  });

  it('should not send redundant status update for previous task when new task is dragged to pomodoro zone', async () => {
    const previousTaskId = 'task1';
    const newTaskId = 'task2';
    const mockMutateAsync = jest.fn().mockResolvedValue({});

    (useSharedTimerContext as jest.Mock).mockImplementation(() => ({
      currentTaskId: previousTaskId,
      setCurrentTaskId: mockSetCurrentTaskId,
      setCurrentTaskName: mockSetCurrentTaskName,
      setCurrentTaskDescription: mockSetCurrentTaskDescription,
      isActive: true,
      handleStartPause: mockHandleStartPause,
      resetForNewTask: mockResetForNewTask,
      formatTime: jest.fn(),
      setIsActive: jest.fn(),
      handleMarkAsDone: mockHandleMarkAsDone,
    }));
    (useUpdateTask as jest.Mock).mockReturnValue({ mutateAsync: mockMutateAsync });

    renderWithProviders(<DashboardPage />);

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

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledWith({
      taskId: newTaskId,
      taskData: { status: 'in_progress' },
    });
    expect(mockMutateAsync).not.toHaveBeenCalledWith(expect.objectContaining({
      taskId: previousTaskId,
    }));
  });
});
