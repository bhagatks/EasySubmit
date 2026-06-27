"use client";

import { MONTH_OPTIONS } from "@/lib/resume/dates";
import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-[oklch(0.98_0.01_268)] placeholder:text-[oklch(0.45_0.02_268)] transition-colors focus:border-[oklch(0.62_0.21_265_/_0.5)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.62_0.21_265_/_0.35)]";

type DateRangeFieldsProps = {
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  onStartMonthChange: (value: string) => void;
  onStartYearChange: (value: string) => void;
  onEndMonthChange: (value: string) => void;
  onEndYearChange: (value: string) => void;
  monoClass: string;
  compact?: boolean;
  startYearError?: boolean;
};

export function DateRangeFields({
  startMonth,
  startYear,
  endMonth,
  endYear,
  onStartMonthChange,
  onStartYearChange,
  onEndMonthChange,
  onEndYearChange,
  monoClass,
  compact = false,
  startYearError = false,
}: DateRangeFieldsProps) {
  const startYearClass = cn(
    INPUT_CLASS,
    startYearError &&
      "border-[oklch(0.55_0.22_25_/_0.65)] focus:border-[oklch(0.55_0.22_25)] focus:ring-[oklch(0.55_0.22_25_/_0.35)]",
  );

  return (
    <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
      <fieldset className="space-y-1.5">
        <legend
          className={cn(
            monoClass,
            "text-[9px] font-medium uppercase tracking-[0.14em] text-[oklch(0.45_0.02_268)]",
          )}
        >
          Start
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={startMonth}
            onChange={(event) => onStartMonthChange(event.target.value)}
            autoComplete="off"
            className={INPUT_CLASS}
            aria-label="Start month"
          >
            {MONTH_OPTIONS.map((option) => (
              <option key={option.value || "blank"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            value={startYear}
            onChange={(event) => onStartYearChange(event.target.value)}
            autoComplete="off"
            inputMode="numeric"
            maxLength={4}
            placeholder="YYYY"
            className={startYearClass}
            aria-label="Start year"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-1.5">
        <legend
          className={cn(
            monoClass,
            "text-[9px] font-medium uppercase tracking-[0.14em] text-[oklch(0.45_0.02_268)]",
          )}
        >
          End
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={endMonth}
            onChange={(event) => onEndMonthChange(event.target.value)}
            autoComplete="off"
            className={INPUT_CLASS}
            aria-label="End month"
          >
            {MONTH_OPTIONS.map((option) => (
              <option key={`end-${option.value || "blank"}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            value={endYear}
            onChange={(event) => onEndYearChange(event.target.value)}
            autoComplete="off"
            inputMode="text"
            maxLength={7}
            placeholder="YYYY or Present"
            className={INPUT_CLASS}
            aria-label="End year"
          />
        </div>
      </fieldset>
    </div>
  );
}
