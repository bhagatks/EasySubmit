"use client";

import {
  DEFAULT_PAGE_LENGTH_PREFERENCE,
  type PageLengthPreference,
} from "@/lib/resume/page-length-preference";
import {
  resumeLengthOptionsForRules,
  type ResumeLengthSelectValue,
} from "@/lib/resume/resume-length-select-options";
import { studioSelectClass, studioSelectStyle } from "@/lib/resume/studio-field-styles";
import { cn } from "@/lib/utils";

type PageLengthSelectProps = {
  value: PageLengthPreference;
  onChange: (value: PageLengthPreference) => void;
  autoRecommendation: string;
  resolvedPages: 1 | 2;
  renderedPageCount?: number;
  rulesV2Enabled?: boolean;
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
  rulesV2Enabled = false,
  variant = "dashboard",
  monoClass,
  className,
  selectClassName,
  hintClassName,
}: PageLengthSelectProps) {
  const selectId = "resume-page-length-select";
  const normalizedValue = value ?? DEFAULT_PAGE_LENGTH_PREFERENCE;
  const options = resumeLengthOptionsForRules(rulesV2Enabled);
  const previewNote =
    renderedPageCount === undefined
      ? null
      : renderedPageCount > resolvedPages
        ? `Preview currently fills ${renderedPageCount} pages — trim content or switch to ${renderedPageCount} pages.`
        : renderedPageCount < resolvedPages
          ? `Preview fills ${renderedPageCount} page${renderedPageCount === 1 ? "" : "s"}.`
          : `Preview fills ${renderedPageCount} page${renderedPageCount === 1 ? "" : "s"}.`;

  const hintText = rulesV2Enabled
    ? normalizedValue === "4+"
      ? "Using RULES v2 page mode 4+ — no content limits; ATS parse risk warning shown in Review."
      : normalizedValue === "2"
        ? "Using RULES v2 page mode 2 — conservative ATS budget with category skills and tier bullet limits."
        : `Using RULES v2 page mode ${normalizedValue} — ${options.find((option) => option.id === normalizedValue)?.description ?? "profile active"}.`
    : normalizedValue === "auto"
      ? `Auto recommends ${autoRecommendation}.`
      : `Using ${resolvedPages}-page bullet and role budgets.`;

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
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <p className={cn("mt-1.5", hintClassName)}>{hintText}</p>
      {rulesV2Enabled && "description" in (options[0] ?? {}) ? (
        <p className={cn("text-[11px] leading-snug", hintClassName)}>
          {(options.find((option) => option.id === normalizedValue) as { description?: string })
            ?.description ?? ""}
        </p>
      ) : null}
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

export type { ResumeLengthSelectValue };
