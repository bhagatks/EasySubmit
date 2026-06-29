import { cn } from "@/lib/utils";

/** Matches RefineryPanel `INPUT_CLASS` — keep select fields visually aligned with editor inputs. */
export const STUDIO_INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-[oklch(0.98_0.01_268)] placeholder:text-[oklch(0.45_0.02_268)] transition-colors focus:border-[oklch(0.62_0.21_265_/_0.5)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.62_0.21_265_/_0.35)]";

/** Red border for mandatory validation failures — onboarding, profile, and job review Studio. */
export const STUDIO_FIELD_ERROR_CLASS =
  "border-[oklch(0.55_0.22_25_/_0.65)] focus:border-[oklch(0.55_0.22_25)] focus:ring-[oklch(0.55_0.22_25_/_0.35)]";

export const STUDIO_SECTION_ERROR_CLASS =
  "border-[oklch(0.55_0.22_25_/_0.55)] ring-1 ring-[oklch(0.55_0.22_25_/_0.25)]";

export function studioInputClass(baseClass: string, hasBlockingError: boolean): string {
  return cn(baseClass, hasBlockingError && STUDIO_FIELD_ERROR_CLASS);
}

const SELECT_CHEVRON =
  "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")";

const SELECT_CHEVRON_ONBOARDING =
  "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")";

export function studioSelectClass(
  variant: "onboarding" | "dashboard" = "dashboard",
  extra?: string,
): string {
  return cn(
    STUDIO_INPUT_CLASS,
    "appearance-none bg-[length:1rem_1rem] bg-[position:right_0.75rem_center] bg-no-repeat pr-10",
    extra,
  );
}

export function studioSelectStyle(
  variant: "onboarding" | "dashboard" = "dashboard",
): { backgroundImage: string } {
  return {
    backgroundImage: variant === "onboarding" ? SELECT_CHEVRON_ONBOARDING : SELECT_CHEVRON,
  };
}

export function studioFieldHintClass(variant: "onboarding" | "dashboard" = "dashboard"): string {
  return variant === "onboarding"
    ? "text-xs leading-relaxed text-[oklch(0.62_0.02_268)]"
    : "text-xs leading-relaxed text-muted-foreground";
}
