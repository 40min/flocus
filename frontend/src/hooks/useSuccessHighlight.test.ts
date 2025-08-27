import { renderHook, act } from "@testing-library/react";
import { useSuccessHighlight } from "./useSuccessHighlight";

// Mock timers
jest.useFakeTimers();

describe("useSuccessHighlight", () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("should initialize with isHighlighted as false", () => {
    const { result } = renderHook(() => useSuccessHighlight());

    expect(result.current.isHighlighted).toBe(false);
  });

  it("should set isHighlighted to true when triggerHighlight is called", () => {
    const { result } = renderHook(() => useSuccessHighlight());

    act(() => {
      result.current.triggerHighlight();
    });

    expect(result.current.isHighlighted).toBe(true);
  });

  it("should reset isHighlighted to false after timeout", () => {
    const { result } = renderHook(() => useSuccessHighlight());

    act(() => {
      result.current.triggerHighlight();
    });

    expect(result.current.isHighlighted).toBe(true);

    // Fast-forward time by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.isHighlighted).toBe(false);
  });

  it("should clear previous timeout when triggerHighlight is called multiple times", () => {
    const { result } = renderHook(() => useSuccessHighlight());

    // First trigger
    act(() => {
      result.current.triggerHighlight();
    });

    expect(result.current.isHighlighted).toBe(true);

    // Advance time by 500ms (halfway through)
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current.isHighlighted).toBe(true);

    // Second trigger should reset the timer
    act(() => {
      result.current.triggerHighlight();
    });

    expect(result.current.isHighlighted).toBe(true);

    // Advance by another 500ms (should still be highlighted because timer was reset)
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current.isHighlighted).toBe(true);

    // Advance by another 500ms (now should be false, total 1000ms from second trigger)
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current.isHighlighted).toBe(false);
  });

  it("should cleanup timeout on unmount", () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    const { result, unmount } = renderHook(() => useSuccessHighlight());

    act(() => {
      result.current.triggerHighlight();
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
