import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
import { MessageProvider } from "../../context/MessageContext";

// Mock the taskService
jest.mock("services/taskService");
const mockedTaskService = taskService as jest.Mocked<typeof taskService>;

// Mock the useTimer hook
jest.mock("../../hooks/useTimer", () => ({
  useTimer: jest.fn(),
}));

// Mock the useMessage hook
jest.mock("../../context/MessageContext", () => ({
  ...jest.requireActual("../../context/MessageContext"),
  useMessage: jest.fn(),
}));

const mockedUseTimer = require("../../hooks/useTimer").useTimer as jest.Mock;
const mockedUseMessage = require("../../context/MessageContext")
  .useMessage as jest.Mock;

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
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
    onCloseMock.mockClear();
    onSubmitSuccessMock.mockClear();
    jest.clearAllMocks();
    // Reset the mock for useTimer before each test
    mockedUseTimer.mockReturnValue({
      currentTaskId: null,
      stopCurrentTask: jest.fn(),
      resetForNewTask: jest.fn(),
    });
    // Reset the mock for useMessage before each test
    mockedUseMessage.mockReturnValue({
      showMessage: jest.fn(),
      clearMessage: jest.fn(),
      message: null,
    });
  });

  const renderModal = (
    props?: Partial<React.ComponentProps<typeof CreateTaskModal>>
  ) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MessageProvider>
          <CreateTaskModal
            isOpen={true}
            onClose={onCloseMock}
            onSubmitSuccess={onSubmitSuccessMock}
            editingTask={null}
            categories={mockCategories}
            initialFormData={defaultInitialFormData}
            {...props}
          />
        </MessageProvider>
      </QueryClientProvider>
    );
  };

  it("does not render when isOpen is false", () => {
    renderModal({
      isOpen: false,
      categories: [],
    });
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

  it("populates form when editing an existing task", async () => {
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

    // Wait for the form to be initialized with the editing task values
    await waitFor(() => {
      expect(screen.getByDisplayValue("Existing Task")).toBeInTheDocument();
    });

    expect(
      screen.getByDisplayValue("Existing Description")
    ).toBeInTheDocument();
  });

  // Note: Timer integration tests are covered in the manual time adjustment section

  it("displays validation error for missing title", async () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /Create Task/i }));

    await screen.findByText("Title is required");
    expect(mockedTaskService.createTask).not.toHaveBeenCalled();
  });

  it("displays validation error for negative correction time", async () => {
    const editingTask: Task = {
      id: "1",
      title: "Existing Task",
      description: "Existing Description",
      status: "pending",
      priority: "medium",
      user_id: "user1",
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
      statistics: { lasts_minutes: 30 },
    };

    renderModal({ editingTask });

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Title/i), {
      target: { value: "Valid Title" },
    });

    // Enter negative correction time
    fireEvent.change(screen.getByLabelText(/Add Correction Time/i), {
      target: { value: "-5" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Update Task/i }));

    await screen.findByText("Correction time must be non-negative");
    expect(mockedTaskService.updateTask).not.toHaveBeenCalled();
  });

  it("displays validation error for correction time exceeding maximum", async () => {
    const editingTask: Task = {
      id: "1",
      title: "Existing Task",
      description: "Existing Description",
      status: "pending",
      priority: "medium",
      user_id: "user1",
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
      statistics: { lasts_minutes: 30 },
    };

    renderModal({ editingTask });

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Title/i), {
      target: { value: "Valid Title" },
    });

    // Enter correction time exceeding maximum (1440 minutes = 24 hours)
    fireEvent.change(screen.getByLabelText(/Add Correction Time/i), {
      target: { value: "1500" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Update Task/i }));

    await screen.findByText(
      "Cannot add more than 24 hours (1440 minutes) at once"
    );
    expect(mockedTaskService.updateTask).not.toHaveBeenCalled();
  });

  it("successfully submits with valid correction time", async () => {
    const editingTask: Task = {
      id: "1",
      title: "Existing Task",
      description: "Existing Description",
      status: "pending",
      priority: "medium",
      user_id: "user1",
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
      statistics: { lasts_minutes: 30 },
    };

    mockedTaskService.updateTask.mockResolvedValueOnce({} as Task);
    renderModal({ editingTask });

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Title/i), {
      target: { value: "Valid Title" },
    });

    // Set status and priority (required fields)
    fireEvent.change(screen.getByLabelText(/Status/i), {
      target: { value: "pending" },
    });
    fireEvent.change(screen.getByLabelText(/Priority/i), {
      target: { value: "medium" },
    });

    // Enter valid correction time
    fireEvent.change(screen.getByLabelText(/Add Correction Time/i), {
      target: { value: "15" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Update Task/i }));

    await waitFor(() =>
      expect(mockedTaskService.updateTask).toHaveBeenCalledTimes(1)
    );
    expect(mockedTaskService.updateTask).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({
        title: "Valid Title",
        status: "pending",
        priority: "medium",
        add_lasts_minutes: 15,
      })
    );
  });

  // Note: Form submission tests are covered in the manual time adjustment section

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
      <QueryClientProvider client={queryClient}>
        <MessageProvider>
          <CreateTaskModal
            isOpen={false} // Close the modal
            onClose={onCloseMock}
            onSubmitSuccess={onSubmitSuccessMock}
            editingTask={null}
            categories={mockCategories}
            initialFormData={defaultInitialFormData}
          />
        </MessageProvider>
      </QueryClientProvider>
    );

    rerender(
      <QueryClientProvider client={queryClient}>
        <MessageProvider>
          <CreateTaskModal
            isOpen={true} // Reopen the modal
            onClose={onCloseMock}
            onSubmitSuccess={onSubmitSuccessMock}
            editingTask={null}
            categories={mockCategories}
            initialFormData={defaultInitialFormData}
          />
        </MessageProvider>
      </QueryClientProvider>
    );

    expect(screen.queryByText("Suggested Title")).not.toBeInTheDocument();
    expect(screen.queryByText("Improving...")).not.toBeInTheDocument();
  });

  // Manual Time Adjustment Tests
  describe("Manual Time Adjustment", () => {
    const createTaskWithWorkingTime = (minutes: number): Task => ({
      id: "1",
      title: "Task with Working Time",
      description: "Task Description",
      status: "pending",
      priority: "medium",
      user_id: "user1",
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
      statistics: { lasts_minutes: minutes },
    });

    describe("Current Time Display", () => {
      it("displays current working time for editing tasks with zero minutes", () => {
        const editingTask = createTaskWithWorkingTime(0);
        renderModal({ editingTask });

        expect(screen.getByText("Current Working Time")).toBeInTheDocument();
        expect(screen.getByText("0 minutes")).toBeInTheDocument();
      });

      it("displays current working time for editing tasks with minutes only", () => {
        const editingTask = createTaskWithWorkingTime(45);
        renderModal({ editingTask });

        expect(screen.getByText("Current Working Time")).toBeInTheDocument();
        expect(screen.getByText("45m")).toBeInTheDocument();
      });

      it("displays current working time for editing tasks with hours only", () => {
        const editingTask = createTaskWithWorkingTime(120);
        renderModal({ editingTask });

        expect(screen.getByText("Current Working Time")).toBeInTheDocument();
        expect(screen.getByText("2h")).toBeInTheDocument();
      });

      it("displays current working time for editing tasks with hours and minutes", () => {
        const editingTask = createTaskWithWorkingTime(150);
        renderModal({ editingTask });

        expect(screen.getByText("Current Working Time")).toBeInTheDocument();
        expect(screen.getByText("2h 30m")).toBeInTheDocument();
      });

      it("displays current working time for editing tasks without statistics", () => {
        const editingTask: Task = {
          id: "1",
          title: "Task without Statistics",
          description: "Task Description",
          status: "pending",
          priority: "medium",
          user_id: "user1",
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          // No statistics field
        };
        renderModal({ editingTask });

        expect(screen.getByText("Current Working Time")).toBeInTheDocument();
        expect(screen.getByText("0 minutes")).toBeInTheDocument();
      });

      it("does not display current working time section when creating new tasks", () => {
        renderModal({ editingTask: null });

        expect(
          screen.queryByText("Current Working Time")
        ).not.toBeInTheDocument();
        expect(
          screen.queryByLabelText(/Add Correction Time/i)
        ).not.toBeInTheDocument();
      });
    });

    describe("Correction Time Input Field", () => {
      it("displays correction time input field when editing tasks", () => {
        const editingTask = createTaskWithWorkingTime(30);
        renderModal({ editingTask });

        const correctionInput = screen.getByLabelText(/Add Correction Time/i);
        expect(correctionInput).toBeInTheDocument();
        expect(correctionInput).toHaveAttribute("type", "number");
        expect(correctionInput).toHaveAttribute("min", "0");
        expect(correctionInput).toHaveAttribute("max", "1440");
        expect(correctionInput).toHaveAttribute("step", "1");
        expect(correctionInput).toHaveAttribute("placeholder", "0");
      });

      it("displays tooltip for correction time input field", () => {
        const editingTask = createTaskWithWorkingTime(30);
        renderModal({ editingTask });

        const tooltipIcon = screen.getByTitle(
          "Add additional working time to this task in minutes"
        );
        expect(tooltipIcon).toBeInTheDocument();
      });

      it("displays help text for correction time input field", () => {
        const editingTask = createTaskWithWorkingTime(30);
        renderModal({ editingTask });

        expect(
          screen.getByText(
            "Enter the number of minutes to add to the current working time (0-1440)"
          )
        ).toBeInTheDocument();
      });

      it("accepts valid numeric input in correction time field", () => {
        const editingTask = createTaskWithWorkingTime(30);
        renderModal({ editingTask });

        const correctionInput = screen.getByLabelText(/Add Correction Time/i);
        fireEvent.change(correctionInput, { target: { value: "15" } });

        expect(correctionInput).toHaveValue(15);
      });

      it("accepts zero as valid input in correction time field", () => {
        const editingTask = createTaskWithWorkingTime(30);
        renderModal({ editingTask });

        const correctionInput = screen.getByLabelText(/Add Correction Time/i);
        fireEvent.change(correctionInput, { target: { value: "0" } });

        expect(correctionInput).toHaveValue(0);
      });

      it("accepts maximum value (1440) in correction time field", () => {
        const editingTask = createTaskWithWorkingTime(30);
        renderModal({ editingTask });

        const correctionInput = screen.getByLabelText(/Add Correction Time/i);
        fireEvent.change(correctionInput, { target: { value: "1440" } });

        expect(correctionInput).toHaveValue(1440);
      });
    });

    describe("Form Validation", () => {
      it("allows form submission with valid correction time", async () => {
        const editingTask = createTaskWithWorkingTime(30);
        mockedTaskService.updateTask.mockResolvedValueOnce({} as Task);
        renderModal({ editingTask });

        fireEvent.change(screen.getByLabelText(/Title/i), {
          target: { value: "Valid Title" },
        });
        fireEvent.change(screen.getByLabelText(/Add Correction Time/i), {
          target: { value: "15" },
        });

        fireEvent.click(screen.getByRole("button", { name: /Update Task/i }));

        await waitFor(() =>
          expect(mockedTaskService.updateTask).toHaveBeenCalledTimes(1)
        );
        expect(mockedTaskService.updateTask).toHaveBeenCalledWith(
          "1",
          expect.objectContaining({
            add_lasts_minutes: 15,
          })
        );
      });

      it("shows empty correction time field by default", () => {
        const editingTask = createTaskWithWorkingTime(30);
        renderModal({ editingTask });

        const correctionInput = screen.getByLabelText(/Add Correction Time/i);
        expect(correctionInput).toHaveValue(0);
      });

      it("treats zero correction time as undefined in API call", async () => {
        const editingTask = createTaskWithWorkingTime(30);
        mockedTaskService.updateTask.mockResolvedValueOnce({} as Task);
        renderModal({ editingTask });

        fireEvent.change(screen.getByLabelText(/Title/i), {
          target: { value: "Valid Title" },
        });
        fireEvent.change(screen.getByLabelText(/Add Correction Time/i), {
          target: { value: "0" },
        });

        fireEvent.click(screen.getByRole("button", { name: /Update Task/i }));

        await waitFor(() =>
          expect(mockedTaskService.updateTask).toHaveBeenCalledTimes(1)
        );
        expect(mockedTaskService.updateTask).toHaveBeenCalledWith(
          "1",
          expect.objectContaining({
            add_lasts_minutes: undefined,
          })
        );
      });
    });

    describe("Error Handling", () => {
      it("displays error notification when API call fails without closing modal", async () => {
        const editingTask = createTaskWithWorkingTime(30);
        const mockShowMessage = jest.fn();
        mockedUseMessage.mockReturnValue({
          showMessage: mockShowMessage,
          clearMessage: jest.fn(),
          message: null,
        });
        mockedTaskService.updateTask.mockRejectedValueOnce(
          new Error("API Error")
        );
        renderModal({ editingTask });

        fireEvent.change(screen.getByLabelText(/Title/i), {
          target: { value: "Valid Title" },
        });
        fireEvent.change(screen.getByLabelText(/Add Correction Time/i), {
          target: { value: "15" },
        });

        fireEvent.click(screen.getByRole("button", { name: /Update Task/i }));

        await waitFor(() =>
          expect(mockedTaskService.updateTask).toHaveBeenCalledTimes(1)
        );
        await waitFor(() =>
          expect(mockShowMessage).toHaveBeenCalledWith(
            "Failed to update task: API Error",
            "error"
          )
        );

        // Modal should still be open (onClose should not have been called)
        expect(onCloseMock).not.toHaveBeenCalled();
        expect(screen.getByText("Edit Task")).toBeInTheDocument();
      });

      it("displays success notification when update succeeds", async () => {
        const editingTask = createTaskWithWorkingTime(30);
        const mockShowMessage = jest.fn();
        mockedUseMessage.mockReturnValue({
          showMessage: mockShowMessage,
          clearMessage: jest.fn(),
          message: null,
        });
        mockedTaskService.updateTask.mockResolvedValueOnce({} as Task);
        renderModal({ editingTask });

        fireEvent.change(screen.getByLabelText(/Title/i), {
          target: { value: "Updated Title" },
        });
        fireEvent.change(screen.getByLabelText(/Add Correction Time/i), {
          target: { value: "15" },
        });

        fireEvent.click(screen.getByRole("button", { name: /Update Task/i }));

        await waitFor(() =>
          expect(mockedTaskService.updateTask).toHaveBeenCalledTimes(1)
        );
        await waitFor(() =>
          expect(mockShowMessage).toHaveBeenCalledWith(
            'Task "Updated Title" updated successfully!',
            "success"
          )
        );
        await waitFor(() => expect(onCloseMock).toHaveBeenCalledTimes(1));
      });
    });

    describe("Integration with Timer", () => {
      it("renders timer integration elements correctly", () => {
        const editingTask = createTaskWithWorkingTime(30);
        editingTask.status = "pending";
        renderModal({ editingTask });

        // Verify the status field exists for timer integration
        expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
        expect(
          screen.getByLabelText(/Add Correction Time/i)
        ).toBeInTheDocument();
      });
    });

    describe("Field Reset Behavior", () => {
      it("resets correction time field when modal reopens", () => {
        const editingTask = createTaskWithWorkingTime(30);
        const { rerender } = renderModal({ editingTask });

        // Enter some correction time
        fireEvent.change(screen.getByLabelText(/Add Correction Time/i), {
          target: { value: "15" },
        });
        expect(screen.getByLabelText(/Add Correction Time/i)).toHaveValue(15);

        // Close and reopen modal
        rerender(
          <QueryClientProvider client={queryClient}>
            <MessageProvider>
              <CreateTaskModal
                isOpen={false}
                onClose={onCloseMock}
                onSubmitSuccess={onSubmitSuccessMock}
                editingTask={editingTask}
                categories={mockCategories}
                initialFormData={defaultInitialFormData}
              />
            </MessageProvider>
          </QueryClientProvider>
        );

        rerender(
          <QueryClientProvider client={queryClient}>
            <MessageProvider>
              <CreateTaskModal
                isOpen={true}
                onClose={onCloseMock}
                onSubmitSuccess={onSubmitSuccessMock}
                editingTask={editingTask}
                categories={mockCategories}
                initialFormData={defaultInitialFormData}
              />
            </MessageProvider>
          </QueryClientProvider>
        );

        // Correction time field should be reset
        expect(screen.getByLabelText(/Add Correction Time/i)).toHaveValue(0);
      });

      it("shows different working times for different tasks", async () => {
        const editingTask1 = createTaskWithWorkingTime(30);
        const editingTask2 = createTaskWithWorkingTime(60);
        const { rerender } = renderModal({ editingTask: editingTask1 });

        // Wait for first task to load
        await waitFor(() => {
          expect(screen.getByText("30m")).toBeInTheDocument();
        });

        // Switch to second task
        rerender(
          <QueryClientProvider client={queryClient}>
            <MessageProvider>
              <CreateTaskModal
                isOpen={true}
                onClose={onCloseMock}
                onSubmitSuccess={onSubmitSuccessMock}
                editingTask={editingTask2}
                categories={mockCategories}
                initialFormData={defaultInitialFormData}
              />
            </MessageProvider>
          </QueryClientProvider>
        );

        // Wait for second task to load
        await waitFor(() => {
          expect(screen.getByText("1h")).toBeInTheDocument(); // 60 minutes = 1h
        });
      });
    });
  });
});
