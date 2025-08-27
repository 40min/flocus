import React from "react";
import { render, screen } from "@testing-library/react";
import { LoadingSpinner, LoadingOverlay } from "./loading-spinner";

describe("LoadingSpinner", () => {
  it("renders with default props", () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByRole("status");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute("aria-label", "Loading");
  });

  it("renders with custom aria-label", () => {
    render(<LoadingSpinner aria-label="Saving task" />);

    const spinner = screen.getByRole("status");
    expect(spinner).toHaveAttribute("aria-label", "Saving task");
  });

  it("applies size classes correctly", () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    expect(screen.getByRole("status")).toHaveClass("w-4", "h-4");

    rerender(<LoadingSpinner size="md" />);
    expect(screen.getByRole("status")).toHaveClass("w-6", "h-6");

    rerender(<LoadingSpinner size="lg" />);
    expect(screen.getByRole("status")).toHaveClass("w-8", "h-8");
  });

  it("applies custom className", () => {
    render(<LoadingSpinner className="text-red-500" />);

    const spinner = screen.getByRole("status");
    expect(spinner).toHaveClass("text-red-500");
  });

  it("has proper accessibility attributes", () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByRole("status");
    expect(spinner).toHaveAttribute("role", "status");
    expect(spinner).toHaveAttribute("aria-label");
  });
});

describe("LoadingOverlay", () => {
  it("renders children when not loading", () => {
    render(
      <LoadingOverlay isLoading={false}>
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders children and overlay when loading", () => {
    render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has proper accessibility attributes when loading", () => {
    render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    );

    const overlay = screen.getByRole("status").closest("[aria-live]");
    expect(overlay).toHaveAttribute("aria-live", "polite");
    expect(overlay).toHaveAttribute("aria-busy", "true");
  });

  it("uses custom aria-label for spinner", () => {
    render(
      <LoadingOverlay isLoading={true} aria-label="Updating task">
        <div>Content</div>
      </LoadingOverlay>
    );

    const spinner = screen.getByRole("status");
    expect(spinner).toHaveAttribute("aria-label", "Updating task");
  });

  it("applies custom spinner size", () => {
    render(
      <LoadingOverlay isLoading={true} spinnerSize="lg">
        <div>Content</div>
      </LoadingOverlay>
    );

    const spinner = screen.getByRole("status");
    expect(spinner).toHaveClass("w-8", "h-8");
  });
});
