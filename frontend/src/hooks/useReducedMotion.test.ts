import { renderHook } from "@testing-library/react";
import { useReducedMotion } from "./useReducedMotion";

// Mock matchMedia
const mockMatchMedia = (matches: boolean) => {
  const mockMediaQuery = {
    matches,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  };

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockReturnValue(mockMediaQuery),
  });

  return mockMediaQuery;
};

describe("useReducedMotion", () => {
  beforeEach(() => {
    // Reset window.matchMedia
    delete (window as any).matchMedia;
  });

  it("should return false when prefers-reduced-motion is not set", () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });

  it("should return true when prefers-reduced-motion is set", () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });

  it("should handle missing matchMedia gracefully", () => {
    // Mock window.matchMedia as undefined
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });

  it("should add event listener when available", () => {
    const mockMediaQuery = mockMatchMedia(false);

    renderHook(() => useReducedMotion());

    expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
  });

  it("should use fallback listener for older browsers", () => {
    const mockMediaQuery = {
      matches: false,
      addEventListener: undefined,
      removeEventListener: undefined,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    };

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockReturnValue(mockMediaQuery),
    });

    renderHook(() => useReducedMotion());

    expect(mockMediaQuery.addListener).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });

  it("should cleanup event listeners on unmount", () => {
    const mockMediaQuery = mockMatchMedia(false);

    const { unmount } = renderHook(() => useReducedMotion());

    unmount();

    expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
  });

  it("should cleanup fallback listeners on unmount", () => {
    const mockMediaQuery = {
      matches: false,
      addEventListener: undefined,
      removeEventListener: undefined,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    };

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockReturnValue(mockMediaQuery),
    });

    const { unmount } = renderHook(() => useReducedMotion());

    unmount();

    expect(mockMediaQuery.removeListener).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });
});
