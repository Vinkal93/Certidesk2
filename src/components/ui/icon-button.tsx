import * as React from "react";
import { Button, type ButtonProps } from "./button";

export interface IconButtonProps extends Omit<
  ButtonProps,
  "size" | "leftIcon" | "rightIcon"
> {
  "aria-label": string;
  size?: "sm" | "md" | "lg";
}

const iconButtonSizeMap: Record<NonNullable<IconButtonProps["size"]>, string> = {
  sm: "h-8 w-8 p-0",
  md: "h-10 w-10 p-0",
  lg: "h-11 w-11 p-0",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ size = "md", className, children, ...props }, ref) {
    return (
      <Button
        ref={ref}
        size="icon"
        className={
          className ? `${iconButtonSizeMap[size]} ${className}` : iconButtonSizeMap[size]
        }
        {...props}
      >
        {children}
      </Button>
    );
  }
);
