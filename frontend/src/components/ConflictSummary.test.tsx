import React from "react";
import { render, screen } from "@testing-library/react";
import ConflictSummary from "./ConflictSummary";

const mockConflicts = [
  {
    timeWindowIds: ["tw1", "tw2"],
    message: "Time windows overlap",
    type: "overlap" as const,
  },
  {
    timeWindowIds: ["tw3", "tw4"],
    message: "Category conflict detected",
    type: "category_conflict" as const,
  },
];

describe("ConflictSummary", () => {
  it("shows no conflicts message when no conflicts exist", () => {
    render(<ConflictSummary conflicts={[]} />);

    expect(screen.getByText("No conflicts detected")).toBeInTheDocument();
    const summaryDiv = screen.getByText("No conflicts detected").parentElement;
    expect(summaryDiv).toHaveClass("text-green-800");
  });

  it("shows conflict count in compact mode", () => {
    render(<ConflictSummary conflicts={mockConflicts} variant="compact" />);

    expect(screen.getByText("2 conflicts detected")).toBeInTheDocument();
    const summaryDiv = screen.getByText("2 conflicts detected").parentElement;
    expect(summaryDiv).toHaveClass("text-red-800");
  });

  it("shows single conflict in compact mode", () => {
    render(
      <ConflictSummary conflicts={[mockConflicts[0]]} variant="compact" />
    );

    expect(screen.getByText("1 conflict detected")).toBeInTheDocument();
  });

  it("shows detailed conflict breakdown in detailed mode", () => {
    render(<ConflictSummary conflicts={mockConflicts} variant="detailed" />);

    expect(screen.getByText("Conflicts Detected")).toBeInTheDocument();
    expect(screen.getByText("Time Overlaps (1)")).toBeInTheDocument();
    expect(screen.getByText("Category Conflicts (1)")).toBeInTheDocument();
  });

  it("shows only overlap conflicts when no category conflicts", () => {
    const overlapOnly = [mockConflicts[0]];
    render(<ConflictSummary conflicts={overlapOnly} variant="detailed" />);

    expect(screen.getByText("Time Overlaps (1)")).toBeInTheDocument();
    expect(screen.queryByText("Category Conflicts")).not.toBeInTheDocument();
  });

  it("shows only category conflicts when no overlap conflicts", () => {
    const categoryOnly = [mockConflicts[1]];
    render(<ConflictSummary conflicts={categoryOnly} variant="detailed" />);

    expect(screen.getByText("Category Conflicts (1)")).toBeInTheDocument();
    expect(screen.queryByText("Time Overlaps")).not.toBeInTheDocument();
  });

  it("shows next steps when conflicts exist in detailed mode", () => {
    render(<ConflictSummary conflicts={mockConflicts} variant="detailed" />);

    expect(screen.getByText("Next Steps:")).toBeInTheDocument();
    expect(
      screen.getByText(/Review the highlighted time windows below/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Use edit or delete actions to resolve conflicts/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Approve your plan once all conflicts are resolved/)
    ).toBeInTheDocument();
  });

  it("shows success message when no conflicts in detailed mode", () => {
    render(<ConflictSummary conflicts={[]} variant="detailed" />);

    expect(screen.getByText("No Conflicts")).toBeInTheDocument();
    expect(
      screen.getByText(
        /All time windows are properly scheduled without conflicts/
      )
    ).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <ConflictSummary conflicts={[]} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("defaults to compact variant", () => {
    render(<ConflictSummary conflicts={mockConflicts} />);

    // Should show compact format
    expect(screen.getByText("2 conflicts detected")).toBeInTheDocument();
    // Should not show detailed breakdown
    expect(screen.queryByText("Time Overlaps")).not.toBeInTheDocument();
  });
});
