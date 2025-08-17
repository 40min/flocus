import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import CreateTaskModal from "./CreateTaskModal";
import * as taskService from "services/taskService";
import {
  Task,
  LLMImprovementResponse,
  TaskStatus,
  TaskPriority,
} from "types/task";
import { Category } from "types/category";
import { TimerProvider } from "../TimerProvider";

// Mock the taskService
jest.mock("services/taskService");
const mockedTaskService = taskService as jest.Mocked<typeof taskService>;

// Mock the useTimer hook
jest.mock("../../hooks/useTimer", () => ({
  useTimer: jest.fn(),
}));

const mockedUseTimer = require("../../hooks/useTimer").useTimer as jest.Mock;

const mockCategories: Category[] = [
  {
    id: "cat1",
    name: "Work",
    description: "Work related tasks",
    user_id: "user1",
    is_deleted: false,
  },
  {
    id: "cat2",
    name: "Personal",
    description: "Personal tasks",
    user_id: "user1",
    is_deleted: false,
  },
];

const defaultInitialFormData = {
  title: "",
  description: "",
  status: "pending" as TaskStatus,
  priority: "medium" as TaskPriority,
  due_date: undefined,
  category_id: undefined,
};

describe("CreateTaskModal", () => {
  const onCloseMock = jest.fn();
  const onSubmitSuccessMock = jest.fn();

  beforeEach(() => {
    onCloseMock.mockClear();
    onSubmitSuccessMock.mockClear();
    jest.clearAllMocks();
    // Reset the mock for useTimer before each test
    mockedUseTimer.mockReturnValue({
      currentTaskId: null,
      stopCurrentTask: jest.fn(),
      resetForNewTask: jest.fn(),
    });
  });

  const renderModal = (
    props?: Partial<React.ComponentProps<typeof CreateTaskModal>>
  ) => {
    return render(
      <CreateTaskModal
        isOpen={true}
        onClose={onCloseMock}
        onSubmitSuccess={onSubmitSuccessMock}
        editingTask={null}
        categories={mockCategories}
        initialFormData={defaultInitialFormData}
        {...props}
      />
    );
  };

  it("does not render when isOpen is false", () => {
    render(
      <CreateTaskModal
        isOpen={false}
        onClose={onCloseMock}
        onSubmitSuccess={onSubmitSuccessMock}
        editingTask={null}
        categories={[]}
        initialFormData={defaultInitialFormData}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it('renders "Create New Task" title when not editing', () => {
    renderModal();
    expect(screen.getByText("Create New Task")).toBeInTheDocument();
  });

  it('renders "Edit Task" title when editing an existing task', () => {
    const editingTask: Task = {
      id: "1",
      title: "Existing Task",
      description: "Existing Description",
      status: "pending",
      priority: "medium",
      user_id: "user1",
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    };
    renderModal({ editingTask });
    expect(screen.getByText("Edit Task")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Existing Task")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Existing Description")
    ).toBeInTheDocument();
  });

  it("handles form submission for creating a new task", async () => {
    mockedTaskService.createTask.mockResolvedValueOnce({} as Task);

    renderModal();

    fireEvent.change(screen.getByLabelText(/Title/i), {
      target: { value: "New Task Title" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "New Task Description" },
    });
    fireEvent.change(screen.getByLabelText(/Status/i), {
      target: { value: "done" },
    });
    fireEvent.change(screen.getByLabelText(/Priority/i), {
      target: { value: "high" },
    });
    fireEvent.change(screen.getByLabelText(/Category/i), {
      target: { value: "cat1" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Task/i }));

    await waitFor(() =>
      expect(mockedTaskService.createTask).toHaveBeenCalledTimes(1)
    );
    expect(mockedTaskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Task Title",
        description: "New Task Description",
        status: "done",
        priority: "high",
        category_id: "cat1",
      })
    );
    await waitFor(() => expect(onSubmitSuccessMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onCloseMock).toHaveBeenCalledTimes(1));
  });

  it("handles form submission for updating an existing task", async () => {
    const editingTask: Task = {
      id: "1",
      title: "Existing Task",
      description: "Existing Description",
      status: "pending",
      priority: "medium",
      user_id: "user1",
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    };
    mockedTaskService.updateTask.mockResolvedValueOnce({} as Task);

    renderModal({ editingTask });

    fireEvent.change(screen.getByLabelText(/Title/i), {
      target: { value: "Updated Task Title" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Updated Task Description" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Update Task/i }));

    await waitFor(() =>
      expect(mockedTaskService.updateTask).toHaveBeenCalledTimes(1)
    );
    expect(mockedTaskService.updateTask).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({
        title: "Updated Task Title",
        description: "Updated Task Description",
      })
    );
    await waitFor(() => expect(onSubmitSuccessMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onCloseMock).toHaveBeenCalledTimes(1));
  });

  it("calls resetForNewTask when an in-progress task's status is changed to in_progress via modal", async () => {
    const editingTask: Task = {
      id: "1",
      title: "Existing Task",
      description: "Existing Description",
      status: "pending", // Initial status is pending
      priority: "medium",
      user_id: "user1",
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    };
    mockedTaskService.updateTask.mockResolvedValueOnce({} as Task);
    const mockResetForNewTask = jest.fn();
    const mockStopCurrentTask = jest.fn();

    mockedUseTimer.mockReturnValue({
      currentTaskId: "1",
      stopCurrentTask: mockStopCurrentTask,
      resetForNewTask: mockResetForNewTask,
    });

    renderModal({ editingTask });

    fireEvent.change(screen.getByLabelText(/Status/i), {
      target: { value: "in_progress" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Update Task/i }));

    await waitFor(() =>
      expect(mockedTaskService.updateTask).toHaveBeenCalledTimes(1)
    );
    expect(mockedTaskService.updateTask).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({
        status: "in_progress",
      })
    );
    await waitFor(() => expect(mockResetForNewTask).toHaveBeenCalledTimes(1));
    expect(mockStopCurrentTask).not.toHaveBeenCalled();
    await waitFor(() => expect(onSubmitSuccessMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onCloseMock).toHaveBeenCalledTimes(1));
  });

  it("calls stopCurrentTask when an in-progress task's status is changed from in_progress to another status via modal", async () => {
    const editingTask: Task = {
      id: "1",
      title: "Existing Task",
      description: "Existing Description",
      status: "in_progress", // Initial status is in_progress
      priority: "medium",
      user_id: "user1",
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    };
    mockedTaskService.updateTask.mockResolvedValueOnce({} as Task);
    const mockResetForNewTask = jest.fn();
    const mockStopCurrentTask = jest.fn();

    mockedUseTimer.mockReturnValue({
      currentTaskId: "1",
      stopCurrentTask: mockStopCurrentTask,
      resetForNewTask: mockResetForNewTask,
    });

    renderModal({ editingTask });

    fireEvent.change(screen.getByLabelText(/Status/i), {
      target: { value: "done" },
    }); // Change to 'done'
    fireEvent.click(screen.getByRole("button", { name: /Update Task/i }));

    await waitFor(() =>
      expect(mockedTaskService.updateTask).toHaveBeenCalledTimes(1)
    );
    expect(mockedTaskService.updateTask).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({
        status: "done",
      })
    );
    await waitFor(() => expect(mockStopCurrentTask).toHaveBeenCalledTimes(1));
    expect(mockResetForNewTask).not.toHaveBeenCalled();
    await waitFor(() => expect(onSubmitSuccessMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onCloseMock).toHaveBeenCalledTimes(1));
  });

  it("displays validation error for missing title", async () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /Create Task/i }));

    await screen.findByText("Title is required");
    expect(mockedTaskService.createTask).not.toHaveBeenCalled();
  });

  it("calls handleImproveTitle and displays suggestion", async () => {
    const mockResponse: LLMImprovementResponse = {
      improved_title: "Suggested Title",
    };
    mockedTaskService.getLlmImprovement.mockResolvedValueOnce(mockResponse);

    renderModal();

    fireEvent.change(screen.getByLabelText(/Title/i), {
      target: { value: "initial title" },
    });
    fireEvent.click(screen.getByTitle("Improve title"));

    expect(screen.getByText("Improving...")).toBeInTheDocument();

    await waitFor(() =>
      expect(mockedTaskService.getLlmImprovement).toHaveBeenCalledWith({
        action: "improve_title",
        title: "initial title",
      })
    );
    await screen.findByText("Suggested Title");
    expect(screen.queryByText("Improving...")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(screen.getByDisplayValue("Suggested Title")).toBeInTheDocument();
    expect(screen.queryByText("Suggested Title")).not.toBeInTheDocument();
  });

  it("calls handleImproveDescription and displays suggestion (improve existing)", async () => {
    const mockResponse: LLMImprovementResponse = {
      improved_description: "Suggested Description",
    };
    mockedTaskService.getLlmImprovement.mockResolvedValueOnce(mockResponse);

    renderModal();

    fireEvent.change(screen.getByLabelText(/Title/i), {
      target: { value: "Task Title" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "initial description" },
    });
    fireEvent.click(screen.getByTitle("Improve description"));

    expect(screen.getByText("Improving...")).toBeInTheDocument();

    await waitFor(() =>
      expect(mockedTaskService.getLlmImprovement).toHaveBeenCalledWith({
        action: "improve_description",
        title: "Task Title",
        description: "initial description",
      })
    );
    await screen.findByText("Suggested Description");
    expect(screen.queryByText("Improving...")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(
      screen.getByDisplayValue("Suggested Description")
    ).toBeInTheDocument();
    expect(screen.queryByText("Suggested Description")).not.toBeInTheDocument();
  });

  it("calls handleImproveDescription and displays suggestion (generate from title)", async () => {
    const mockResponse: LLMImprovementResponse = {
      improved_description: "Generated Description",
    };
    mockedTaskService.getLlmImprovement.mockResolvedValueOnce(mockResponse);

    renderModal();

    fireEvent.change(screen.getByLabelText(/Title/i), {
      target: { value: "Task Title for Generation" },
    });
    // Description is empty, so it should trigger generate_description_from_title
    fireEvent.click(screen.getByTitle("Generate description from title"));

    expect(screen.getByText("Generating...")).toBeInTheDocument();

    await waitFor(() =>
      expect(mockedTaskService.getLlmImprovement).toHaveBeenCalledWith({
        action: "generate_description_from_title",
        title: "Task Title for Generation",
        description: "",
      })
    );
    await screen.findByText("Generated Description");
    expect(screen.queryByText("Generating...")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(
      screen.getByDisplayValue("Generated Description")
    ).toBeInTheDocument();
    expect(screen.queryByText("Generated Description")).not.toBeInTheDocument();
  });

  it("rejects title suggestion", async () => {
    const mockResponse: LLMImprovementResponse = {
      improved_title: "Suggested Title",
    };
    mockedTaskService.getLlmImprovement.mockResolvedValueOnce(mockResponse);

    renderModal();

    fireEvent.change(screen.getByLabelText(/Title/i), {
      target: { value: "original title" },
    });
    fireEvent.click(screen.getByTitle("Improve title"));

    await screen.findByText("Suggested Title");

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByDisplayValue("original title")).toBeInTheDocument();
    expect(screen.queryByText("Suggested Title")).not.toBeInTheDocument();
  });

  it("rejects description suggestion", async () => {
    const mockResponse: LLMImprovementResponse = {
      improved_description: "Suggested Description",
    };
    mockedTaskService.getLlmImprovement.mockResolvedValueOnce(mockResponse);

    renderModal();

    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "original description" },
    });
    fireEvent.click(screen.getByTitle("Improve description"));

    await screen.findByText("Suggested Description");

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(
      screen.getByDisplayValue("original description")
    ).toBeInTheDocument();
    expect(screen.queryByText("Suggested Description")).not.toBeInTheDocument();
  });

  it("resets suggestions and loading states on modal open/task change", async () => {
    const mockResponse: LLMImprovementResponse = {
      improved_title: "Suggested Title",
    };
    mockedTaskService.getLlmImprovement.mockResolvedValueOnce(mockResponse);

    const { rerender } = renderModal();

    fireEvent.change(screen.getByLabelText(/Title/i), {
      target: { value: "initial title" },
    });
    fireEvent.click(screen.getByTitle("Improve title"));

    await screen.findByText("Suggested Title");

    // Simulate modal closing and reopening, or editingTask changing
    rerender(
      <CreateTaskModal
        isOpen={false} // Close the modal
        onClose={onCloseMock}
        onSubmitSuccess={onSubmitSuccessMock}
        editingTask={null}
        categories={mockCategories}
        initialFormData={defaultInitialFormData}
      />
    );

    rerender(
      <CreateTaskModal
        isOpen={true} // Reopen the modal
        onClose={onCloseMock}
        onSubmitSuccess={onSubmitSuccessMock}
        editingTask={null}
        categories={mockCategories}
        initialFormData={defaultInitialFormData}
      />
    );

    expect(screen.queryByText("Suggested Title")).not.toBeInTheDocument();
    expect(screen.queryByText("Improving...")).not.toBeInTheDocument();
  });
});
