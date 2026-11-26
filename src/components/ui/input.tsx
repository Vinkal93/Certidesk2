import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string | undefined;
  leftAddon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, error, leftAddon, id, className, required, ...props },
  ref
) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText && !error ? `${inputId}-helper` : undefined;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-foreground block text-sm font-medium">
          {label}
          {required && (
            <span className="text-danger ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <div className="relative flex items-center">
        {leftAddon && (
          <span className="text-muted pointer-events-none absolute left-3 inline-flex items-center">
            {leftAddon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId ?? helperId}
          className={cn(
            "bg-background text-foreground placeholder:text-muted/70 flex h-10 w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-150",
            "focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-0",
            "disabled:bg-surface disabled:cursor-not-allowed disabled:opacity-60",
            error
              ? "border-danger focus-visible:outline-danger"
              : "border-border hover:border-slate-300",
            leftAddon && "pl-9",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p id={errorId} className="text-danger text-xs font-medium" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-muted text-xs">
          {helperText}
        </p>
      )}
    </div>
  );
});
