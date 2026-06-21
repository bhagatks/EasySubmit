import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type InlineAlertVariant = "error" | "warning" | "info";
export type InlineAlertSurface = "default" | "glass";

const variantClass: Record<InlineAlertVariant, string> = {
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
  info: "border-primary/30 bg-primary/10 text-foreground",
};

const glassVariantClass: Record<InlineAlertVariant, string> = {
  error:
    "border-[oklch(0.65_0.2_25_/_0.35)] bg-[oklch(0.65_0.2_25_/_0.1)] text-[oklch(0.98_0.01_268)]",
  warning:
    "border-amber-500/35 bg-amber-500/10 text-amber-100",
  info: "border-primary/35 bg-primary/10 text-[oklch(0.98_0.01_268)]",
};

type InlineAlertProps = {
  children: ReactNode;
  variant?: InlineAlertVariant;
  /** `glass` for dark onboarding / login panels. */
  surface?: InlineAlertSurface;
  className?: string;
};

/** Inline status banner — shared across login, onboarding, and dashboard. */
export function InlineAlert({
  children,
  variant = "error",
  surface = "default",
  className,
}: InlineAlertProps) {
  const palette = surface === "glass" ? glassVariantClass : variantClass;

  return (
    <p
      role="alert"
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        palette[variant],
        className,
      )}
    >
      {children}
    </p>
  );
}
