import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ConflictResolutionPanel from "./ConflictResolutionPanel";
import type { TimeWindowAllocation } from "../types/dailyPlan";

const mockTimeWindows: TimeWindowAllocation[] = [
  {
    time_window: {
      id: "tw1",
      description: "Morning Work",
      start_time: 540, // 9:00 AM
      end_time: 600, // 10:00 AM
      category: {
        id: "cat1",
        name: "Work",
        color: "#3B82F6",
        user_id: "user1",
        is_deleted: false,
      },
      day_template_id: "dt1",
      user_id: "user1",
      is_deleted: false,
    },
    tasks: [
      {
        id: "task1",
        title: "Review code",
        description: "Review pull requests",
        status: "pending",
        priority: "medium",
        category_id: "cat1",
        user_id: "user1",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        is_deleted: false,
      },
    ],
  },
  {
    time_window: {
      id: "tw2",
      description: "Team Meeting",
      start_time: 570, // 9:30 AM
      end_time: 630, // 10:30 AM
      category: {
        id: "cat2",
        name: "Meetings",
        color: "#EF4444",
        user_id: "user1",
        is_deleted: false,
      },
      day_template_id: "dt1",
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
];

const mockProps = {
  conflicts: mockConflicts,
  timeWindows: mockTimeWindows,
  onEdit: jest.fn(),
  onDelete: jest.fn(),
};

describe("ConflictResolutionPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when no conflicts", () => {
    const { container } = render(
      <ConflictResolutionPanel {...mockProps} conflicts={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("displays conflict information correctly", () => {
    render(<ConflictResolutionPanel {...mockProps} />);

    expect(screen.getByText("Scheduling Conflicts (1)")).toBeInTheDocument();
    expect(screen.getByText("Time Window Overlap")).toBeInTheDocument();
    expect(
      screen.getByText("Time windows overlap from 9:30 AM to 10:00 AM")
    ).toBeInTheDocument();
  });

  it("shows conflicting time windows with details", () => {
    render(<ConflictResolutionPanel {...mockProps} />);

    expect(screen.getByText("Morning Work")).toBeInTheDocument();
    expect(screen.getByText("Team Meeting")).toBeInTheDocument();
    expect(screen.getByText("09:00 - 10:00")).toBeInTheDocument();
    expect(screen.getByText("09:30 - 10:30")).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getByText("Meetings")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", () => {
    render(<ConflictResolutionPanel {...mockProps} />);

    const editButtons = screen.getAllByTitle("Edit time window");
    fireEvent.click(editButtons[0]);

    expect(mockProps.onEdit).toHaveBeenCalledWith(mockTimeWindows[0]);
  });

  it("calls onDelete when delete button is clicked", () => {
    render(<ConflictResolutionPanel {...mockProps} />);

    const deleteButtons = screen.getAllByTitle("Delete time window");
    fireEvent.click(deleteButtons[0]);

    expect(mockProps.onDelete).toHaveBeenCalledWith("tw1");
  });

  it("displays resolution suggestions for overlap conflicts", () => {
    render(<ConflictResolutionPanel {...mockProps} />);

    expect(screen.getByText("Resolution Suggestions:")).toBeInTheDocument();
    expect(
      screen.getByText(/Adjust the start or end times to eliminate overlap/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Delete one of the overlapping time windows/)
    ).toBeInTheDocument();
  });

  it("displays resolution suggestions for category conflicts", () => {
    const categoryConflicts = [
      {
        timeWindowIds: ["tw1", "tw2"],
        message: "Different categories scheduled at the same time",
        type: "category_conflict" as const,
      },
    ];

    render(
      <ConflictResolutionPanel {...mockProps} conflicts={categoryConflicts} />
    );

    expect(
      screen.getByText(/Change one time window to use the same category/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Adjust timing to separate different category activities/
      )
    ).toBeInTheDocument();
  });

  it("shows task count when time window has tasks", () => {
    render(<ConflictResolutionPanel {...mockProps} />);

    expect(screen.getByText("1 task")).toBeInTheDocument();
  });

  it("applies correct styling for different conflict types", () => {
    const categoryConflicts = [
      {
        timeWindowIds: ["tw1", "tw2"],
        message: "Category conflict",
        type: "category_conflict" as const,
      },
    ];

    const { rerender } = render(<ConflictResolutionPanel {...mockProps} />);

    // Check overlap conflict styling (amber)
    expect(screen.getByText("Time Window Overlap")).toBeInTheDocument();

    rerender(
      <ConflictResolutionPanel {...mockProps} conflicts={categoryConflicts} />
    );

    // Check category conflict styling (red)
    expect(screen.getByText("Category Conflict")).toBeInTheDocument();
  });
  it("handles multiple conflicts with different types", () => {
    const multipleConflicts = [
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

    render(
      <ConflictResolutionPanel {...mockProps} conflicts={multipleConflicts} />
    );

    expect(screen.getByText("Scheduling Conflicts (2)")).toBeInTheDocument();
    expect(screen.getByText("Time Window Overlap")).toBeInTheDocument();
    expect(screen.getByText("Category Conflict")).toBeInTheDocument();
  });

  it("displays correct task count for multiple tasks", () => {
    const timeWindowsWithMultipleTasks = [
      ...mockTimeWindows,
      {
        ...mockTimeWindows[0],
        time_window: {
          ...mockTimeWindows[0].time_window,
          id: "tw3",
        },
        tasks: [
          {
            id: "task2",
            title: "Another task",
            description: "Another task description",
            status: "pending" as const,
            priority: "high" as const,
            category_id: "cat1",
            user_id: "user1",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            is_deleted: false,
          },
          {
            id: "task3",
            title: "Third task",
            description: "Third task description",
            status: "in_progress" as const,
            priority: "medium" as const,
            category_id: "cat1",
            user_id: "user1",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            is_deleted: false,
          },
        ],
      },
    ];

    const conflictsWithThirdWindow = [
      {
        timeWindowIds: ["tw1", "tw2", "tw3"],
        message: "Time windows overlap from 9:30 AM to 10:00 AM",
        type: "overlap" as const,
      },
    ];

    render(
      <ConflictResolutionPanel
        {...mockProps}
        timeWindows={timeWindowsWithMultipleTasks}
        conflicts={conflictsWithThirdWindow}
      />
    );

    // Check that the first time window shows "1 task"
    expect(screen.getByText("1 task")).toBeInTheDocument();
    // Check that the third time window shows "2 tasks"
    expect(screen.getByText("2 tasks")).toBeInTheDocument();
  });

  it("shows resolution guidance text", () => {
    render(<ConflictResolutionPanel {...mockProps} />);

    expect(screen.getByText("How to resolve conflicts:")).toBeInTheDocument();
    expect(
      screen.getByText(/Use the edit \(✏️\) or delete \(🗑️\) buttons/)
    ).toBeInTheDocument();
  });

  it("handles conflicts with non-existent time window IDs gracefully", () => {
    const conflictsWithInvalidIds = [
      {
        timeWindowIds: ["tw1", "invalid_id"],
        message: "Time windows overlap",
        type: "overlap" as const,
      },
    ];

    render(
      <ConflictResolutionPanel
        {...mockProps}
        conflicts={conflictsWithInvalidIds}
      />
    );

    // Should still render the conflict but only show valid time windows
    expect(screen.getByText("Scheduling Conflicts (1)")).toBeInTheDocument();
    expect(screen.getByText("Morning Work")).toBeInTheDocument();
    // Should not crash or show undefined elements
  });

  it("displays category colors correctly", () => {
    render(<ConflictResolutionPanel {...mockProps} />);

    // Check that category color indicators are present
    const colorIndicators = document.querySelectorAll('[style*="background-color"]');
    expect(colorIndicators.length).toBeGreaterThan(0);
  });

  it("shows merge suggestion for overlap conflicts", () => {
    render(<ConflictResolutionPanel {...mockProps} />);

    expect(
      screen.getByText(/Merge the time windows if they serve the same purpose/)
    ).toBeInTheDocument();
  });

  it("shows delete suggestion for category conflicts", () => {
    const categoryConflicts = [
      {
        timeWindowIds: ["tw1", "tw2"],
        message: "Different categories scheduled at the same time",
        type: "category_conflict" as const,
      },
    ];

    render(
      <ConflictResolutionPanel {...mockProps} conflicts={categoryConflicts} />
    );

    expect(
      screen.getByText(/Delete one of the conflicting time windows/)
    ).toBeInTheDocument();
  });

  it("applies custom className when provided", () => {
    const customClass = "custom-test-class";
    const { container } = render(
      <ConflictResolutionPanel {...mockProps} className={customClass} />
    );

    expect(container.firstChild).toHaveClass(customClass);
  });
});
