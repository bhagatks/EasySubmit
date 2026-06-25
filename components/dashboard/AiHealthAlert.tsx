"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getAiHealthStatus, type AiHealthStatus } from "@/lib/ai/ai-health-status";

const HINT: Record<string, string> = {
  quota_exhausted: "Daily AI quota used up — add your API key in Settings",
  key_invalid: "Your API key is failing — fix it in Settings",
  api_error: "AI calls are failing — check Settings",
};

export function AiHealthAlert() {
  const pathname = usePathname();
  const [status, setStatus] = useState<AiHealthStatus | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void getAiHealthStatus().then(setStatus);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  if (!status || status.ok) return null;

  const hint = HINT[status.code] ?? status.message;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-destructive/10"
        aria-label="AI health alert"
        title={hint}
      >
        <AlertTriangle
          className="h-4 w-4 animate-pulse"
          style={{ color: "oklch(0.55 0.22 25)" }}
          aria-hidden="true"
        />
        <span
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full"
          style={{ background: "oklch(0.55 0.22 25)" }}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-surface p-3 shadow-lg"
          role="dialog"
          aria-label="AI health issue"
        >
          <p className="mb-2 text-xs font-medium" style={{ color: "oklch(0.55 0.22 25)" }}>
            AI issue detected
          </p>
          <p className="mb-3 text-xs text-muted-foreground">{hint}</p>
          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            className="inline-flex h-7 items-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Fix in Settings
          </Link>
        </div>
      )}
    </div>
  );
}
