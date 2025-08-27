import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import TaskItem from "./TaskItem";
import { Task } from "../types/task";

// Mock the utils function
jest.mock("../utils/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).flat().join(" "),
  formatWorkingTime: (minutes?: number) => `${minutes || 0}m`,
}));

// Mock the hooks
jest.mock("../hooks/useSuccessHighlight", () => ({
  useSuccessHighlight: () => ({
    isHighlighted: false,
    triggerHighlight: jest.fn(),
  }),
}));

jest.mock("../hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

describe("TaskItem", () => {
  const mockTask: Task = {
    id: "task1",
    title: "Test Task",
    status: "pending",
    priority: "medium",
    user_id: "user1",
    statistics: {
      lasts_minutes: 30,
    },
  };

  const mockProps = {
    task: mockTask,
    baseBgColor: "bg-blue-100",
    baseBorderColor: "border-blue-200",
    baseTextColor: "text-blue-800",
    hoverBgColor: "hover:bg-blue-200",
    hoverBorderColor: "hover:border-blue-300",
    hoverShadowColor: "hover:shadow-blue-500/20",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders task title", () => {
    render(<TaskItem {...mockProps} />);
    expect(screen.getByText("Test Task")).toBeInTheDocument();
  });

  it("shows working time when showWorkingTime is true", () => {
    render(<TaskItem {...mockProps} showWorkingTime={true} />);
    expect(screen.getByText("30m")).toBeInTheDocument();
  });

  it("shows action buttons when showActions is true", () => {
    render(<TaskItem {...mockProps} showActions={true} />);
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("+15m")).toBeInTheDocument();
  });

  it("calls onStatusChange when status button is clicked", () => {
    const mockOnStatusChange = jest.fn();
    render(
      <TaskItem
        {...mockProps}
        showActions={true}
        onStatusChange={mockOnStatusChange}
      />
    );

    fireEvent.click(screen.getByText("Start"));
    expect(mockOnStatusChange).toHaveBeenCalledWith("task1", "in_progress");
  });

  it("calls onWorkingTimeChange when +15m button is clicked", () => {
    const mockOnWorkingTimeChange = jest.fn();
    render(
      <TaskItem
        {...mockProps}
        showActions={true}
        onWorkingTimeChange={mockOnWorkingTimeChange}
      />
    );

    fireEvent.click(screen.getByText("+15m"));
    expect(mockOnWorkingTimeChange).toHaveBeenCalledWith("task1", 15);
  });
});
