import React from "react";
import { render, screen } from "@testing-library/react";
import ConflictIndicator from "./ConflictIndicator";

describe("ConflictIndicator", () => {
  it("renders overlap conflict indicator", () => {
    render(<ConflictIndicator type="overlap" />);

    const indicator = screen.getByTitle("Time window overlap detected");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass("animate-pulse");
  });

  it("renders category conflict indicator", () => {
    render(<ConflictIndicator type="category_conflict" />);

    const indicator = screen.getByTitle("Category conflict detected");
    expect(indicator).toBeInTheDocument();
  });

  it("applies correct severity styling", () => {
    const { rerender } = render(
      <ConflictIndicator type="overlap" severity="high" />
    );

    let indicator = screen.getByTitle("Time window overlap detected");
    expect(indicator).toHaveClass("bg-red-500", "text-white", "border-red-600");

    rerender(<ConflictIndicator type="overlap" severity="medium" />);
    indicator = screen.getByTitle("Time window overlap detected");
    expect(indicator).toHaveClass(
      "bg-amber-500",
      "text-white",
      "border-amber-600"
    );

    rerender(<ConflictIndicator type="overlap" severity="low" />);
    indicator = screen.getByTitle("Time window overlap detected");
    expect(indicator).toHaveClass(
      "bg-yellow-400",
      "text-slate-900",
      "border-yellow-500"
    );
  });

  it("applies correct size styling", () => {
    const { rerender } = render(<ConflictIndicator type="overlap" size="sm" />);

    let indicator = screen.getByTitle("Time window overlap detected");
    expect(indicator).toHaveClass("w-5", "h-5", "p-1");

    rerender(<ConflictIndicator type="overlap" size="md" />);
    indicator = screen.getByTitle("Time window overlap detected");
    expect(indicator).toHaveClass("w-6", "h-6", "p-1");

    rerender(<ConflictIndicator type="overlap" size="lg" />);
    indicator = screen.getByTitle("Time window overlap detected");
    expect(indicator).toHaveClass("w-8", "h-8", "p-1.5");
  });

  it("can hide tooltip", () => {
    const { container } = render(
      <ConflictIndicator type="overlap" showTooltip={false} />
    );

    const indicator = container.querySelector(".rounded-full");
    expect(indicator).not.toHaveAttribute("title");
  });

  it("applies custom className", () => {
    render(<ConflictIndicator type="overlap" className="custom-class" />);

    const indicator = screen.getByTitle("Time window overlap detected");
    expect(indicator).toHaveClass("custom-class");
  });
});
