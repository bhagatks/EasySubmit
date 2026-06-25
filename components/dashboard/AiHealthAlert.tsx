"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { AiHealthDebugSnapshot, AiHealthStatus } from "@/lib/ai/ai-health-status";
import { SETTINGS_AI_AUTO_HREF } from "@/lib/dashboard/settings-ai-links";

const HINT: Record<string, string> = {
  quota_exhausted: "Daily AI quota used up — add your API key in Settings",
  key_missing: "Add your API key in AI Keys to continue",
  key_invalid: "Your API key is failing — verify it in AI Keys",
  api_error: "AI calls are failing — check Settings",
};

type AiHealthContextValue = {
  status: AiHealthStatus | null;
};

const AiHealthContext = createContext<AiHealthContextValue>({ status: null });

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

export function AiHealthAlertProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<AiHealthStatus | null>(null);
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
    logClient("render.state", {
      statusLoaded: status !== null,
      ok: status?.ok ?? null,
      code: status && !status.ok ? status.code : null,
      willShowAlert: Boolean(status && !status.ok),
    });
  }, [status]);

  return (
    <AiHealthContext.Provider value={{ status }}>{children}</AiHealthContext.Provider>
  );
}

function useAiHealthStatus() {
  return useContext(AiHealthContext).status;
}

/** Pulsing alert icon — sits in the header icon row. */
export function AiHealthAlertIcon() {
  const status = useAiHealthStatus();

  if (!status || status.ok) return null;

  const message = status.message.trim() || HINT[status.code] || "AI issue detected";

  return (
    <div
      className="relative flex h-8 w-8 items-center justify-center rounded-full"
      aria-label={`AI health alert: ${message}`}
      title={message}
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
    </div>
  );
}

/** Expanded issue copy — renders below the header icon row when unhealthy. */
export function AiHealthAlertBanner() {
  const status = useAiHealthStatus();

  if (!status || status.ok) return null;

  const message = status.message.trim() || HINT[status.code] || "AI issue detected";
  const fixHref =
    status.code === "key_missing" || status.code === "key_invalid"
      ? "/dashboard/keys"
      : SETTINGS_AI_AUTO_HREF;
  const fixLabel = fixHref === "/dashboard/keys" ? "AI Keys" : "Settings";

  return (
    <div
      role="alert"
      className="flex justify-end border-t border-destructive/15 bg-destructive/5 px-4 py-2"
    >
      <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 sm:w-auto">
        <p className="min-w-0 flex-1 text-xs leading-snug text-foreground">{message}</p>
        <Link
          href={fixHref}
          className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Fix in {fixLabel}
        </Link>
      </div>
    </div>
  );
}
