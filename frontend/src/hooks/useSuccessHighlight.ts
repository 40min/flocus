import { useState, useEffect, useRef } from "react";

/**
 * Hook to manage success highlight animations for task updates
 * Shows a brief highlight when an operation completes successfully
 */
export const useSuccessHighlight = () => {
  const [isHighlighted, setIsHighlighted] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerHighlight = () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsHighlighted(true);

    // Remove highlight after animation duration
    timeoutRef.current = setTimeout(() => {
      setIsHighlighted(false);
    }, 1000); // 1 second highlight duration
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isHighlighted,
    triggerHighlight,
  };
};
