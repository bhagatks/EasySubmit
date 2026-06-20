import { cn } from "@/lib/utils";

export type InlineAlertVariant = "error" | "warning" | "info";

const variantClass: Record<InlineAlertVariant, string> = {
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
  info: "border-primary/30 bg-primary/10 text-foreground",
};

type InlineAlertProps = {
  children: React.ReactNode;
  variant?: InlineAlertVariant;
  className?: string;
};

/** Inline status banner — same styling as AI Keys error blocks. */
export function InlineAlert({
  children,
  variant = "error",
  className,
}: InlineAlertProps) {
  return (
    <p
      role="alert"
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        variantClass[variant],
        className,
      )}
    >
      {children}
    </p>
  );
}
