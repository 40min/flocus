import React from "react";
import { cn } from "../../utils/utils";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface AnimatedContainerProps {
  children: React.ReactNode;
  className?: string;
  isVisible?: boolean;
  animation?: "fade" | "slide-up" | "slide-down" | "scale" | "bounce";
  duration?: "fast" | "normal" | "slow";
  delay?: "none" | "short" | "medium" | "long";
}

const animationClasses = {
  fade: "animate-in fade-in",
  "slide-up": "animate-in slide-in-from-bottom",
  "slide-down": "animate-in slide-in-from-top",
  scale: "animate-in zoom-in",
  bounce: "animate-bounce",
};

const durationClasses = {
  fast: "duration-150",
  normal: "duration-300",
  slow: "duration-500",
};

const delayClasses = {
  none: "",
  short: "delay-75",
  medium: "delay-150",
  long: "delay-300",
};

/**
 * A container component that provides smooth animations for its children
 * Uses Tailwind's animate-in utilities for accessibility-friendly animations
 */
export const AnimatedContainer: React.FC<AnimatedContainerProps> = ({
  children,
  className,
  isVisible = true,
  animation = "fade",
  duration = "normal",
  delay = "none",
}) => {
  const prefersReducedMotion = useReducedMotion();

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        // Only apply animations if user doesn't prefer reduced motion
        !prefersReducedMotion && [
          animationClasses[animation],
          durationClasses[duration],
          delayClasses[delay],
        ],
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * A specialized component for highlighting content with a subtle glow effect
 */
interface HighlightContainerProps {
  children: React.ReactNode;
  isHighlighted: boolean;
  className?: string;
  color?: "green" | "blue" | "yellow" | "red";
}

const highlightColors = {
  green: [
    "ring-green-400",
    "ring-opacity-75",
    "bg-green-50",
    "border-green-300",
  ],
  blue: ["ring-blue-400", "ring-opacity-75", "bg-blue-50", "border-blue-300"],
  yellow: [
    "ring-yellow-400",
    "ring-opacity-75",
    "bg-yellow-50",
    "border-yellow-300",
  ],
  red: ["ring-red-400", "ring-opacity-75", "bg-red-50", "border-red-300"],
};

export const HighlightContainer: React.FC<HighlightContainerProps> = ({
  children,
  isHighlighted,
  className,
  color = "green",
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        isHighlighted && [
          "ring-2",
          // Only animate if user doesn't prefer reduced motion
          !prefersReducedMotion && "animate-pulse",
          ...highlightColors[color],
        ],
        className
      )}
    >
      {children}
    </div>
  );
};
