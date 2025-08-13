import * as React from "react";
import { cn } from "@/utils/utils";
import { Input as ShadcnInput } from "./input";
import { Textarea } from "./textarea";

type CommonInputProps = {
  className?: string;
  error?: boolean;
};

type InputElementProps = CommonInputProps &
  React.ComponentProps<"input"> & {
    as?: "input";
  };

type TextareaElementProps = CommonInputProps &
  React.ComponentProps<"textarea"> & {
    as: "textarea";
  };

type SelectElementProps = CommonInputProps &
  React.ComponentProps<"select"> & {
    as: "select";
    children?: React.ReactNode;
  };

type UnifiedInputProps =
  | InputElementProps
  | TextareaElementProps
  | SelectElementProps;

const UnifiedInput = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  UnifiedInputProps
>(({ className, as = "input", error, ...props }, ref) => {
  const errorStyles = error ? "border-destructive focus:ring-destructive" : "";

  if (as === "textarea") {
    const textareaProps = props as React.ComponentProps<"textarea">;
    return (
      <Textarea
        className={cn(errorStyles, className)}
        ref={ref as React.Ref<HTMLTextAreaElement>}
        {...textareaProps}
      />
    );
  }

  if (as === "select") {
    const selectProps = props as React.ComponentProps<"select"> & {
      children?: React.ReactNode;
    };
    const { children, ...restSelectProps } = selectProps;

    // For basic select elements, we'll use a native select with Shadcn styling
    // This maintains backward compatibility with existing usage
    return (
      <select
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          errorStyles,
          className
        )}
        ref={ref as React.Ref<HTMLSelectElement>}
        {...restSelectProps}
      >
        {children}
      </select>
    );
  }

  // Default to input
  const inputProps = props as React.ComponentProps<"input">;
  return (
    <ShadcnInput
      className={cn(errorStyles, className)}
      ref={ref as React.Ref<HTMLInputElement>}
      {...inputProps}
    />
  );
});

UnifiedInput.displayName = "UnifiedInput";

export { UnifiedInput };
