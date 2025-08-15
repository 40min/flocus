import React from "react";
import { render, screen } from "@testing-library/react";
import CircularProgress from "./circular-progress";

describe("CircularProgress", () => {
  it("renders with default props", () => {
    const { container } = render(<CircularProgress progress={0.5} />);

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "120");
    expect(svg).toHaveAttribute("height", "120");
  });

  it("renders with custom size", () => {
    const { container } = render(
      <CircularProgress progress={0.5} size={200} />
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "200");
    expect(svg).toHaveAttribute("height", "200");
  });

  it("renders children content", () => {
    render(
      <CircularProgress progress={0.5}>
        <div>Test Content</div>
      </CircularProgress>
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("calculates stroke-dashoffset correctly for different progress values", () => {
    const { container, rerender } = render(<CircularProgress progress={0} />);

    // For 0% progress, stroke-dashoffset should equal circumference
    let circles = container.querySelectorAll("circle");
    let progressCircle = circles[1]; // Second circle is the progress circle
    let circumference = 2 * Math.PI * 58; // radius = (120 - 4) / 2 = 58
    expect(progressCircle).toHaveAttribute(
      "stroke-dashoffset",
      circumference.toString()
    );

    // For 50% progress
    rerender(<CircularProgress progress={0.5} />);
    circles = container.querySelectorAll("circle");
    progressCircle = circles[1];
    const expectedOffset = circumference - 0.5 * circumference;
    expect(progressCircle).toHaveAttribute(
      "stroke-dashoffset",
      expectedOffset.toString()
    );

    // For 100% progress
    rerender(<CircularProgress progress={1} />);
    circles = container.querySelectorAll("circle");
    progressCircle = circles[1];
    expect(progressCircle).toHaveAttribute("stroke-dashoffset", "0");
  });

  it("applies custom className", () => {
    const { container } = render(
      <CircularProgress progress={0.5} className="custom-class" />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("renders background and progress circles with correct styling", () => {
    const { container } = render(<CircularProgress progress={0.5} />);

    const circles = container.querySelectorAll("circle");

    expect(circles).toHaveLength(2);

    // Background circle
    const backgroundCircle = circles[0];
    expect(backgroundCircle).toHaveClass("text-border-DEFAULT", "opacity-20");

    // Progress circle
    const progressCircle = circles[1];
    expect(progressCircle).toHaveClass(
      "text-primary-DEFAULT",
      "transition-all",
      "duration-300",
      "ease-in-out"
    );
    expect(progressCircle).toHaveAttribute("stroke-linecap", "round");
  });
});
