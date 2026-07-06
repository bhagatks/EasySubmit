"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type AiOutcomeBannerProps = {
  message: string;
  actionHref?: string | null;
  actionLabel?: string;
  className?: string;
};

export function AiOutcomeBanner({
  message,
  actionHref,
  actionLabel = "Update AI Keys",
  className,
}: AiOutcomeBannerProps) {
  const trimmed = message.trim();
  if (!trimmed) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-200",
        className,
      )}
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p>{trimmed}</p>
        {actionHref ? (
          <Link
            href={actionHref}
            className="mt-1 inline-block font-medium text-primary underline-offset-2 hover:underline"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
