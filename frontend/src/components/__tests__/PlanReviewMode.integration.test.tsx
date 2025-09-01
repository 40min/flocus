import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import PlanReviewMode from "../PlanReviewMode";
import { DailyPlanResponse, TimeWindowAllocation } from "../../types/dailyPlan";
import { Category } from "../../types/category";
import { Task } from "../../types/task";
import { MessageProvider } from "../../context/MessageContext";

const mockCategories: Category[] = [
  { id: "cat1", name: "Work", user_id: "user1", is_deleted: false },
  { id: "cat2", name: "Meetings", user_id: "user1", is_deleted: false },
];

const mockTimeWindows: TimeWindowAllocation[] = [
  {
    time_window: {
      id: "tw1",
      description: "Morning Work",
      start_time: 540, // 9:00 AM
      end_time: 600, // 10:00 AM
      category: mockCategories[0],
      day_template_id: "",
      user_id: "user1",
      is_deleted: false,
    },
    tasks: [
      {
        id: "task1",
        title: "Review code",
        status: "pending",
        priority: "medium",
        description: "",
        user_id: "user1",
        category_id: "cat1",
      } as Task,
    ],
  },
  {
    time_window: {
      id: "tw2",
      description: "Team Meeting",
      start_time: 570, // 9:30 AM - overlaps with tw1
      end_time: 630, // 10:30 AM
      category: mockCategories[1], // Different category
      day_template_id: "",
      user_id: "user1",
      is_deleted: false,
    },
    tasks: [],
  },
];

const mockConflicts = [
  {
    timeWindowIds: ["tw1", "tw2"],
    message: "Time windows overlap from 9:30 AM to 10:00 AM",
    type: "overlap" as const,
  },
  {
    timeWindowIds: ["tw1", "tw2"],
    message: "Different categories scheduled at the same time",
    type: "category_conflict" as const,
  },
];

const renderWithProvider = (component: React.ReactElement) => {
  return render(<MessageProvider>{component}</MessageProvider>);
};

describe("PlanReviewMode Integration Tests", () => {
  const mockProps = {
    timeWindows: mockTimeWindows,
    conflicts: [] as any[],
    onApprove: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onAssignTask: jest.fn(),
    onUnassignTask: jest.fn(),
    onCarryOver: jest.fn(),
    onAddTimeWindow: jest.fn(),
    dailyPlanId: "plan1",
    isApproving: false,
    getTimeWindowCarryOverStatus: jest.fn(),
    isCarryingOver: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("displays conflicts when provided", () => {
    renderWithProvider(<PlanReviewMode {...mockProps} conflicts={mockConflicts} />);

    expect(screen.getByText("Scheduling Conflicts (2)")).toBeInTheDocument();
    expect(screen.getByText("Time Window Overlap")).toBeInTheDocument();
    expect(screen.getByText("Category Conflict")).toBeInTheDocument();
    // Check that Morning Work appears (it will appear multiple times - in conflict panel and time window)
    const morningWorkElements = screen.getAllByText("Morning Work");
    expect(morningWorkElements.length).toBeGreaterThan(0);
    // Check that Team Meeting appears (it will appear multiple times - in conflict panel and time window)
    const teamMeetingElements = screen.getAllByText("Team Meeting");
    expect(teamMeetingElements.length).toBeGreaterThan(0);
  });

  it("shows no conflicts message when conflicts array is empty", () => {
    renderWithProvider(<PlanReviewMode {...mockProps} conflicts={[]} />);

    expect(screen.getByText("No conflicts detected")).toBeInTheDocument();
  });

  it("allows expanding and collapsing conflict resolution panel", () => {
    renderWithProvider(<PlanReviewMode {...mockProps} conflicts={mockConflicts} />);

    // Initially expanded
    expect(screen.getByText("Conflict Resolution")).toBeInTheDocument();

    // Click collapse button
    const collapseButton = screen.getByRole("button", { name: /collapse/i });
    fireEvent.click(collapseButton);

    // Should show expand button now
    expect(screen.getByRole("button", { name: /expand/i })).toBeInTheDocument();

    // Click expand button
    const expandButton = screen.getByRole("button", { name: /expand/i });
    fireEvent.click(expandButton);

    // Should show conflict resolution panel again
    expect(screen.getByText("Conflict Resolution")).toBeInTheDocument();
  });

  it("disables approve button when conflicts exist", () => {
    renderWithProvider(<PlanReviewMode {...mockProps} conflicts={mockConflicts} />);

    const approveButton = screen.getByRole("button", { name: "Approve Plan" });
    expect(approveButton).toBeDisabled();
  });

  it("enables approve button when no conflicts exist", () => {
    renderWithProvider(<PlanReviewMode {...mockProps} conflicts={[]} />);

    const approveButton = screen.getByRole("button", { name: "Approve Plan" });
    expect(approveButton).not.toBeDisabled();
  });

  it("calls onApprove when approve button is clicked", () => {
    renderWithProvider(<PlanReviewMode {...mockProps} conflicts={[]} />);

    const approveButton = screen.getByRole("button", { name: "Approve Plan" });
    fireEvent.click(approveButton);

    expect(mockProps.onApprove).toHaveBeenCalled();
  });

  it("calls onAddTimeWindow when add time window button is clicked", () => {
    renderWithProvider(<PlanReviewMode {...mockProps} conflicts={[]} />);

    const addButton = screen.getByRole("button", { name: "Add Time Window" });
    fireEvent.click(addButton);

    expect(mockProps.onAddTimeWindow).toHaveBeenCalled();
  });

  it("shows approval loading state", () => {
    renderWithProvider(<PlanReviewMode {...mockProps} conflicts={[]} isApproving={true} />);

    expect(screen.getByText("Approving...")).toBeInTheDocument();
  });

  it("displays time windows with conflict indicators", () => {
    renderWithProvider(<PlanReviewMode {...mockProps} conflicts={mockConflicts} />);

    // Check that time windows are displayed - use getAllByText since there may be duplicates
    const morningWorkElements = screen.getAllByText("Morning Work");
    expect(morningWorkElements.length).toBeGreaterThan(0);
    // Check that Team Meeting appears (it will appear multiple times - in conflict panel and time window)
    const teamMeetingElements = screen.getAllByText("Team Meeting");
    expect(teamMeetingElements.length).toBeGreaterThan(0);

    // Check for conflict indicators (these would be present if ConflictIndicator component renders)
    // The ConflictIndicator component uses specific title texts based on conflict type
    const conflictIndicators = screen.getAllByTitle(/overlap|conflict/i);
    expect(conflictIndicators.length).toBeGreaterThan(0);
  });
});
