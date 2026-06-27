"use client";

import { cn } from "@/lib/utils";

type ValidationErrorsBannerProps = {
  errors: string[];
  className?: string;
  variant?: "onboarding" | "dashboard";
};

export function ValidationErrorsBanner({
  errors,
  className,
  variant = "onboarding",
}: ValidationErrorsBannerProps) {
  if (errors.length === 0) return null;

  return (
    <div
      className={cn(
        "shrink-0 rounded-xl border px-3 py-2 text-sm",
        variant === "onboarding"
          ? "border-red-500/30 bg-red-500/10 text-red-200"
          : "border-red-500/30 bg-red-500/10 text-red-700",
        className,
      )}
      role="alert"
    >
      <ul className="list-disc space-y-1 pl-4">
        {errors.map((message, index) => (
          <li key={`${index}-${message}`}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
