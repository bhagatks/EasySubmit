"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type StudioIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "onboarding" | "dashboard";
  /** `overlay` matches preview zoom controls; `bordered` matches layout toolbar buttons. */
  tone?: "overlay" | "bordered";
};

export function StudioIconButton({
  children,
  variant = "dashboard",
  tone = "bordered",
  className,
  type = "button",
  ...props
}: StudioIconButtonProps) {
  const isOnboarding = variant === "onboarding";

  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed",
        tone === "overlay"
          ? cn(
              "disabled:opacity-40",
              isOnboarding
                ? "bg-[oklch(0.12_0.03_268/0.55)] text-[oklch(0.98_0.01_268)] backdrop-blur-sm hover:bg-[oklch(0.12_0.03_268/0.75)]"
                : "bg-background/55 text-foreground backdrop-blur-sm hover:bg-background/75",
            )
          : cn(
              "border disabled:opacity-50",
              isOnboarding
                ? "border-white/10 bg-white/[0.04] text-[oklch(0.98_0.01_268)] hover:border-[oklch(0.62_0.21_265_/_0.35)]"
                : "border-border bg-surface text-foreground hover:border-mint/40",
            ),
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
