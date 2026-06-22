"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const REVIEW_PREVIEW_CHROME_STYLE: CSSProperties = {
  backgroundColor: "oklch(0.16 0.04 268 / 0.92)",
  borderColor: "oklch(0.62 0.21 265 / 0.45)",
  color: "oklch(0.98 0.01 268)",
};

type ReviewPreviewChromeButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
  title?: string;
  className?: string;
  /** Square icon-only control (zoom). */
  iconOnly?: boolean;
};

export function ReviewPreviewChromeButton({
  children,
  disabled = false,
  href,
  onClick,
  title,
  className,
  iconOnly = false,
}: ReviewPreviewChromeButtonProps) {
  const sharedClass = cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border shadow-md backdrop-blur-sm transition-colors",
    "hover:border-[oklch(0.62_0.21_265_/_0.55)] hover:bg-[oklch(0.22_0.04_268/0.96)]",
    iconOnly ? "h-8 w-8" : "h-8 px-2.5 text-xs font-medium no-underline",
    disabled && "pointer-events-none opacity-45",
    className,
  );

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={sharedClass}
        style={REVIEW_PREVIEW_CHROME_STYLE}
        title={title}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={sharedClass}
      style={REVIEW_PREVIEW_CHROME_STYLE}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}
