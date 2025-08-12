import React from "react";
import { UnifiedInput } from "./ui/unified-input";

type CommonInputProps = {
  className?: string;
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

type InputProps = InputElementProps | TextareaElementProps | SelectElementProps;

const Input = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  InputProps
>((props, ref) => {
  return <UnifiedInput {...props} ref={ref} />;
});

Input.displayName = "Input";

export default Input;
