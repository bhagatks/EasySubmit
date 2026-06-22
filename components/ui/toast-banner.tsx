"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastBannerProps = {
  message: string;
  /** Auto-dismiss after ms (default 8000). Set 0 to disable. */
  durationMs?: number;
  onDismiss?: () => void;
  className?: string;
};

export function ToastBanner({
  message,
  durationMs = 8000,
  onDismiss,
  className,
}: ToastBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!durationMs || durationMs <= 0) return;
    const id = window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, durationMs);
    return () => window.clearTimeout(id);
  }, [durationMs, onDismiss]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground shadow-sm",
        className,
      )}
    >
      <p className="min-w-0 flex-1 leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          onDismiss?.();
        }}
        className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-surface/80 hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
