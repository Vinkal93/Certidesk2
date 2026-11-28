import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string | undefined;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, helperText, error, options, placeholder, id, className, required, ...props },
  ref
) {
  const generatedId = React.useId();
  const selectId = id ?? generatedId;
  const errorId = error ? `${selectId}-error` : undefined;
  const helperId = helperText && !error ? `${selectId}-helper` : undefined;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="text-foreground block text-sm font-medium">
          {label}
          {required && (
            <span className="text-danger ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId ?? helperId}
          className={cn(
            "bg-background text-foreground flex h-10 w-full cursor-pointer appearance-none rounded-lg border py-2 pr-9 pl-3 text-sm shadow-2xs transition-all duration-150",
            "focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-3 focus-visible:outline-none",
            "disabled:bg-surface disabled:cursor-not-allowed disabled:opacity-60",
            error
              ? "border-danger focus-visible:ring-danger/20"
              : "border-border hover:border-primary/60 hover:bg-surface/40",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="text-muted pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
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
