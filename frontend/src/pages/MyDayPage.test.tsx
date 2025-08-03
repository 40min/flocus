import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "context/AuthContext";
import { MessageProvider, useMessage } from "context/MessageContext";
import MyDayPage from "./MyDayPage";
import { useTodayDailyPlan, usePrevDayDailyPlan } from "hooks/useDailyPlan";
import { useTemplates } from "hooks/useTemplates";
import { useCategories } from "hooks/useCategories";
import * as dailyPlanService from "services/dailyPlanService";
import { DailyPlanResponse } from "types/dailyPlan";
import { DayTemplateResponse } from "types/dayTemplate";
import { Category } from "types/category";
import { Task } from "types/task";
import { SharedTimerProvider } from "context/SharedTimerContext";
import { getTodayStats } from "services/userDailyStatsService";

// Mocks
jest.mock("hooks/useDailyPlan");
jest.mock("hooks/useTemplates");
jest.mock("hooks/useCategories");
jest.mock("services/dailyPlanService");
jest.mock("services/userDailyStatsService");
jest.mock("components/modals/CreateTimeWindowModal", () => ({
  __esModule: true,
  default: ({ isOpen }: any) => (isOpen ? null : null),
}));

jest.mock("components/modals/EditDailyPlanTimeWindowModal", () => ({
  __esModule: true,
  default: ({ isOpen }: any) =>
    isOpen ? (
      <div data-testid="edit-modal">
        <p>Mock Edit Modal</p>
      </div>
    ) : null,
}));

jest.mock("context/MessageContext", () => {
  const actualMessageContext = jest.requireActual("context/MessageContext");
  return {
    ...actualMessageContext,
    useMessage: jest.fn().mockReturnValue({ showMessage: jest.fn() }),
  };
});

const mockedUseTodayDailyPlan = useTodayDailyPlan as jest.Mock;
const mockedUsePrevDayDailyPlan = usePrevDayDailyPlan as jest.Mock;
const mockedUseTemplates = useTemplates as jest.Mock;
const mockedUseCategories = useCategories as jest.Mock;
const mockedCreateDailyPlan = dailyPlanService.createDailyPlan as jest.Mock;
const mockedUpdateDailyPlan = dailyPlanService.updateDailyPlan as jest.Mock;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const mockCategories: Category[] = [
  { id: "cat1", name: "Work", user_id: "user1", is_deleted: false },
  { id: "cat2", name: "Personal", user_id: "user1", is_deleted: false },
];

const mockTemplates: DayTemplateResponse[] = [
  {
    id: "template1",
    name: "Work Day",
    description: "A standard work day template",
    user_id: "user1",
    time_windows: [
      {
        id: "tw1",
        description: "Morning work",
        start_time: 540,
        end_time: 660,
        category: mockCategories[0],
        day_template_id: "template1",
        user_id: "user1",
        is_deleted: false,
      },
    ],
  },
];

const mockDailyPlan: DailyPlanResponse = {
  id: "plan1",
  user_id: "user1",
  plan_date: new Date().toISOString(),
  time_windows: [
    {
      time_window: {
        id: "tw1",
        description: "Morning work",
        start_time: 540,
        end_time: 660,
        category: mockCategories[0],
        day_template_id: "",
        user_id: "user1",
        is_deleted: false,
      },
      tasks: [],
    },
  ],
  self_reflection: {
    positive: "Had a productive morning",
    negative: "Need to improve focus in the afternoon",
    follow_up_notes: "Consider taking breaks more often",
  },
};

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Router>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MessageProvider>
          <SharedTimerProvider>{children}</SharedTimerProvider>
        </MessageProvider>
      </AuthProvider>
    </QueryClientProvider>
  </Router>
);

const renderComponent = () => {
  return render(<MyDayPage />, { wrapper: AllTheProviders });
};

describe("MyDayPage", () => {
  beforeEach(() => {
    (getTodayStats as jest.Mock).mockResolvedValue({ pomodoros_completed: 0 });
    jest.clearAllMocks();
    queryClient.clear();
    mockedUseCategories.mockReturnValue({
      data: mockCategories,
      isLoading: false,
    });
    // useMessage is now mocked directly in the jest.mock factory,
    // but we can ensure showMessage is a fresh mock for each test if needed,
    // or rely on the factory's mockReturnValue.
    // For simplicity, if the factory mock is sufficient, this line can be removed or adjusted.
    // Let's ensure it's reset or explicitly set for clarity if tests depend on its call count/args.
    (useMessage as jest.Mock).mockReturnValue({ showMessage: jest.fn() });
  });

  it("renders loading state", async () => {
    mockedUseTodayDailyPlan.mockReturnValue({ data: null, isLoading: true });
    mockedUsePrevDayDailyPlan.mockReturnValue({ data: null, isLoading: false });
    mockedUseTemplates.mockReturnValue({ data: [], isLoading: false });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Loading daily plan...")).toBeInTheDocument();
    });
  });

  describe("when no daily plan exists", () => {
    beforeEach(() => {
      mockedUseTodayDailyPlan.mockReturnValue({ data: null, isLoading: false });
      mockedUsePrevDayDailyPlan.mockReturnValue({
        data: null,
        isLoading: false,
      });
    });

    it("renders create plan prompt when no templates are selected", async () => {
      mockedUseTemplates.mockReturnValue({ data: [], isLoading: false });
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Welcome to Your Day")).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Or Choose from All Templates" })
        ).toBeInTheDocument();
      });
    });

    it('selects template on "Work Day" template click', async () => {
      mockedUseTemplates.mockReturnValue({
        data: mockTemplates,
        isLoading: false,
      });
      renderComponent();
      fireEvent.click(screen.getByRole("button", { name: /Work Day/ }));
      await waitFor(() => {
        expect(screen.getByText("Morning work")).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Save Today's Plan" })
        ).toBeInTheDocument();
      });
    });

    it("shows template preview after selection and saves plan on click", async () => {
      mockedUseTemplates.mockReturnValue({
        data: mockTemplates,
        isLoading: false,
      });
      mockedCreateDailyPlan.mockResolvedValue({});
      renderComponent();

      // Click on the Work Day template button directly
      fireEvent.click(screen.getByRole("button", { name: /Work Day/ }));

      await waitFor(() => {
        expect(screen.getByText("Morning work")).toBeInTheDocument();
      });

      fireEvent.click(
        screen.getByRole("button", { name: "Save Today's Plan" })
      );

      await waitFor(() => {
        expect(mockedCreateDailyPlan).toHaveBeenCalledWith([
          {
            description: "Morning work",
            start_time: 540,
            end_time: 660,
            category_id: "cat1",
            task_ids: [],
          },
        ]);
      });
    });

    describe("when previous day's plan exists", () => {
      const mockPrevDayPlan: DailyPlanResponse = {
        id: "yesterday_plan",
        user_id: "user1",
        plan_date: new Date(
          new Date().setDate(new Date().getDate() - 1)
        ).toISOString(),
        time_windows: [
          {
            time_window: {
              id: "tw_yesterday_1",
              description: "Morning session",
              start_time: 540,
              end_time: 660,
              category: mockCategories[0],
              day_template_id: "",
              user_id: "user1",
              is_deleted: false,
            },
            tasks: [
              {
                id: "task1",
                title: "Completed Task",
                status: "done",
                priority: "medium",
                description: "",
                user_id: "user1",
                category_id: "cat1",
              } as Task,
              {
                id: "task2",
                title: "Uncompleted Task",
                status: "in_progress",
                priority: "high",
                description: "",
                user_id: "user1",
                category_id: "cat1",
              } as Task,
            ],
          },
          {
            time_window: {
              id: "tw_yesterday_2",
              description: "Afternoon session",
              start_time: 840,
              end_time: 960,
              category: mockCategories[1],
              day_template_id: "",
              user_id: "user1",
              is_deleted: false,
            },
            tasks: [
              {
                id: "task3",
                title: "Another Uncompleted Task",
                status: "pending",
                priority: "low",
                description: "",
                user_id: "user1",
                category_id: "cat2",
              } as Task,
            ],
          },
        ],
        self_reflection: {
          positive: "Had a productive morning",
          negative: "Need to improve focus in the afternoon",
          follow_up_notes: "Consider taking breaks more often",
        },
      };

      beforeEach(() => {
        mockedUsePrevDayDailyPlan.mockReturnValue({
          data: mockPrevDayPlan,
          isLoading: false,
        });
        mockedUseTemplates.mockReturnValue({ data: [], isLoading: false });
        mockedCreateDailyPlan.mockResolvedValue({});
      });

      it("shows review section with tasks from yesterday", async () => {
        renderComponent();
        await waitFor(() => {
          expect(
            screen.getByText("Review Yesterday's Plan")
          ).toBeInTheDocument();
        });
        expect(screen.getByText("Completed Task")).toBeInTheDocument();
        expect(screen.getByText("Uncompleted Task")).toBeInTheDocument();
        expect(
          screen.getByText("Another Uncompleted Task")
        ).toBeInTheDocument();
      });

      it('carries over uncompleted tasks to a new daily plan on "Carry over" click', async () => {
        renderComponent();

        const carryOverButton = await screen.findByRole("button", {
          name: "Carry Over Uncompleted Tasks",
        });
        expect(carryOverButton).toBeInTheDocument();

        // Simulate changing reflection
        fireEvent.change(screen.getByLabelText("What could be improved?"), {
          target: { value: "Could be better." },
        });

        fireEvent.click(carryOverButton);

        await waitFor(() => {
          expect(dailyPlanService.updateDailyPlan).toHaveBeenCalledWith(
            "yesterday_plan",
            {
              self_reflection: {
                ...mockPrevDayPlan.self_reflection,
                negative: "Could be better.",
              },
            }
          );
        });
        await waitFor(() => {
          expect(mockedCreateDailyPlan).toHaveBeenCalledWith([
            {
              description: "Morning session",
              start_time: 540,
              end_time: 660,
              category_id: "cat1",
              task_ids: ["task2"],
            },
            {
              description: "Afternoon session",
              start_time: 840,
              end_time: 960,
              category_id: "cat2",
              task_ids: ["task3"],
            },
          ]);
        });
      });
      it("hides review section when a template is selected", async () => {
        mockedUseTemplates.mockReturnValue({
          data: mockTemplates,
          isLoading: false,
        });
        renderComponent();

        await waitFor(() => {
          expect(
            screen.getByText("Review Yesterday's Plan")
          ).toBeInTheDocument();
        });

        // Click on "Create new plan" button from the review section
        fireEvent.click(
          screen.getByRole("button", { name: "Create New Plan" })
        );

        await waitFor(() => {
          expect(
            screen.queryByText("Review Yesterday's Plan")
          ).not.toBeInTheDocument();
        });
      });
    });
  });

  describe("when a daily plan exists", () => {
    beforeEach(() => {
      mockedUseTodayDailyPlan.mockReturnValue({
        data: JSON.parse(JSON.stringify(mockDailyPlan)),
        isLoading: false,
      });
      mockedUsePrevDayDailyPlan.mockReturnValue({
        data: null,
        isLoading: false,
      });
      mockedUseTemplates.mockReturnValue({ data: [], isLoading: false });
    });

    it("renders the existing plan", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Morning work")).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Add Time Window" })
        ).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Save" })
        ).toBeInTheDocument();
      });
    });

    it("deletes a time window", async () => {
      renderComponent();
      expect(screen.getByText("Morning work")).toBeInTheDocument();

      const deleteButton = screen.getByLabelText("Delete time window");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText("Morning work")).not.toBeInTheDocument();
      });

      expect(
        screen.getByText("No time windows planned for today.")
      ).toBeInTheDocument();
    });

    it("saves the updated daily plan", async () => {
      mockedUpdateDailyPlan.mockResolvedValue({});
      renderComponent();

      const deleteButton = screen.getByLabelText("Delete time window");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText("Morning work")).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(mockedUpdateDailyPlan).toHaveBeenCalledWith("plan1", {
          time_windows: [],
        });
      });
    }); // This closes 'it('saves the updated daily plan', ...)'

    it("opens edit modal when edit button is clicked", async () => {
      renderComponent();

      // Find and click the edit button for "Morning work"
      await screen.findByText("Morning work"); // Ensure the item is rendered
      const editButtons = screen.getAllByLabelText("Edit time window"); // Get all edit buttons
      // Assuming the first TimeWindowBalloon is "Morning work" based on mockDailyPlan
      fireEvent.click(editButtons[0]);

      // Assert modal is open
      await screen.findByTestId("edit-modal");
      expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
      expect(screen.getByText("Mock Edit Modal")).toBeInTheDocument(); // Check for mock content
    });

    // TODO: Future test with a more sophisticated mock or by not mocking this modal

    it("saves the plan when save button is clicked (after an action like delete)", async () => {
      mockedUpdateDailyPlan.mockResolvedValue({});
      renderComponent();

      const deleteButton = screen.getByLabelText("Delete time window");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText("Morning work")).not.toBeInTheDocument();
      });

      const savePlanButton = screen.getByRole("button", { name: "Save" });
      fireEvent.click(savePlanButton);

      await waitFor(() => {
        expect(mockedUpdateDailyPlan).toHaveBeenCalledWith("plan1", {
          time_windows: [],
        });
      });
    });
  });
});
