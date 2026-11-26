import * as React from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string | undefined;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, helperText, error, id, className, required, rows = 4, ...props },
    ref
  ) {
    const generatedId = React.useId();
    const textareaId = id ?? generatedId;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText && !error ? `${textareaId}-helper` : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-foreground block text-sm font-medium"
          >
            {label}
            {required && (
              <span className="text-danger ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId ?? helperId}
          className={cn(
            "bg-background text-foreground placeholder:text-muted/70 flex min-h-[96px] w-full rounded-lg border px-3 py-2.5 text-sm transition-colors duration-150",
            "focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-0",
            "disabled:bg-surface disabled:cursor-not-allowed disabled:opacity-60",
            error
              ? "border-danger focus-visible:outline-danger"
              : "border-border hover:border-slate-300",
            className
          )}
          {...props}
        />
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
  }
);
