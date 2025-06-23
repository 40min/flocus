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
const mockStopCurrentTask = jest.fn();
const mockSetCurrentTaskId = jest.fn();
const mockSetCurrentTaskName = jest.fn();
const mockSetOnTaskChanged = jest.fn();
const mockHandleStartPause = jest.fn();

// Mock SharedTimerContext
jest.mock('../context/SharedTimerContext', () => ({
  ...jest.requireActual('../context/SharedTimerContext'), // Import and retain SharedTimerProvider
  useSharedTimerContext: jest.fn(() => ({ // Default implementation for useSharedTimerContext
    currentTaskId: undefined,
    stopCurrentTask: mockStopCurrentTask,
    setCurrentTaskId: mockSetCurrentTaskId,
    setCurrentTaskName: mockSetCurrentTaskName,
    setOnTaskChanged: mockSetOnTaskChanged,
    isActive: false,
    handleStartPause: mockHandleStartPause,
    formatTime: jest.fn((seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`),
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
}));

describe('DashboardPage - handleDragEnd', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockStopCurrentTask.mockClear();
    mockSetCurrentTaskId.mockClear();
    mockSetCurrentTaskName.mockClear();
    mockSetOnTaskChanged.mockClear();
    mockHandleStartPause.mockClear();

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
    (useSharedTimerContext as jest.Mock).mockReturnValue({
        currentTaskId: undefined,
        stopCurrentTask: mockStopCurrentTask,
        setCurrentTaskId: mockSetCurrentTaskId,
        setCurrentTaskName: mockSetCurrentTaskName,
        setOnTaskChanged: mockSetOnTaskChanged,
        isActive: false,
        handleStartPause: mockHandleStartPause,
        formatTime: jest.fn((seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`),
    });
  });

  it('should call stopCurrentTask if a task is active when a new task is dragged to pomodoro zone', () => {
    // Override useSharedTimerContext mock for this specific test
    (useSharedTimerContext as jest.Mock).mockReturnValue({
      currentTaskId: 'task1', // Simulate task1 is already active
      stopCurrentTask: mockStopCurrentTask,
      setCurrentTaskId: mockSetCurrentTaskId,
      setCurrentTaskName: mockSetCurrentTaskName,
      setOnTaskChanged: mockSetOnTaskChanged,
      isActive: true, // Assuming the timer is active with the current task
      handleStartPause: mockHandleStartPause,
      formatTime: jest.fn((seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`),
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
      active: { id: 'task2', data: { current: { title: 'New Task To Drag' } }, rect: { current: { initial: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }, translated: null } } },
      collisions: [], // Can be empty if not relevant to the logic being tested
      delta: { x: 0, y: 0 }, // Can be zero if not relevant
      over: { id: 'pomodoro-drop-zone', rect: {width:0, height:0, left:0, top:0, right:0, bottom:0}, data: { current: {} }, disabled: false },
      activatorEvent: {} as any,
    };

    // Call the captured onDragEnd
    // This simulates DndContext invoking the onDragEnd handler passed to it by DashboardPage
    act(() => {
      capturedOnDragEnd(dragEndEvent);
    });

    expect(mockStopCurrentTask).toHaveBeenCalledTimes(1);
    // Also verify that the new task is set (optional, but good for completeness)
    expect(mockSetCurrentTaskId).toHaveBeenCalledWith('task2');
    expect(mockSetCurrentTaskName).toHaveBeenCalledWith('New Task To Drag');
  });

  it('should NOT call stopCurrentTask if NO task is active when a new task is dragged', () => {
    // useSharedTimerContext is already mocked by default in beforeEach to have currentTaskId = undefined
    // So, no need to override useSharedTimerContext mock here for currentTaskId

    render(
      <SharedTimerProvider>
        <DashboardPage />
      </SharedTimerProvider>
    );

    const dragEndEvent: DragEndEvent = {
      active: { id: 'task2', data: { current: { title: 'New Task To Drag' } }, rect: { current: { initial: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }, translated: null } } },
      collisions: [],
      delta: { x: 0, y: 0 },
      over: { id: 'pomodoro-drop-zone', rect: {width:0, height:0, left:0, top:0, right:0, bottom:0}, data: { current: {} }, disabled: false },
      activatorEvent: {} as any,
    };

    act(() => {
      capturedOnDragEnd(dragEndEvent);
    });

    expect(mockStopCurrentTask).not.toHaveBeenCalled();
    expect(mockSetCurrentTaskId).toHaveBeenCalledWith('task2');
    expect(mockSetCurrentTaskName).toHaveBeenCalledWith('New Task To Drag');
  });

  it('should not call stopCurrentTask or set new task if not dragged to pomodoro zone', () => {
    (useSharedTimerContext as jest.Mock).mockReturnValue({
      currentTaskId: 'task1', // Simulate task1 is already active
      stopCurrentTask: mockStopCurrentTask,
      formatTime: jest.fn((seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`),
      // ... other mocks returned by useSharedTimerContext
    });

    render(
      <SharedTimerProvider>
        <DashboardPage />
      </SharedTimerProvider>
    );

    const dragEndEvent: DragEndEvent = {
      active: { id: 'task2', data: { current: { title: 'New Task To Drag' } }, rect: { current: { initial: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }, translated: null } } },
      collisions: [],
      delta: { x: 0, y: 0 },
      over: { id: 'some-other-drop-zone', rect: {width:0, height:0, left:0, top:0, right:0, bottom:0}, data: { current: {} }, disabled: false }, // Different drop zone
      activatorEvent: {} as any,
    };

    act(() => {
      capturedOnDragEnd(dragEndEvent);
    });

    expect(mockStopCurrentTask).not.toHaveBeenCalled();
    expect(mockSetCurrentTaskId).not.toHaveBeenCalled();
    expect(mockSetCurrentTaskName).not.toHaveBeenCalled();
  });
});
