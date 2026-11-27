"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";

export interface FilterDropdownOption<T extends string = string> {
  label: string;
  value: T;
}

export interface FilterDropdownProps<T extends string = string> {
  value: T;
  options: Array<FilterDropdownOption<T>>;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function FilterDropdown<T extends string = string>({
  value,
  options,
  onChange,
  ariaLabel = "Filter option",
  className,
}: FilterDropdownProps<T>) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "bg-background text-foreground inline-flex h-10 min-w-[156px] cursor-pointer items-center justify-between gap-3 rounded-lg border px-3.5 text-sm font-medium shadow-xs transition-all duration-150",
          open
            ? "border-primary ring-primary/15 ring-3"
            : "border-border hover:border-gray-300"
        )}
      >
        <span>{selected?.label ?? value}</span>
        {open ? (
          <ChevronUp className="text-muted h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="text-muted h-4 w-4 shrink-0" aria-hidden="true" />
        )}
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="border-border bg-background absolute right-0 z-40 mt-2 w-full min-w-[172px] rounded-xl border p-1.5 shadow-lg"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    isSelected
                      ? "text-foreground bg-[#f3f4f6] font-medium"
                      : "text-foreground hover:bg-[#f9fafb]"
                  )}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
