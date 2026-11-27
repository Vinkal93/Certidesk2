"use client";

import * as React from "react";
import { Laptop, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme, type ThemeMode } from "./theme-provider";

const modes: Array<{ value: ThemeMode; label: string; Icon: typeof Sun }> = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Laptop },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const ActiveIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Theme: ${theme}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="border-border bg-background text-foreground hover:bg-surface inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium shadow-xs transition-colors"
      >
        <ActiveIcon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden capitalize sm:inline">{theme}</span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Select theme"
          className="border-border bg-background absolute right-0 z-50 mt-2 w-36 rounded-xl border p-1.5 shadow-lg"
        >
          {modes.map(({ value, label, Icon }) => {
            const selected = theme === value;
            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                  selected
                    ? "bg-primary-soft text-primary font-semibold"
                    : "text-foreground hover:bg-surface"
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
