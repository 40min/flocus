import React from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTaskModal } from "./useTaskModal";
import { Task } from "types/task";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockTask: Task = {
  id: "task1",
  title: "Test Task",
  status: "pending",
  priority: "medium",
  user_id: "user1",
};

describe("useTaskModal", () => {
  it("should initialize with correct default values", () => {
    const { result } = renderHook(() => useTaskModal(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.editingTask).toBe(null);
  });

  it("should open create modal correctly", () => {
    const { result } = renderHook(() => useTaskModal(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openCreateModal();
    });

    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.editingTask).toBe(null);
  });

  it("should open edit modal correctly", () => {
    const { result } = renderHook(() => useTaskModal(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openEditModal(mockTask);
    });

    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.editingTask).toBe(mockTask);
  });

  it("should close modal correctly", () => {
    const { result } = renderHook(() => useTaskModal(), {
      wrapper: createWrapper(),
    });

    // First open the modal
    act(() => {
      result.current.openEditModal(mockTask);
    });

    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.editingTask).toBe(mockTask);

    // Then close it
    act(() => {
      result.current.closeModal();
    });

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.editingTask).toBe(null);
  });

  it("should handle submit success correctly", () => {
    const { result } = renderHook(() => useTaskModal(), {
      wrapper: createWrapper(),
    });

    // First open the modal
    act(() => {
      result.current.openEditModal(mockTask);
    });

    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.editingTask).toBe(mockTask);

    // Then handle submit success
    act(() => {
      result.current.handleSubmitSuccess();
    });

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.editingTask).toBe(null);
  });

  it("should work with additional query keys", () => {
    const { result } = renderHook(
      () => useTaskModal({ additionalQueryKeys: [["daily-plan"]] }),
      {
        wrapper: createWrapper(),
      }
    );

    // The hook should work the same way regardless of additional query keys
    act(() => {
      result.current.openCreateModal();
    });

    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.editingTask).toBe(null);

    act(() => {
      result.current.handleSubmitSuccess();
    });

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.editingTask).toBe(null);
  });
});
