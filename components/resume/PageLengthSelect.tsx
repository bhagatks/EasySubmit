"use client";

import {
  DEFAULT_PAGE_LENGTH_PREFERENCE,
  PAGE_LENGTH_OPTIONS,
  type PageLengthPreference,
} from "@/lib/resume/page-length-preference";
import { studioSelectClass, studioSelectStyle } from "@/lib/resume/studio-field-styles";
import { cn } from "@/lib/utils";

type PageLengthSelectProps = {
  value: PageLengthPreference;
  onChange: (value: PageLengthPreference) => void;
  autoRecommendation: string;
  resolvedPages: 1 | 2;
  renderedPageCount?: number;
  layout?: "stacked";
  variant?: "onboarding" | "dashboard";
  monoClass?: string;
  className?: string;
  selectClassName?: string;
  hintClassName?: string;
};

export function PageLengthSelect({
  value,
  onChange,
  autoRecommendation,
  resolvedPages,
  renderedPageCount,
  variant = "dashboard",
  monoClass,
  className,
  selectClassName,
  hintClassName,
}: PageLengthSelectProps) {
  const selectId = "resume-page-length-select";
  const normalizedValue = value ?? DEFAULT_PAGE_LENGTH_PREFERENCE;
  const previewNote =
    renderedPageCount === undefined
      ? null
      : renderedPageCount > resolvedPages
        ? `Preview currently fills ${renderedPageCount} pages — trim content or switch to ${renderedPageCount} pages.`
        : renderedPageCount < resolvedPages
          ? `Preview fills ${renderedPageCount} page${renderedPageCount === 1 ? "" : "s"}.`
          : `Preview fills ${renderedPageCount} page${renderedPageCount === 1 ? "" : "s"}.`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <select
        id={selectId}
        value={normalizedValue}
        onChange={(event) => onChange(event.target.value as PageLengthPreference)}
        className={studioSelectClass(variant, selectClassName)}
        style={studioSelectStyle(variant)}
        aria-label="Resume length"
      >
        {PAGE_LENGTH_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <p className={cn("mt-1.5", hintClassName)}>
        {normalizedValue === "auto"
          ? `Auto recommends ${autoRecommendation}.`
          : `Using ${resolvedPages}-page bullet and role budgets.`}
      </p>
      {previewNote ? (
        <p
          className={cn(
            monoClass,
            "text-[11px] leading-snug",
            renderedPageCount !== undefined && renderedPageCount > resolvedPages
              ? "text-amber-600 dark:text-amber-300"
              : hintClassName,
          )}
        >
          {previewNote}
        </p>
      ) : null}
    </div>
  );
}
