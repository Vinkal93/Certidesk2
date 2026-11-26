"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "Tu", "Th", "Fr", "Sa"];
const WEEKDAYS_CLEAN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isInRange(d: Date, from: Date | null, to: Date | null): boolean {
  if (!from || !to) return false;
  const t = startOfDay(d).getTime();
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return t >= Math.min(a, b) && t <= Math.max(a, b);
}

function formatShort(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MonthGrid({
  monthDate,
  selectedStart,
  selectedEnd,
  onSelectDate,
}: {
  monthDate: Date;
  selectedStart: Date | null;
  selectedEnd: Date | null;
  onSelectDate: (d: Date) => void;
}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = startOfDay(new Date());

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  return (
    <div className="w-[248px]">
      <div className="text-foreground mb-3 text-center text-sm font-medium">
        {monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      </div>
      <div className="text-muted-foreground mb-1.5 grid grid-cols-7 text-center text-xs font-medium">
        {WEEKDAYS_CLEAN.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={`empty_${idx}`} className="h-8" />;
          const isStart = isSameDay(cell, selectedStart);
          const isEnd = isSameDay(cell, selectedEnd);
          const inRange = isInRange(cell, selectedStart, selectedEnd);
          const isToday = isSameDay(cell, today);

          return (
            <button
              key={cell.toISOString()}
              type="button"
              onClick={() => onSelectDate(cell)}
              className={cn(
                "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors",
                isStart || isEnd
                  ? "bg-slate-900 font-semibold text-white"
                  : inRange
                    ? "rounded-none bg-slate-100 text-slate-900"
                    : isToday
                      ? "bg-slate-100 font-semibold text-slate-900"
                      : "text-slate-700 hover:bg-slate-100"
              )}
            >
              {cell.getDate()}
              {isToday && !isStart && !isEnd && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-slate-900" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Single-date calendar picker (1 month view) matching the rounded popover design.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
}: {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Date | null>(value);
  const [viewMonth, setViewMonth] = React.useState<Date>(value ?? new Date());

  const shiftMonth = (delta: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setOpen((o) => !o);
        }}
        className="border-border bg-card text-foreground hover:bg-surface inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm shadow-xs"
      >
        <CalendarIcon className="text-muted-foreground h-4 w-4" />
        <span>{value ? formatShort(value) : placeholder}</span>
      </button>

      {open && (
        <div className="border-border absolute left-0 z-50 mt-2 rounded-2xl border bg-white p-4 shadow-xl">
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
              className="absolute top-0 left-0 rounded-full p-1 text-slate-500 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <MonthGrid
              monthDate={viewMonth}
              selectedStart={draft}
              selectedEnd={draft}
              onSelectDate={(d) => setDraft(d)}
            />
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
              className="absolute top-0 right-0 rounded-full p-1 text-slate-500 hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="border-border mt-4 flex items-center justify-between border-t pt-3">
            <span className="text-muted-foreground text-xs">
              {draft ? formatShort(draft) : "No date"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft(value);
                  setOpen(false);
                }}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(draft);
                  setOpen(false);
                }}
                className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Dual-calendar Date Range Picker with preset sidebar matching Image 1.
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder = "Select date range",
  className,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange>(value);
  const [activePreset, setActivePreset] = React.useState<string>("This month");
  const now = new Date();
  const [leftMonth, setLeftMonth] = React.useState<Date>(
    new Date(now.getFullYear(), now.getMonth() - 1, 1)
  );

  const rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1);

  const presets: { label: string; getRange: () => DateRange }[] = [
    {
      label: "Today",
      getRange: () => {
        const t = startOfDay(new Date());
        return { from: t, to: t };
      },
    },
    {
      label: "Yesterday",
      getRange: () => {
        const y = startOfDay(new Date());
        y.setDate(y.getDate() - 1);
        return { from: y, to: y };
      },
    },
    {
      label: "Last 7 days",
      getRange: () => {
        const end = startOfDay(new Date());
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        return { from: start, to: end };
      },
    },
    {
      label: "Last 30 days",
      getRange: () => {
        const end = startOfDay(new Date());
        const start = new Date(end);
        start.setDate(start.getDate() - 29);
        return { from: start, to: end };
      },
    },
    {
      label: "This month",
      getRange: () => {
        const n = new Date();
        return {
          from: new Date(n.getFullYear(), n.getMonth(), 1),
          to: new Date(n.getFullYear(), n.getMonth() + 1, 0),
        };
      },
    },
    {
      label: "Last month",
      getRange: () => {
        const n = new Date();
        return {
          from: new Date(n.getFullYear(), n.getMonth() - 1, 1),
          to: new Date(n.getFullYear(), n.getMonth(), 0),
        };
      },
    },
    {
      label: "This quarter",
      getRange: () => {
        const n = new Date();
        const qStart = Math.floor(n.getMonth() / 3) * 3;
        return {
          from: new Date(n.getFullYear(), qStart, 1),
          to: new Date(n.getFullYear(), qStart + 3, 0),
        };
      },
    },
    {
      label: "Year to date",
      getRange: () => {
        const n = new Date();
        return {
          from: new Date(n.getFullYear(), 0, 1),
          to: startOfDay(n),
        };
      },
    },
  ];

  const handleSelectDate = (d: Date) => {
    setActivePreset("");
    if (!draft.from || (draft.from && draft.to)) {
      setDraft({ from: d, to: null });
    } else {
      if (d.getTime() < draft.from.getTime()) {
        setDraft({ from: d, to: draft.from });
      } else {
        setDraft({ from: draft.from, to: d });
      }
    }
  };

  const shiftMonths = (delta: number) => {
    setLeftMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const footerLabel =
    draft.from && draft.to
      ? `${formatShort(draft.from)} – ${formatShort(draft.to)}`
      : draft.from
        ? formatShort(draft.from)
        : "No dates";

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setOpen((o) => !o);
        }}
        className="border-border bg-card text-foreground hover:bg-surface inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm shadow-xs"
      >
        <CalendarIcon className="text-muted-foreground h-4 w-4" />
        <span>
          {value.from && value.to
            ? `${formatShort(value.from)} – ${formatShort(value.to)}`
            : placeholder}
        </span>
      </button>

      {open && (
        <div className="border-border absolute left-0 z-50 mt-2 w-[720px] max-w-[95vw] overflow-hidden rounded-2xl border bg-white shadow-xl">
          <div className="flex flex-col md:flex-row">
            {/* Left Presets */}
            <div className="border-border w-full border-b p-3 md:w-44 md:border-r md:border-b-0">
              <div className="flex flex-wrap gap-1 md:flex-col">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setActivePreset(p.label);
                      setDraft(p.getRange());
                    }}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-left text-xs font-medium transition-colors",
                      activePreset === p.label
                        ? "bg-slate-100 font-semibold text-slate-900"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dual Calendars */}
            <div className="flex-1 p-4">
              <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => shiftMonths(-1)}
                  className="absolute top-0 left-0 rounded-full p-1 text-slate-500 hover:bg-slate-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <MonthGrid
                  monthDate={leftMonth}
                  selectedStart={draft.from}
                  selectedEnd={draft.to}
                  onSelectDate={handleSelectDate}
                />
                <MonthGrid
                  monthDate={rightMonth}
                  selectedStart={draft.from}
                  selectedEnd={draft.to}
                  onSelectDate={handleSelectDate}
                />
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => shiftMonths(1)}
                  className="absolute top-0 right-0 rounded-full p-1 text-slate-500 hover:bg-slate-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="border-border flex items-center justify-between border-t px-5 py-3">
            <span className="text-xs font-medium text-slate-700">{footerLabel}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft(value);
                  setOpen(false);
                }}
                className="rounded-full px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!draft.from}
                onClick={() => {
                  onChange(draft);
                  setOpen(false);
                }}
                className="rounded-full bg-slate-400 px-5 py-1.5 text-xs font-medium text-white enabled:bg-slate-900 enabled:hover:bg-slate-800"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Keep unused WEEKDAYS exported only if needed, avoiding lint warnings
void WEEKDAYS;
