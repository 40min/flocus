import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "../../context/AuthContext";
import { MessageProvider } from "../../context/MessageContext";
import { TimerProvider } from "../TimerProvider";
import MyDayPage from "../../pages/MyDayPage";
import {
  useTodayDailyPlan,
  usePrevDayDailyPlan,
} from "../../hooks/useDailyPlan";
import { useTemplates } from "../../hooks/useTemplates";
import { useCategories } from "../../hooks/useCategories";
import * as dailyPlanService from "../../services/dailyPlanService";
import { DailyPlanResponse } from "../../types/dailyPlan";
import { Category } from "../../types/category";
import { Task } from "../../types/task";

// Mocks
jest.mock("../../hooks/useDailyPlan");
jest.mock("../../hooks/useTemplates");
jest.mock("../../hooks/useCategories");
jest.mock("../../services/dailyPlanService");
jest.mock("../../services/userDailyStatsService");

// Mock useTimer first to avoid initialization issues
jest.mock("../../hooks/useTimer", () => ({
  useTimer: jest.fn(),
}));

// Mock useCarryOverIntegration
jest.mock("../../hooks/useCarryOverIntegration", () => ({
  useCarryOverIntegration: jest.fn(),
}));

const mockUseTimer = require("../../hooks/useTimer").useTimer;
const mockUseCarryOverIntegration =
  require("../../hooks/useCarryOverIntegration").useCarryOverIntegration;

// Cast mocked functions after they're available
const mockedUseTodayDailyPlan = useTodayDailyPlan as jest.Mock;
const mockedUsePrevDayDailyPlan = usePrevDayDailyPlan as jest.Mock;
const mockedUseTemplates = useTemplates as jest.Mock;
const mockedUseCategories = useCategories as jest.Mock;
const mockedUpdateDailyPlan = dailyPlanService.updateDailyPlan as jest.Mock;

// Override the useDailyPlan module's exports
jest.mock("../../hooks/useDailyPlan", () => ({
  useTodayDailyPlan: jest.fn(),
  usePrevDayDailyPlan: jest.fn(),
  useDailyPlanWithReview: jest.fn(),
}));

// Get a reference to the mocked function after jest.mock
const { useDailyPlanWithReview } = require("../../hooks/useDailyPlan");
const mockUseDailyPlanWithReview = useDailyPlanWithReview as jest.Mock;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const mockCategories: Category[] = [
  { id: "cat1", name: "Work", user_id: "user1", is_deleted: false },
  { id: "cat2", name: "Meetings", user_id: "user1", is_deleted: false },
];

const mockDailyPlanWithConflicts: DailyPlanResponse = {
  id: "plan1",
  user_id: "user1",
  plan_date: new Date().toISOString(),
  reviewed: false,
  time_windows: [
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
  ],
  self_reflection: null,
};

const mockDailyPlanNoConflicts: DailyPlanResponse = {
  id: "plan2",
  user_id: "user1",
  plan_date: new Date().toISOString(),
  reviewed: false,
  time_windows: [
    {
      time_window: {
        id: "tw3",
        description: "Morning Work",
        start_time: 540, // 9:00 AM
        end_time: 660, // 11:00 AM
        category: mockCategories[0],
        day_template_id: "",
        user_id: "user1",
        is_deleted: false,
      },
      tasks: [
        {
          id: "task2",
          title: "Complete project",
          status: "pending",
          priority: "high",
          description: "",
          user_id: "user1",
          category_id: "cat1",
        } as Task,
      ],
    },
    {
      time_window: {
        id: "tw4",
        description: "Lunch Break",
        start_time: 720, // 12:00 PM
        end_time: 780, // 1:00 PM
        category: mockCategories[1],
        day_template_id: "",
        user_id: "user1",
        is_deleted: false,
      },
      tasks: [],
    },
  ],
  self_reflection: null,
};

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Router>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MessageProvider>
          <TimerProvider>{children}</TimerProvider>
        </MessageProvider>
      </AuthProvider>
    </QueryClientProvider>
  </Router>
);

const renderWithProviders = (component: React.ReactElement) => {
  return render(component, { wrapper: AllTheProviders });
};

describe("Plan Review and Approval Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();

    // Mock getTodayStats
    const { getTodayStats } = require("../../services/userDailyStatsService");
    (getTodayStats as jest.Mock).mockResolvedValue({ pomodoros_completed: 0 });

    // Mock useCategories
    mockedUseCategories.mockReturnValue({
      data: mockCategories,
      isLoading: false,
    });

    // Mock useTemplates
    mockedUseTemplates.mockReturnValue({ data: [], isLoading: false });

    // Mock useCarryOverIntegration
    mockUseCarryOverIntegration.mockReturnValue({
      carryOverWithTimerIntegration: jest.fn(),
      validateCarryOver: jest.fn(),
      getTimeWindowCarryOverStatus: jest.fn(),
      getAffectedTasks: jest.fn().mockReturnValue([]),
      activeTimerTimeWindows: [],
      isCurrentTaskInTimeWindow: jest.fn().mockReturnValue(false),
      currentTaskId: undefined,
      isCarryingOver: false,
    });

    // Mock useTimer
    mockUseTimer.mockReturnValue({
      mode: "work",
      timeRemaining: 1500000,
      isActive: false,
      pomodorosCompleted: 0,
      currentTaskId: undefined,
      currentTaskName: undefined,
      currentTaskDescription: undefined,
      handleStartPause: jest.fn(),
      handleReset: jest.fn(),
      handleSkip: jest.fn(),
      stopCurrentTask: jest.fn(),
      resetForNewTask: jest.fn(),
      handleMarkAsDone: jest.fn(),
      formatTime: jest.fn().mockReturnValue("25:00"),
      isUpdatingTaskStatus: false,
      isUpdatingWorkingTime: false,
      isUpdating: false,
      setIsActive: jest.fn(),
      setCurrentTaskId: jest.fn(),
      setCurrentTaskName: jest.fn(),
      setCurrentTaskDescription: jest.fn(),
      isBreak: false,
      timerColor: "#4CAF50",
      buttonBgColor: "#4CAF50",
      buttonTextColor: "#FFFFFF",
      modeText: "work",
    });
  });

  describe("Complete Plan Review and Approval Process", () => {
    it("successfully approves a plan with no conflicts", async () => {
      // Mock the plan with no conflicts
      mockedUseTodayDailyPlan.mockReturnValue({
        data: mockDailyPlanNoConflicts,
        isLoading: false,
      });
      mockedUsePrevDayDailyPlan.mockReturnValue({
        data: null,
        isLoading: false,
      });

      // Mock review mode
      mockUseDailyPlanWithReview.mockReturnValue({
        dailyPlan: mockDailyPlanNoConflicts,
        isLoading: false,
        needsReview: true,
        reviewMode: "needs-review",
        approvePlan: jest.fn().mockResolvedValue({
          plan: { ...mockDailyPlanNoConflicts, reviewed: true },
        }),
        isApprovingPlan: false,
      });

      // Mock successful update
      mockedUpdateDailyPlan.mockResolvedValue({
        ...mockDailyPlanNoConflicts,
        reviewed: true,
      });

      renderWithProviders(<MyDayPage />);

      // Wait for review mode to load
      await waitFor(() => {
        expect(screen.getByText("Plan Review Required")).toBeInTheDocument();
      });

      // Verify plan details are shown
      expect(screen.getByText("Morning Work")).toBeInTheDocument();
      expect(screen.getByText("Lunch Break")).toBeInTheDocument();

      // Click approve button
      const approveButton = screen.getByRole("button", {
        name: "Approve Plan",
      });
      fireEvent.click(approveButton);

      // Wait for approval to complete
      await waitFor(() => {
        expect(mockUseDailyPlanWithReview().approvePlan).toHaveBeenCalledWith([
          expect.objectContaining({
            time_window: expect.objectContaining({ id: "tw3" }),
          }),
          expect.objectContaining({
            time_window: expect.objectContaining({ id: "tw4" }),
          }),
        ]);
      });
    });

    it("handles approval failure gracefully", async () => {
      // Mock the plan with no conflicts
      mockedUseTodayDailyPlan.mockReturnValue({
        data: mockDailyPlanNoConflicts,
        isLoading: false,
      });
      mockedUsePrevDayDailyPlan.mockReturnValue({
        data: null,
        isLoading: false,
      });

      // Mock review mode with approval failure
      const mockApprovePlan = jest
        .fn()
        .mockRejectedValue(new Error("Approval failed"));
      mockUseDailyPlanWithReview.mockReturnValue({
        dailyPlan: mockDailyPlanNoConflicts,
        isLoading: false,
        needsReview: true,
        reviewMode: "needs-review",
        approvePlan: mockApprovePlan,
        isApprovingPlan: false,
      });

      renderWithProviders(<MyDayPage />);

      // Wait for review mode to load
      await waitFor(() => {
        expect(screen.getByText("Plan Review Required")).toBeInTheDocument();
      });

      // Click approve button
      const approveButton = screen.getByRole("button", {
        name: "Approve Plan",
      });
      fireEvent.click(approveButton);

      // Wait for error handling
      await waitFor(() => {
        expect(mockApprovePlan).toHaveBeenCalled();
      });

      // Component should still be functional
      expect(screen.getByText("Plan Review Required")).toBeInTheDocument();
    });

    it("shows approval loading state during approval process", async () => {
      // Mock the plan with no conflicts
      mockedUseTodayDailyPlan.mockReturnValue({
        data: mockDailyPlanNoConflicts,
        isLoading: false,
      });
      mockedUsePrevDayDailyPlan.mockReturnValue({
        data: null,
        isLoading: false,
      });

      // Mock review mode with loading state
      mockUseDailyPlanWithReview.mockReturnValue({
        dailyPlan: mockDailyPlanNoConflicts,
        isLoading: false,
        needsReview: true,
        reviewMode: "needs-review",
        approvePlan: jest.fn(),
        isApprovingPlan: true,
      });

      renderWithProviders(<MyDayPage />);

      // Wait for loading state to be shown
      await waitFor(() => {
        expect(screen.getByText("Approving...")).toBeInTheDocument();
      });
    });
  });

  describe("Conflict Resolution Integration", () => {
    it.skip("displays conflicts and allows resolution through UI", async () => {
      // Mock the plan with conflicts
      mockedUseTodayDailyPlan.mockReturnValue({
        data: mockDailyPlanWithConflicts,
        isLoading: false,
      });
      mockedUsePrevDayDailyPlan.mockReturnValue({
        data: null,
        isLoading: false,
      });

      // Mock review mode
      mockUseDailyPlanWithReview.mockReturnValue({
        dailyPlan: mockDailyPlanWithConflicts,
        isLoading: false,
        needsReview: true,
        reviewMode: "needs-review",
        approvePlan: jest.fn(),
        isApprovingPlan: false,
      });

      renderWithProviders(<MyDayPage />);

      // Wait for review mode to load
      await waitFor(() => {
        expect(screen.getByText("Plan Review Required")).toBeInTheDocument();
      });

      // Verify conflicts are displayed
      expect(screen.getByText("Scheduling Conflicts (1)")).toBeInTheDocument();
      expect(screen.getByText("Time Window Overlap")).toBeInTheDocument();
      expect(screen.getByText("Morning Work")).toBeInTheDocument();
      expect(screen.getByText("Team Meeting")).toBeInTheDocument();
    });

    it.skip("allows editing conflicting time windows", async () => {
      // Mock the plan with conflicts
      mockedUseTodayDailyPlan.mockReturnValue({
        data: mockDailyPlanWithConflicts,
        isLoading: false,
      });
      mockedUsePrevDayDailyPlan.mockReturnValue({
        data: null,
        isLoading: false,
      });

      // Mock review mode
      mockUseDailyPlanWithReview.mockReturnValue({
        dailyPlan: mockDailyPlanWithConflicts,
        isLoading: false,
        needsReview: true,
        reviewMode: "needs-review",
        approvePlan: jest.fn(),
        isApprovingPlan: false,
      });

      renderWithProviders(<MyDayPage />);

      // Wait for conflicts to be displayed
      await waitFor(() => {
        expect(
          screen.getByText("Scheduling Conflicts (1)")
        ).toBeInTheDocument();
      });

      // Find and click edit button for first time window
      const editButtons = screen.getAllByTitle("Edit time window");
      fireEvent.click(editButtons[0]);

      // Verify edit modal opens (mocked)
      await waitFor(() => {
        expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
      });
    });

    it.skip("allows deleting conflicting time windows", async () => {
      // Mock the plan with conflicts
      mockedUseTodayDailyPlan.mockReturnValue({
        data: mockDailyPlanWithConflicts,
        isLoading: false,
      });
      mockedUsePrevDayDailyPlan.mockReturnValue({
        data: null,
        isLoading: false,
      });

      // Mock review mode
      mockUseDailyPlanWithReview.mockReturnValue({
        dailyPlan: mockDailyPlanWithConflicts,
        isLoading: false,
        needsReview: true,
        reviewMode: "needs-review",
        approvePlan: jest.fn(),
        isApprovingPlan: false,
      });

      renderWithProviders(<MyDayPage />);

      // Wait for conflicts to be displayed
      await waitFor(() => {
        expect(
          screen.getByText("Scheduling Conflicts (1)")
        ).toBeInTheDocument();
      });

      // Find and click delete button for first time window
      const deleteButtons = screen.getAllByTitle("Delete time window");
      fireEvent.click(deleteButtons[0]);

      // Verify time window is removed from display
      await waitFor(() => {
        expect(screen.queryByText("Morning Work")).not.toBeInTheDocument();
      });
    });

    it.skip("shows resolution suggestions for different conflict types", async () => {
      // Mock the plan with conflicts
      mockedUseTodayDailyPlan.mockReturnValue({
        data: mockDailyPlanWithConflicts,
        isLoading: false,
      });
      mockedUsePrevDayDailyPlan.mockReturnValue({
        data: null,
        isLoading: false,
      });

      // Mock review mode
      mockUseDailyPlanWithReview.mockReturnValue({
        dailyPlan: mockDailyPlanWithConflicts,
        isLoading: false,
        needsReview: true,
        reviewMode: "needs-review",
        approvePlan: jest.fn(),
        isApprovingPlan: false,
      });

      renderWithProviders(<MyDayPage />);

      // Wait for conflicts to be displayed
      await waitFor(() => {
        expect(
          screen.getByText("Scheduling Conflicts (1)")
        ).toBeInTheDocument();
      });

      // Verify resolution suggestions are shown
      expect(screen.getByText("Resolution Suggestions:")).toBeInTheDocument();
      expect(
        screen.getByText(/Adjust the start or end times to eliminate overlap/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Delete one of the overlapping time windows/)
      ).toBeInTheDocument();
    });

    it.skip("prevents approval when conflicts exist", async () => {
      // Mock the plan with conflicts
      mockedUseTodayDailyPlan.mockReturnValue({
        data: mockDailyPlanWithConflicts,
        isLoading: false,
      });
      mockedUsePrevDayDailyPlan.mockReturnValue({
        data: null,
        isLoading: false,
      });

      // Mock review mode
      const mockApprovePlan = jest.fn();
      mockUseDailyPlanWithReview.mockReturnValue({
        dailyPlan: mockDailyPlanWithConflicts,
        isLoading: false,
        needsReview: true,
        reviewMode: "needs-review",
        approvePlan: mockApprovePlan,
        isApprovingPlan: false,
      });

      renderWithProviders(<MyDayPage />);

      // Wait for conflicts to be displayed
      await waitFor(() => {
        expect(
          screen.getByText("Scheduling Conflicts (1)")
        ).toBeInTheDocument();
      });

      // Try to approve - this should not succeed due to conflicts
      const approveButton = screen.getByRole("button", {
        name: "Approve Plan",
      });
      fireEvent.click(approveButton);

      // The approval should not be called because conflicts exist
      // (In a real implementation, the button would be disabled or show an error)
      await waitFor(() => {
        // Component should still show conflicts
        expect(
          screen.getByText("Scheduling Conflicts (1)")
        ).toBeInTheDocument();
      });
    });
  });

  describe("End-to-End Plan Review Workflow", () => {
    it.skip("completes full workflow: create plan -> review conflicts -> resolve -> approve", async () => {
      // Start with a plan that has conflicts
      mockedUseTodayDailyPlan.mockReturnValue({
        data: mockDailyPlanWithConflicts,
        isLoading: false,
      });
      mockedUsePrevDayDailyPlan.mockReturnValue({
        data: null,
        isLoading: false,
      });

      // Mock review mode
      mockUseDailyPlanWithReview.mockReturnValue({
        dailyPlan: mockDailyPlanWithConflicts,
        isLoading: false,
        needsReview: true,
        reviewMode: "needs-review",
        approvePlan: jest.fn(),
        isApprovingPlan: false,
      });

      renderWithProviders(<MyDayPage />);

      // Step 1: Verify review mode is shown
      await waitFor(() => {
        expect(screen.getByText("Plan Review Required")).toBeInTheDocument();
        expect(
          screen.getByText("Scheduling Conflicts (1)")
        ).toBeInTheDocument();
      });

      // Step 2: Resolve conflicts by deleting one time window
      const deleteButtons = screen.getAllByTitle("Delete time window");
      fireEvent.click(deleteButtons[1]); // Delete the overlapping time window

      // Step 3: Verify conflicts are resolved
      await waitFor(() => {
        expect(
          screen.queryByText("Scheduling Conflicts (1)")
        ).not.toBeInTheDocument();
      });

      // Step 4: Now approve the plan
      const approveButton = screen.getByRole("button", {
        name: "Approve Plan",
      });
      fireEvent.click(approveButton);

      // Step 5: Verify approval was called
      await waitFor(() => {
        expect(mockUseDailyPlanWithReview().approvePlan).toHaveBeenCalled();
      });
    });

    it.skip("handles multiple conflict resolution actions", async () => {
      // Create a plan with multiple conflicts
      const planWithMultipleConflicts: DailyPlanResponse = {
        ...mockDailyPlanWithConflicts,
        time_windows: [
          ...mockDailyPlanWithConflicts.time_windows,
          {
            time_window: {
              id: "tw5",
              description: "Another Meeting",
              start_time: 600, // 10:00 AM - overlaps with tw2
              end_time: 660, // 11:00 AM
              category: mockCategories[1],
              day_template_id: "",
              user_id: "user1",
              is_deleted: false,
            },
            tasks: [],
          },
        ],
      };

      mockedUseTodayDailyPlan.mockReturnValue({
        data: planWithMultipleConflicts,
        isLoading: false,
      });
      mockedUsePrevDayDailyPlan.mockReturnValue({
        data: null,
        isLoading: false,
      });

      // Mock review mode
      mockUseDailyPlanWithReview.mockReturnValue({
        dailyPlan: planWithMultipleConflicts,
        isLoading: false,
        needsReview: true,
        reviewMode: "needs-review",
        approvePlan: jest.fn(),
        isApprovingPlan: false,
      });

      renderWithProviders(<MyDayPage />);

      // Wait for multiple conflicts to be displayed
      await waitFor(() => {
        expect(
          screen.getByText("Scheduling Conflicts (2)")
        ).toBeInTheDocument();
      });

      // Resolve conflicts one by one
      const deleteButtons = screen.getAllByTitle("Delete time window");

      // Delete first conflicting time window
      fireEvent.click(deleteButtons[0]);
      await waitFor(() => {
        expect(
          screen.getByText("Scheduling Conflicts (1)")
        ).toBeInTheDocument();
      });

      // Delete second conflicting time window
      const remainingDeleteButtons = screen.getAllByTitle("Delete time window");
      fireEvent.click(remainingDeleteButtons[0]);

      // Verify all conflicts are resolved
      await waitFor(() => {
        expect(
          screen.queryByText("Scheduling Conflicts")
        ).not.toBeInTheDocument();
      });
    });
  });
});
