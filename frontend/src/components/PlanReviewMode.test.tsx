import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MessageProvider } from "../context/MessageContext";
import PlanReviewMode from "./PlanReviewMode";
import type { TimeWindowAllocation } from "../types/dailyPlan";
import type { Task } from "../types/task";

const mockTimeWindow: TimeWindowAllocation = {
  time_window: {
    id: "tw1",
    description: "Morning work",
    start_time: 540, // 9:00 AM
    end_time: 660, // 11:00 AM
    category: {
      id: "cat1",
      name: "Work",
      user_id: "user1",
      is_deleted: false,
      color: "#3b82f6",
    },
    day_template_id: "",
    user_id: "user1",
    is_deleted: false,
  },
  tasks: [],
};

const mockConflicts = [
  {
    timeWindowIds: ["tw1", "tw2"],
    message: "Time windows overlap",
    type: "overlap" as const,
  },
];

describe("PlanReviewMode", () => {
  const mockProps = {
    timeWindows: [mockTimeWindow],
    onApprove: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onAssignTask: jest.fn(),
    onUnassignTask: jest.fn(),
    onAddTimeWindow: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(<MessageProvider>{component}</MessageProvider>);
  };

  it("renders plan review header", () => {
    renderWithProviders(<PlanReviewMode {...mockProps} />);

    expect(screen.getByText("Plan Review Required")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Please review your daily plan and resolve any conflicts before approval."
      )
    ).toBeInTheDocument();
  });

  it("shows ready to approve when no conflicts", () => {
    renderWithProviders(<PlanReviewMode {...mockProps} />);

    expect(screen.getByText("Ready to approve")).toBeInTheDocument();
  });

  it("shows conflicts when present", () => {
    renderWithProviders(
      <PlanReviewMode {...mockProps} conflicts={mockConflicts} />
    );

    expect(screen.getByText("1 conflict")).toBeInTheDocument();
    expect(screen.getByText("Scheduling Conflicts")).toBeInTheDocument();
    expect(screen.getByText("Time windows overlap")).toBeInTheDocument();
  });

  it("disables approve button when conflicts exist", () => {
    renderWithProviders(
      <PlanReviewMode {...mockProps} conflicts={mockConflicts} />
    );

    const approveButton = screen.getByRole("button", { name: /approve plan/i });
    expect(approveButton).toBeDisabled();
  });

  it("enables approve button when no conflicts", () => {
    renderWithProviders(<PlanReviewMode {...mockProps} />);

    const approveButton = screen.getByRole("button", { name: /approve plan/i });
    expect(approveButton).not.toBeDisabled();
  });

  it("calls onApprove when approve button is clicked", () => {
    renderWithProviders(<PlanReviewMode {...mockProps} />);

    const approveButton = screen.getByRole("button", { name: /approve plan/i });
    fireEvent.click(approveButton);

    expect(mockProps.onApprove).toHaveBeenCalledTimes(1);
  });

  it("shows loading state when approving", () => {
    renderWithProviders(<PlanReviewMode {...mockProps} isApproving={true} />);

    expect(screen.getByText("Approving...")).toBeInTheDocument();
  });

  it("renders time windows", () => {
    renderWithProviders(<PlanReviewMode {...mockProps} />);

    expect(screen.getByText("Morning work")).toBeInTheDocument();
  });

  it("shows add time window button", () => {
    renderWithProviders(<PlanReviewMode {...mockProps} />);

    const addButton = screen.getByRole("button", { name: /add time window/i });
    expect(addButton).toBeInTheDocument();
  });

  it("calls onAddTimeWindow when add button is clicked", () => {
    renderWithProviders(<PlanReviewMode {...mockProps} />);

    const addButton = screen.getByRole("button", { name: /add time window/i });
    fireEvent.click(addButton);

    expect(mockProps.onAddTimeWindow).toHaveBeenCalledTimes(1);
  });
});
