import {
  getDailyPlanByDate,
  getPrevDayDailyPlan,
  createDailyPlan,
  updateDailyPlan,
  getTodayDailyPlan,
  carryOverTimeWindow,
} from "./dailyPlanService";
import api from "./api";
import { API_ENDPOINTS } from "../constants/apiEndpoints";
import {
  DailyPlanResponse,
  PlanApprovalResponse,
  CarryOverTimeWindowRequest,
} from "../types/dailyPlan";

jest.mock("./api");

describe("dailyPlanService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getDailyPlanByDate", () => {
    const mockDate = "2023-10-26";
    const mockPrevDayPlan: DailyPlanResponse = {
      id: "1",
      plan_date: mockDate,
      user_id: "user1",
      reviewed: true,
      time_windows: [],
      self_reflection: {
        positive: "Had a productive morning",
        negative: "Need to improve focus in the afternoon",
        follow_up_notes: "Consider taking breaks more often",
      },
    };

    it("should fetch daily plan by date successfully", async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({ data: mockPrevDayPlan });

      const result = await getDailyPlanByDate(mockDate);

      expect(api.get).toHaveBeenCalledWith(
        API_ENDPOINTS.DAILY_PLAN_BY_DATE(mockDate)
      );
      expect(result).toEqual(mockPrevDayPlan);
    });

    it("should return null if no daily plan is found", async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({ data: {} });

      const result = await getDailyPlanByDate(mockDate);

      expect(api.get).toHaveBeenCalledWith(
        API_ENDPOINTS.DAILY_PLAN_BY_DATE(mockDate)
      );
      expect(result).toBeNull();
    });

    it("should throw an error if fetching daily plan by date fails", async () => {
      const errorMessage = "Failed to fetch daily plan";
      (api.get as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(getDailyPlanByDate(mockDate)).rejects.toThrow(errorMessage);
    });
  });

  describe("getPrevDayDailyPlan", () => {
    const mockPrevDayPlan: DailyPlanResponse = {
      id: "2",
      plan_date: "2023-10-25",
      user_id: "user1",
      reviewed: true,
      time_windows: [],
      self_reflection: {
        positive: "Had a productive morning",
        negative: "Need to improve focus in the afternoon",
        follow_up_notes: "Consider taking breaks more often",
      },
    };

    it("should fetch previous day's daily plan successfully", async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({ data: mockPrevDayPlan });

      const result = await getPrevDayDailyPlan();

      expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.DAILY_PLAN_PREV_DAY);
      expect(result).toEqual(mockPrevDayPlan);
    });

    it("should return null if no daily plan is found for previous day", async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({ data: {} });

      const result = await getPrevDayDailyPlan();

      expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.DAILY_PLAN_PREV_DAY);
      expect(result).toBeNull();
    });

    it("should throw an error if fetching previous day's daily plan fails", async () => {
      const errorMessage = "Failed to fetch previous day's daily plan";
      (api.get as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(getPrevDayDailyPlan()).rejects.toThrow(errorMessage);
    });
  });

  describe("createDailyPlan", () => {
    const mockTimeWindows = [
      { start_time: "09:00", end_time: "10:00", task_id: "task1" },
    ];
    const mockCreatedDailyPlan: DailyPlanResponse = {
      id: "3",
      plan_date: "2023-10-27",
      user_id: "user1",
      reviewed: false,
      time_windows: mockTimeWindows as any, // Cast to any to match the service's any[] type
      self_reflection: {
        positive: null,
        negative: null,
        follow_up_notes: null,
      },
    };

    it("should create a daily plan successfully", async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: mockCreatedDailyPlan,
      });

      const result = await createDailyPlan(mockTimeWindows);

      expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.DAILY_PLAN, {
        time_windows: mockTimeWindows,
      });
      expect(result).toEqual(mockCreatedDailyPlan);
    });

    it("should throw an error if creating a daily plan fails", async () => {
      const errorMessage = "Failed to create daily plan";
      (api.post as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(createDailyPlan(mockTimeWindows)).rejects.toThrow(
        errorMessage
      );
    });
  });

  describe("updateDailyPlan", () => {
    const dailyPlanId = "1";
    const updatePayload = {
      self_reflection: {
        positive: null,
        negative: null,
        follow_up_notes: null,
      },
    };
    const mockUpdatedDailyPlan: DailyPlanResponse = {
      id: dailyPlanId,
      plan_date: "2023-10-26",
      user_id: "user1",
      reviewed: true,
      time_windows: [],
      self_reflection: {
        positive: null,
        negative: null,
        follow_up_notes: null,
      },
    };

    it("should update a daily plan successfully", async () => {
      const mockApprovalResponse: PlanApprovalResponse = {
        plan: mockUpdatedDailyPlan,
        merged: false,
        merge_details: null,
      };
      (api.put as jest.Mock).mockResolvedValueOnce({
        data: mockApprovalResponse,
      });

      const result = await updateDailyPlan(dailyPlanId, updatePayload);

      expect(api.put).toHaveBeenCalledWith(
        API_ENDPOINTS.DAILY_PLAN_UPDATE_BY_ID(dailyPlanId),
        updatePayload
      );
      expect(result).toEqual(mockApprovalResponse);
    });

    it("should throw an error if updating a daily plan fails", async () => {
      const errorMessage = "Failed to update daily plan";
      (api.put as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(updateDailyPlan(dailyPlanId, updatePayload)).rejects.toThrow(
        errorMessage
      );
    });
  });

  describe("getTodayDailyPlan", () => {
    const mockPrevDayPlan: DailyPlanResponse = {
      id: "4",
      plan_date: "2023-10-27",
      user_id: "user1",
      reviewed: true,
      time_windows: [],
      self_reflection: {
        positive: null,
        negative: null,
        follow_up_notes: null,
      },
    };

    it("should fetch today's daily plan successfully", async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({ data: mockPrevDayPlan });

      const result = await getTodayDailyPlan();

      expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.DAILY_PLAN_TODAY);
      expect(result).toEqual(mockPrevDayPlan);
    });

    it("should return null if no daily plan is found for today", async () => {
      (api.get as jest.Mock).mockResolvedValueOnce({ data: {} });

      const result = await getTodayDailyPlan();

      expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.DAILY_PLAN_TODAY);
      expect(result).toBeNull();
    });

    it("should throw an error if fetching today's daily plan fails", async () => {
      const errorMessage = "Failed to fetch today's daily plan";
      (api.get as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(getTodayDailyPlan()).rejects.toThrow(errorMessage);
    });
  });

  describe("carryOverTimeWindow", () => {
    const mockRequest: CarryOverTimeWindowRequest = {
      source_plan_id: "source-plan-1",
      time_window_id: "time-window-1",
      target_date: "2023-10-28",
    };
    const mockUpdatedSourcePlan: DailyPlanResponse = {
      id: "source-plan-1",
      plan_date: "2023-10-27",
      user_id: "user1",
      reviewed: true,
      time_windows: [],
      self_reflection: {
        positive: null,
        negative: null,
        follow_up_notes: null,
      },
    };

    it("should carry over time window successfully", async () => {
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: mockUpdatedSourcePlan,
      });

      const result = await carryOverTimeWindow(mockRequest);

      expect(api.post).toHaveBeenCalledWith(
        API_ENDPOINTS.DAILY_PLAN_CARRY_OVER,
        mockRequest
      );
      expect(result).toEqual(mockUpdatedSourcePlan);
    });

    it("should throw an error if carry over fails", async () => {
      const errorMessage = "Failed to carry over time window";
      (api.post as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(carryOverTimeWindow(mockRequest)).rejects.toThrow(
        errorMessage
      );
    });
  });
});
