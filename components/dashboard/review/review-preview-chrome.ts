import { cn } from "@/lib/utils";

/** Filled chrome — zoom + toolbar on the preview. */
export const REVIEW_PREVIEW_CHROME = cn(
  "border-[oklch(0.62_0.21_265_/_0.45)]",
  "bg-[oklch(0.16_0.04_268/0.92)]",
  "text-[oklch(0.98_0.01_268)]",
  "shadow-md backdrop-blur-sm",
);

export const REVIEW_PREVIEW_CHROME_HOVER =
  "hover:bg-[oklch(0.22_0.04_268/0.96)] hover:border-[oklch(0.62_0.21_265_/_0.55)]";

export const REVIEW_PREVIEW_CHROME_DISABLED = cn(
  "border-white/10 bg-[oklch(0.16_0.04_268/0.55)] text-muted-foreground",
  "cursor-not-allowed opacity-50",
);

export function reviewPreviewFilledButtonClass(disabled = false): string {
  if (disabled) return REVIEW_PREVIEW_CHROME_DISABLED;
  return cn(
    REVIEW_PREVIEW_CHROME,
    REVIEW_PREVIEW_CHROME_HOVER,
    "transition-colors",
  );
}
