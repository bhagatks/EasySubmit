"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { AiHealthDebugSnapshot, AiHealthStatus } from "@/lib/ai/ai-health-status";

const HINT: Record<string, string> = {
  quota_exhausted: "Daily AI quota used up — add your API key in Settings",
  key_missing: "Add your API key in AI Keys to continue",
  key_invalid: "Your API key is failing — verify it in AI Keys",
  api_error: "AI calls are failing — check Settings",
};

function logClient(event: string, payload?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  if (payload) {
    console.log("[AiHealth:client]", event, payload);
    return;
  }
  console.log("[AiHealth:client]", event);
}

async function fetchAiHealthStatus(): Promise<{
  status: AiHealthStatus;
  httpStatus: number;
  debug?: AiHealthDebugSnapshot;
}> {
  const res = await fetch("/api/user/ai-health", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) {
    return { status: { ok: true }, httpStatus: res.status };
  }
  const payload = (await res.json()) as AiHealthStatus & { _debug?: AiHealthDebugSnapshot };
  const { _debug, ...status } = payload;
  return { status, httpStatus: res.status, debug: _debug };
}

export function AiHealthAlert() {
  const pathname = usePathname();
  const [status, setStatus] = useState<AiHealthStatus | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const refreshRequestId = useRef(0);

  const refresh = useCallback(async (trigger: string) => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      logClient("refresh.skipped_hidden", { trigger });
      return;
    }

    const requestId = ++refreshRequestId.current;
    logClient("refresh.start", { trigger, requestId });

    try {
      const { status: next, httpStatus, debug } = await fetchAiHealthStatus();
      logClient("refresh.response", {
        trigger,
        requestId,
        httpStatus,
        ok: next.ok,
        code: next.ok ? null : next.code,
        message: next.ok ? null : next.message,
        debugReason: debug?.reason ?? null,
        debug,
      });
      if (requestId === refreshRequestId.current) {
        setStatus(next);
        logClient("refresh.applied", {
          trigger,
          willShowAlert: !next.ok,
        });
      }
    } catch (error) {
      logClient("refresh.error", {
        trigger,
        requestId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  useEffect(() => {
    void refresh("mount");

    function onResume(eventType: string) {
      if (document.visibilityState !== "visible") return;
      void refresh(eventType);
    }

    const onVisibility = () => onResume("visibilitychange");
    const onFocus = () => onResume("focus");
    const onPageShow = () => onResume("pageshow");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    const timer = window.setInterval(() => void refresh("interval"), 60_000);

    return () => {
      refreshRequestId.current += 1;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      window.clearInterval(timer);
    };
  }, [pathname, refresh]);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  useEffect(() => {
    logClient("render.state", {
      statusLoaded: status !== null,
      ok: status?.ok ?? null,
      code: status && !status.ok ? status.code : null,
      willShowAlert: Boolean(status && !status.ok),
    });
  }, [status]);

  if (!status || status.ok) return null;

  const hint = HINT[status.code] ?? status.message;
  const fixHref =
    status.code === "key_missing" || status.code === "key_invalid"
      ? "/dashboard/keys"
      : "/dashboard/settings";

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
            href={fixHref}
            onClick={() => setOpen(false)}
            className="inline-flex h-7 items-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Fix in {fixHref === "/dashboard/keys" ? "AI Keys" : "Settings"}
          </Link>
        </div>
      )}
    </div>
  );
}
