import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import TimeWindowModal from "./TimeWindowModal";
import { MessageProvider } from "context/MessageContext";
import { Category } from "types/category";
import { TimeWindowAllocation } from "types/dailyPlan";
import { formatMinutesToHHMM, hhMMToMinutes } from "lib/utils";

// Mock the useMessage hook
jest.mock("context/MessageContext", () => ({
  ...jest.requireActual("context/MessageContext"),
  useMessage: () => ({
    showMessage: jest.fn(),
  }),
}));

const mockCategories: Category[] = [
  { id: "cat1", name: "Work", user_id: "user1", is_deleted: false },
  { id: "cat2", name: "Personal", user_id: "user1", is_deleted: false },
];

const mockExistingTimeWindows: TimeWindowAllocation[] = [
  {
    time_window: {
      id: "tw1",
      description: "Morning Work",
      start_time: 540, // 09:00
      end_time: 600, // 10:00
      category: mockCategories[0],
      day_template_id: "template1",
      user_id: "user1",
      is_deleted: false,
    },
    tasks: [],
  },
  {
    time_window: {
      id: "tw2",
      description: "Lunch break",
      start_time: 660, // 11:00
      end_time: 720, // 12:00
      category: mockCategories[1],
      day_template_id: "template1",
      user_id: "user1",
      is_deleted: false,
    },
    tasks: [],
  },
];

const renderComponent = (
  props: Partial<React.ComponentProps<typeof TimeWindowModal>> = {}
) => {
  const defaultProps: React.ComponentProps<typeof TimeWindowModal> = {
    isOpen: true,
    onClose: jest.fn(),
    categories: mockCategories,
    existingTimeWindows: [],
    ...props,
  };

  return render(
    <MessageProvider>
      <TimeWindowModal {...defaultProps} />
    </MessageProvider>
  );
};

describe("TimeWindowModal", () => {
  describe("Create Mode", () => {
    it("does not render when isOpen is false", () => {
      renderComponent({ isOpen: false });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders the modal with default values when open", () => {
      renderComponent({ onCreateSuccess: jest.fn() });
      expect(screen.getByText("Add New Time Window")).toBeInTheDocument();
      expect(screen.getByLabelText("Category")).toHaveValue("");
      expect(screen.getByLabelText("Description (Optional)")).toHaveValue("");
      expect(screen.getByLabelText("Start Time")).toHaveValue("09:00");
      expect(screen.getByLabelText("End Time")).toHaveValue("10:00");
      expect(
        screen.getByRole("button", { name: /Add Time Window/i })
      ).toBeInTheDocument();
    });

    it("renders with default start and end times based on latest existing time window", () => {
      const latestEndTime = 720; // 12:00
      const existingWindowsWithLatest = [
        ...mockExistingTimeWindows,
        {
          time_window: {
            id: "tw3",
            description: "Afternoon Work",
            start_time: 660, // 11:00
            end_time: latestEndTime, // 12:00
            category: mockCategories[0],
            day_template_id: "template1",
            user_id: "user1",
            is_deleted: false,
          },
          tasks: [],
        },
      ];
      renderComponent({
        onCreateSuccess: jest.fn(),
        existingTimeWindows: existingWindowsWithLatest,
      });

      expect(screen.getByLabelText("Start Time")).toHaveValue("12:00");
      expect(screen.getByLabelText("End Time")).toHaveValue("13:00"); // 12:00 + 1 hour
    });

    it("caps the end time at 23:59 (1439 minutes)", () => {
      const latestEndTime = 1400; // 23:20
      const existingWindowsWithLateEnd = [
        {
          time_window: {
            id: "tw3",
            description: "Late Night",
            start_time: 1340, // 22:20
            end_time: latestEndTime, // 23:20
            category: mockCategories[0],
            day_template_id: "template1",
            user_id: "user1",
            is_deleted: false,
          },
          tasks: [],
        },
      ];
      renderComponent({
        onCreateSuccess: jest.fn(),
        existingTimeWindows: existingWindowsWithLateEnd,
      });

      expect(screen.getByLabelText("Start Time")).toHaveValue("23:20");
      expect(screen.getByLabelText("End Time")).toHaveValue("23:59"); // Capped at 23:59
    });

    it("handles form submission with valid data", async () => {
      const onCreateSuccessMock = jest.fn();
      const onCloseMock = jest.fn();
      renderComponent({
        onCreateSuccess: onCreateSuccessMock,
        onClose: onCloseMock,
      });

      fireEvent.change(screen.getByLabelText("Category"), {
        target: { value: "cat2" },
      });
      fireEvent.change(screen.getByLabelText("Description (Optional)"), {
        target: { value: "Lunch Break" },
      });
      fireEvent.change(screen.getByLabelText("Start Time"), {
        target: { value: "12:00" },
      });
      fireEvent.change(screen.getByLabelText("End Time"), {
        target: { value: "13:00" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Add Time Window/i }));

      await waitFor(() => {
        expect(onCreateSuccessMock).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(onCreateSuccessMock).toHaveBeenCalledWith(
          expect.objectContaining({
            time_window: expect.objectContaining({
              description: "Lunch Break",
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

    it("shows validation error if end time is not after start time", async () => {
      const onCreateSuccessMock = jest.fn();
      renderComponent({ onCreateSuccess: onCreateSuccessMock });

      fireEvent.change(screen.getByLabelText("Start Time"), {
        target: { value: "14:00" },
      });
      fireEvent.change(screen.getByLabelText("End Time"), {
        target: { value: "13:00" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Add Time Window/i }));

      expect(
        await screen.findByText("End time must be after start time.")
      ).toBeInTheDocument();
      expect(onCreateSuccessMock).not.toHaveBeenCalled();
    });

    it("shows validation error for overlapping time windows", async () => {
      const onCreateSuccessMock = jest.fn();
      renderComponent({
        onCreateSuccess: onCreateSuccessMock,
        existingTimeWindows: mockExistingTimeWindows,
      });

      fireEvent.change(screen.getByLabelText("Start Time"), {
        target: { value: "09:30" },
      });
      fireEvent.change(screen.getByLabelText("End Time"), {
        target: { value: "10:30" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Add Time Window/i }));

      expect(
        await screen.findByText(
          "New time window overlaps with an existing one."
        )
      ).toBeInTheDocument();
      expect(onCreateSuccessMock).not.toHaveBeenCalled();
    });

    it("shows validation error when category is missing", async () => {
      const onCreateSuccessMock = jest.fn();
      renderComponent({ onCreateSuccess: onCreateSuccessMock, categories: [] });

      fireEvent.click(screen.getByRole("button", { name: /Add Time Window/i }));

      expect(
        await screen.findByText("Category is required")
      ).toBeInTheDocument();
      expect(onCreateSuccessMock).not.toHaveBeenCalled();
    });
  });

  describe("Edit Mode", () => {
    const mockEditingTimeWindow: TimeWindowAllocation = {
      time_window: {
        id: "tw1",
        description: "Morning session",
        start_time: 540, // 09:00
        end_time: 600, // 10:00
        category: mockCategories[0],
        day_template_id: "template1",
        user_id: "user1",
        is_deleted: false,
      },
      tasks: [],
    };

    it("renders the modal in edit mode with correct title", () => {
      renderComponent({
        onEditSubmit: jest.fn(),
        editingTimeWindow: mockEditingTimeWindow,
        existingTimeWindows: mockExistingTimeWindows,
      });

      expect(
        screen.getByText(
          `Edit: ${mockEditingTimeWindow.time_window.category.name}`
        )
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Save Changes/i })
      ).toBeInTheDocument();
    });

    it("pre-fills form correctly with editingTimeWindow data", () => {
      renderComponent({
        onEditSubmit: jest.fn(),
        editingTimeWindow: mockEditingTimeWindow,
        existingTimeWindows: mockExistingTimeWindows,
      });

      expect(screen.getByLabelText(/description/i)).toHaveValue(
        mockEditingTimeWindow.time_window.description
      );
      expect(screen.getByLabelText(/start time/i)).toHaveValue(
        formatMinutesToHHMM(mockEditingTimeWindow.time_window.start_time)
      );
      expect(screen.getByLabelText(/end time/i)).toHaveValue(
        formatMinutesToHHMM(mockEditingTimeWindow.time_window.end_time)
      );

      const categoryInput = screen.getByLabelText(
        /category/i
      ) as HTMLInputElement;
      expect(categoryInput).toHaveValue(
        mockEditingTimeWindow.time_window.category.id
      );
      expect(categoryInput).toBeDisabled();
    });

    it("calls onEditSubmit with correct data for valid submission", async () => {
      const mockOnEditSubmit = jest.fn();
      const mockOnClose = jest.fn();

      renderComponent({
        onEditSubmit: mockOnEditSubmit,
        onClose: mockOnClose,
        editingTimeWindow: mockEditingTimeWindow,
        existingTimeWindows: mockExistingTimeWindows,
      });

      const newDescription = "Updated session";
      const newStartTime = "09:30"; // 570 minutes
      const newEndTime = "10:30"; // 630 minutes

      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: newDescription },
      });
      fireEvent.change(screen.getByLabelText(/start time/i), {
        target: { value: newStartTime },
      });
      fireEvent.change(screen.getByLabelText(/end time/i), {
        target: { value: newEndTime },
      });

      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockOnEditSubmit).toHaveBeenCalledWith({
          id: mockEditingTimeWindow.time_window.id,
          category_id: mockEditingTimeWindow.time_window.category.id,
          description: newDescription,
          start_time: hhMMToMinutes(newStartTime),
          end_time: hhMMToMinutes(newEndTime),
        });
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it("shows error if end time is not after start time in edit mode", async () => {
      const mockOnEditSubmit = jest.fn();

      renderComponent({
        onEditSubmit: mockOnEditSubmit,
        editingTimeWindow: mockEditingTimeWindow,
        existingTimeWindows: mockExistingTimeWindows,
      });

      fireEvent.change(screen.getByLabelText(/start time/i), {
        target: { value: "10:00" },
      });
      fireEvent.change(screen.getByLabelText(/end time/i), {
        target: { value: "09:00" },
      });

      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/end time must be after start time/i)
        ).toBeInTheDocument();
      });
      expect(mockOnEditSubmit).not.toHaveBeenCalled();
    });

    it("shows error if time window overlaps with an existing one in edit mode", async () => {
      const mockOnEditSubmit = jest.fn();

      renderComponent({
        onEditSubmit: mockOnEditSubmit,
        editingTimeWindow: mockEditingTimeWindow,
        existingTimeWindows: mockExistingTimeWindows,
      });

      // Try to move tw1 to 10:30-11:30, which overlaps with tw2 (11:00-12:00)
      fireEvent.change(screen.getByLabelText(/start time/i), {
        target: { value: "10:30" },
      });
      fireEvent.change(screen.getByLabelText(/end time/i), {
        target: { value: "11:30" },
      });

      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/New time window overlaps with an existing one./i)
        ).toBeInTheDocument();
      });
      expect(mockOnEditSubmit).not.toHaveBeenCalled();
    });

    it("does not show overlap error with itself when times are unchanged", async () => {
      const mockOnEditSubmit = jest.fn();
      const mockOnClose = jest.fn();

      renderComponent({
        onEditSubmit: mockOnEditSubmit,
        onClose: mockOnClose,
        editingTimeWindow: mockEditingTimeWindow,
        existingTimeWindows: mockExistingTimeWindows,
      });

      // Submit without changing times
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockOnEditSubmit).toHaveBeenCalledWith({
          id: mockEditingTimeWindow.time_window.id,
          category_id: mockEditingTimeWindow.time_window.category.id,
          description: mockEditingTimeWindow.time_window.description,
          start_time: mockEditingTimeWindow.time_window.start_time,
          end_time: mockEditingTimeWindow.time_window.end_time,
        });
      });
      expect(
        screen.queryByText(/New time window overlaps with an existing one./i)
      ).not.toBeInTheDocument();
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Common functionality", () => {
    it("calls onClose when Cancel button is clicked", () => {
      const onCloseMock = jest.fn();
      renderComponent({ onClose: onCloseMock, onCreateSuccess: jest.fn() });

      fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
});
