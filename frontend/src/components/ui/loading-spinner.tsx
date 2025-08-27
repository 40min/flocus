import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../utils/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  "aria-label"?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

/**
 * A reusable loading spinner component with consistent styling
 * and accessibility features
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  className,
  "aria-label": ariaLabel = "Loading",
}) => {
  return (
    <Loader2
      className={cn(
        "animate-spin text-blue-500 opacity-75",
        sizeClasses[size],
        className
      )}
      aria-label={ariaLabel}
      role="status"
    />
  );
};

/**
 * A loading overlay component for covering content during loading states
 */
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  spinnerSize?: "sm" | "md" | "lg";
  "aria-label"?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  className,
  spinnerSize = "md",
  "aria-label": ariaLabel = "Loading content",
}) => {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div
          className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg"
          aria-live="polite"
          aria-busy="true"
        >
          <LoadingSpinner size={spinnerSize} aria-label={ariaLabel} />
        </div>
      )}
    </div>
  );
};
