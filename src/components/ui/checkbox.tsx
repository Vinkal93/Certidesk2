import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: React.ReactNode;
  description?: string;
  error?: string | undefined;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, description, error, id, className, ...props }, ref) {
    const generatedId = React.useId();
    const checkboxId = id ?? generatedId;

    return (
      <div className="space-y-1">
        <label
          htmlFor={checkboxId}
          className="inline-flex cursor-pointer items-start gap-2.5 select-none"
        >
          <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
            <input
              ref={ref}
              id={checkboxId}
              type="checkbox"
              aria-invalid={error ? true : undefined}
              className={cn(
                "peer border-border bg-background h-4 w-4 appearance-none rounded border transition-colors duration-150",
                "checked:border-primary checked:bg-primary",
                "focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                error && "border-danger",
                className
              )}
              {...props}
            />
            <Check
              className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
              strokeWidth={3}
              aria-hidden="true"
            />
          </span>
          {(label || description) && (
            <span className="text-sm leading-snug">
              {label && <span className="text-foreground font-medium">{label}</span>}
              {description && (
                <span className="text-muted block text-xs">{description}</span>
              )}
            </span>
          )}
        </label>
        {error && (
          <p className="text-danger text-xs font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
