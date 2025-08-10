import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Timeline from "./Timeline";

// Mock the utils function
jest.mock("../lib/utils", () => ({
  formatDurationFromMinutes: jest.fn((minutes) => {
    if (minutes === 0) return "0min";
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}min`;
  }),
}));

describe("Timeline", () => {
  const mockTimeWindows = [
    {
      id: "tw1",
      start_time: "2024-01-01T09:00:00.000Z",
      end_time: "2024-01-01T10:30:00.000Z",
      category: {
        id: "cat1",
        name: "Work",
        color: "#3B82F6",
      },
    },
    {
      id: "tw2",
      start_time: "2024-01-01T11:00:00.000Z",
      end_time: "2024-01-01T11:20:00.000Z",
      category: {
        id: "cat2",
        name: "Break",
        color: "#10B981",
      },
    },
    {
      id: "tw3",
      start_time: "2024-01-01T12:00:00.000Z",
      end_time: "2024-01-01T14:00:00.000Z",
      category: {
        id: "cat3",
        name: "Meeting",
        color: "#F59E0B",
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders timeline container with correct classes", () => {
      render(<Timeline timeWindows={mockTimeWindows} />);

      const timeline = screen.getByRole("complementary");
      expect(timeline).toHaveClass("relative", "w-28", "flex-shrink-0", "p-4");
    });

    it("renders central vertical line", () => {
      const { container } = render(<Timeline timeWindows={mockTimeWindows} />);

      const centralLine = container.querySelector(".absolute.top-0.left-1\\/2");
      expect(centralLine).toBeInTheDocument();
      expect(centralLine).toHaveClass("w-px", "h-full", "bg-gray-200");
    });

    it("renders with custom className", () => {
      render(
        <Timeline timeWindows={mockTimeWindows} className="custom-class" />
      );

      const timeline = screen.getByRole("complementary");
      expect(timeline).toHaveClass("custom-class");
    });
  });

  describe("Empty State", () => {
    it("renders nothing when no time windows provided", () => {
      const { container } = render(<Timeline timeWindows={[]} />);

      const timelineContent = container.querySelector(".relative.pt-8");
      expect(timelineContent).toBeInTheDocument();
      expect(timelineContent?.children).toHaveLength(0);
    });

    it("handles undefined timeWindows", () => {
      const { container } = render(<Timeline timeWindows={undefined as any} />);

      const timelineContent = container.querySelector(".relative.pt-8");
      expect(timelineContent).toBeInTheDocument();
      expect(timelineContent?.children).toHaveLength(0);
    });
  });

  describe("Time Window Rendering", () => {
    it("renders time windows as colored bars", () => {
      const { container } = render(<Timeline timeWindows={mockTimeWindows} />);

      const coloredBars = container.querySelectorAll(
        "[style*='backgroundColor']"
      );
      expect(coloredBars).toHaveLength(3);

      // Check first time window color
      expect(coloredBars[0]).toHaveStyle({ backgroundColor: "#3B82F6" });
      expect(coloredBars[1]).toHaveStyle({ backgroundColor: "#10B981" });
      expect(coloredBars[2]).toHaveStyle({ backgroundColor: "#F59E0B" });
    });

    it("renders bars with correct width", () => {
      const { container } = render(<Timeline timeWindows={mockTimeWindows} />);

      const coloredBars = container.querySelectorAll(
        "[style*='backgroundColor']"
      );
      coloredBars.forEach((bar) => {
        expect(bar).toHaveStyle({ width: "8px" });
      });
    });

    it("calculates bar heights based on duration", () => {
      const { container } = render(<Timeline timeWindows={mockTimeWindows} />);

      const coloredBars = container.querySelectorAll(
        "[style*='backgroundColor']"
      );

      // First time window: 90 minutes -> 180px height
      expect(coloredBars[0]).toHaveStyle({ height: "180px" });

      // Second time window: 20 minutes -> 40px height
      expect(coloredBars[1]).toHaveStyle({ height: "40px" });

      // Third time window: 120 minutes -> 240px height
      expect(coloredBars[2]).toHaveStyle({ height: "240px" });
    });

    it("applies minimum height of 20px for very short durations", () => {
      const shortTimeWindow = [
        {
          id: "short",
          start_time: "2024-01-01T09:00:00.000Z",
          end_time: "2024-01-01T09:05:00.000Z", // 5 minutes
          category: {
            id: "cat1",
            name: "Short",
            color: "#3B82F6",
          },
        },
      ];

      const { container } = render(<Timeline timeWindows={shortTimeWindow} />);

      const coloredBar = container.querySelector("[style*='backgroundColor']");
      expect(coloredBar).toHaveStyle({ height: "20px" }); // Minimum height
    });
  });

  describe("Time Display Logic", () => {
    it("displays short intervals (< 30 minutes) in one line format", () => {
      const shortTimeWindow = [
        {
          id: "short",
          start_time: "2024-01-01T10:15:00.000Z",
          end_time: "2024-01-01T10:30:00.000Z", // 15 minutes
          category: {
            id: "cat1",
            name: "Short",
            color: "#3B82F6",
          },
        },
      ];

      const { container } = render(<Timeline timeWindows={shortTimeWindow} />);

      // Should contain the compact format
      const timeLabel = container.querySelector(".absolute.right-full.pr-1");
      expect(timeLabel).toBeInTheDocument();
      expect(timeLabel?.textContent).toMatch(/10:15.*10:30.*AM/);
    });

    it("displays long intervals (>= 30 minutes) in two-line format", () => {
      const longTimeWindow = [
        {
          id: "long",
          start_time: "2024-01-01T09:00:00.000Z",
          end_time: "2024-01-01T10:00:00.000Z", // 60 minutes
          category: {
            id: "cat1",
            name: "Long",
            color: "#3B82F6",
          },
        },
      ];

      const { container } = render(<Timeline timeWindows={longTimeWindow} />);

      const timeLabels = container.querySelectorAll(
        ".absolute.right-full.pr-1 div"
      );
      expect(timeLabels).toHaveLength(2); // Start and end time separately
    });

    it("formats time correctly without AM/PM for start time in compact format", () => {
      const shortTimeWindow = [
        {
          id: "short",
          start_time: "2024-01-01T14:15:00.000Z", // 2:15 PM
          end_time: "2024-01-01T14:30:00.000Z", // 2:30 PM
          category: {
            id: "cat1",
            name: "Short",
            color: "#3B82F6",
          },
        },
      ];

      const { container } = render(<Timeline timeWindows={shortTimeWindow} />);

      const timeLabel = container.querySelector(".absolute.right-full.pr-1");
      // Should show "2:15 - 2:30 PM" format (start time without AM/PM)
      expect(timeLabel?.textContent).toMatch(/2:15.*2:30.*PM/);
      expect(timeLabel?.textContent).not.toMatch(/2:15.*PM.*2:30.*PM/);
    });
  });

  describe("Gap Rendering", () => {
    it("renders gaps between time windows", () => {
      const { container } = render(<Timeline timeWindows={mockTimeWindows} />);

      // Should have 2 gaps between 3 time windows
      const gapBars = container.querySelectorAll(
        ".bg-gray-200.border.border-gray-300"
      );
      expect(gapBars).toHaveLength(2);
    });

    it("positions gap labels on the right side", () => {
      const { container } = render(<Timeline timeWindows={mockTimeWindows} />);

      const gapLabels = container.querySelectorAll(".absolute.left-full.pl-1");
      expect(gapLabels.length).toBeGreaterThan(0);

      gapLabels.forEach((label) => {
        expect(label).toHaveClass("text-xs", "text-gray-400", "font-medium");
      });
    });

    it("calculates gap durations correctly", () => {
      // Gap 1: 10:30 AM to 11:00 AM = 30 minutes
      // Gap 2: 11:20 AM to 12:00 PM = 40 minutes
      const { container } = render(<Timeline timeWindows={mockTimeWindows} />);

      const gapLabels = container.querySelectorAll(".absolute.left-full.pl-1");
      expect(gapLabels[0]).toHaveTextContent("30min");
      expect(gapLabels[1]).toHaveTextContent("40min");
    });

    it("renders gap bars with correct dimensions", () => {
      const { container } = render(<Timeline timeWindows={mockTimeWindows} />);

      const gapBars = container.querySelectorAll(
        ".bg-gray-200.border.border-gray-300"
      );
      gapBars.forEach((bar) => {
        expect(bar).toHaveStyle({ width: "6px" });
      });
    });

    it("does not render gap for first time window", () => {
      const singleTimeWindow = [mockTimeWindows[0]];
      const { container } = render(<Timeline timeWindows={singleTimeWindow} />);

      const gapBars = container.querySelectorAll(
        ".bg-gray-200.border.border-gray-300"
      );
      expect(gapBars).toHaveLength(0);
    });
  });

  describe("Spacing and Layout", () => {
    it("uses reduced padding for time labels (pr-1)", () => {
      const { container } = render(<Timeline timeWindows={mockTimeWindows} />);

      const timeLabels = container.querySelectorAll(
        ".absolute.right-full.pr-1"
      );
      expect(timeLabels.length).toBeGreaterThan(0);

      timeLabels.forEach((label) => {
        expect(label).toHaveClass("pr-1");
      });
    });

    it("uses reduced padding for gap labels (pl-1)", () => {
      const { container } = render(<Timeline timeWindows={mockTimeWindows} />);

      const gapLabels = container.querySelectorAll(".absolute.left-full.pl-1");
      expect(gapLabels.length).toBeGreaterThan(0);

      gapLabels.forEach((label) => {
        expect(label).toHaveClass("pl-1");
      });
    });

    it("uses compact timeline width (w-28)", () => {
      render(<Timeline timeWindows={mockTimeWindows} />);

      const timeline = screen.getByRole("complementary");
      expect(timeline).toHaveClass("w-28");
    });
  });

  describe("Accessibility", () => {
    it("provides tooltips for time window bars", () => {
      const { container } = render(<Timeline timeWindows={mockTimeWindows} />);

      const coloredBars = container.querySelectorAll(
        "[style*='backgroundColor']"
      );
      expect(coloredBars[0]).toHaveAttribute("title", "Work: 1h 30min");
      expect(coloredBars[1]).toHaveAttribute("title", "Break: 20min");
      expect(coloredBars[2]).toHaveAttribute("title", "Meeting: 2h");
    });

    it("provides tooltips for gap bars", () => {
      const { container } = render(<Timeline timeWindows={mockTimeWindows} />);

      const gapBars = container.querySelectorAll(
        ".bg-gray-200.border.border-gray-300"
      );
      expect(gapBars[0]).toHaveAttribute("title", "Gap: 30min");
      expect(gapBars[1]).toHaveAttribute("title", "Gap: 40min");
    });

    it("uses semantic aside element", () => {
      render(<Timeline timeWindows={mockTimeWindows} />);

      const timeline = screen.getByRole("complementary");
      expect(timeline.tagName).toBe("ASIDE");
    });
  });

  describe("Sorting", () => {
    it("sorts time windows by start time", () => {
      const unsortedTimeWindows = [
        mockTimeWindows[2], // 12:00 PM
        mockTimeWindows[0], // 9:00 AM
        mockTimeWindows[1], // 11:00 AM
      ];

      const { container } = render(
        <Timeline timeWindows={unsortedTimeWindows} />
      );

      const coloredBars = container.querySelectorAll(
        "[style*='backgroundColor']"
      );
      // Should be sorted: Work (blue), Break (green), Meeting (yellow)
      expect(coloredBars[0]).toHaveStyle({ backgroundColor: "#3B82F6" });
      expect(coloredBars[1]).toHaveStyle({ backgroundColor: "#10B981" });
      expect(coloredBars[2]).toHaveStyle({ backgroundColor: "#F59E0B" });
    });
  });

  describe("Visual Styling", () => {
    it("applies correct text styling to time labels", () => {
      const { container } = render(<Timeline timeWindows={mockTimeWindows} />);

      const timeLabels = container.querySelectorAll(
        ".absolute.right-full.pr-1"
      );
      timeLabels.forEach((label) => {
        expect(label).toHaveClass(
          "text-xs",
          "text-gray-400",
          "font-medium",
          "whitespace-nowrap"
        );
      });
    });

    it("applies gradient overlay to time window bars", () => {
      const { container } = render(<Timeline timeWindows={mockTimeWindows} />);

      const gradientOverlays = container.querySelectorAll(".opacity-20");
      expect(gradientOverlays).toHaveLength(3);

      gradientOverlays.forEach((overlay) => {
        expect(overlay).toHaveClass("w-full", "h-full", "rounded-sm");
      });
    });

    it("applies pattern overlay to gap bars", () => {
      const { container } = render(<Timeline timeWindows={mockTimeWindows} />);

      const gapOverlays = container.querySelectorAll(
        ".bg-gradient-to-b.from-gray-300.to-gray-200"
      );
      expect(gapOverlays).toHaveLength(2);

      gapOverlays.forEach((overlay) => {
        expect(overlay).toHaveClass("opacity-50");
      });
    });
  });
});
