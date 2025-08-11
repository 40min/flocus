import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./button";

test("renders button with correct text", () => {
  render(<Button>Click me</Button>);
  const buttonElement = screen.getByText(/Click me/i);
  expect(buttonElement).toBeInTheDocument();
});

test("calls onClick handler when clicked", () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  const buttonElement = screen.getByText(/Click me/i);
  fireEvent.click(buttonElement);
  expect(handleClick).toHaveBeenCalledTimes(1);
});

test("does not call onClick handler when disabled and clicked", () => {
  const handleClick = jest.fn();
  render(
    <Button onClick={handleClick} disabled>
      Click me
    </Button>
  );
  const buttonElement = screen.getByText(/Click me/i);
  fireEvent.click(buttonElement);
  expect(handleClick).not.toHaveBeenCalled();
  expect(buttonElement).toBeDisabled();
});

test("applies custom className", () => {
  render(<Button className="custom-class">Click me</Button>);
  const buttonElement = screen.getByText(/Click me/i);
  expect(buttonElement).toHaveClass("custom-class");
});

test("passes through standard HTML button attributes", () => {
  render(<Button type="submit">Submit</Button>);
  const buttonElement = screen.getByText(/Submit/i);
  expect(buttonElement).toHaveAttribute("type", "submit");
});

test("shows loading state when isLoading is true", () => {
  render(<Button isLoading>Click me</Button>);
  expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  expect(screen.queryByText(/Click me/i)).not.toBeInTheDocument();
});

test("disables button when isLoading is true", () => {
  const handleClick = jest.fn();
  render(
    <Button onClick={handleClick} isLoading>
      Click me
    </Button>
  );
  const buttonElement = screen.getByRole("button");
  fireEvent.click(buttonElement);
  expect(handleClick).not.toHaveBeenCalled();
  expect(buttonElement).toBeDisabled();
});

test("renders with custom variants", () => {
  render(<Button variant="primary">Primary</Button>);
  const buttonElement = screen.getByText(/Primary/i);
  expect(buttonElement).toBeInTheDocument();
});

test("renders with custom sizes", () => {
  render(<Button size="small">Small</Button>);
  const buttonElement = screen.getByText(/Small/i);
  expect(buttonElement).toBeInTheDocument();
});
