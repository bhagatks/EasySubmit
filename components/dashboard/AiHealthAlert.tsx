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
import type { AiHealthDebugSnapshot, AiHealthErrorCode, AiHealthStatus } from "@/lib/ai/ai-health-status";
import { SETTINGS_ADD_KEY_HREF, SETTINGS_AI_AUTO_HREF } from "@/lib/dashboard/settings-ai-links";

const HINT: Record<AiHealthErrorCode, string> = {
  quota_exhausted: "Daily AI limit reached — add your API key in AI Keys",
  key_missing: "Add your API key in AI Keys to unlock AI enhancements",
  key_invalid: "Your API key is failing — verify it in AI Keys",
  api_error: "AI calls are failing — check Settings",
  ai_disabled: "AI enhancements are off — turn them on in Settings",
  shared_ai_unavailable: "EasySubmit AI is turned off — add your API key in AI Keys",
};

type AiHealthContextValue = {
  status: AiHealthStatus | null;
  refresh: (trigger: string) => Promise<void>;
};

const noopRefresh = async () => {};

const AiHealthContext = createContext<AiHealthContextValue>({
  status: null,
  refresh: noopRefresh,
});

function logClient(event: string, payload?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  if (payload) {
    console.log("[AiHealth:client]", event, payload);
    return;
  }
  console.log("[AiHealth:client]", event);
}

function resolveFixTarget(code: AiHealthErrorCode): { href: string; label: string } {
  if (code === "key_missing" || code === "key_invalid" || code === "shared_ai_unavailable") {
    return { href: SETTINGS_ADD_KEY_HREF, label: "Settings" };
  }
  return { href: SETTINGS_AI_AUTO_HREF, label: "Settings" };
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
    <AiHealthContext.Provider value={{ status, refresh }}>{children}</AiHealthContext.Provider>
  );
}

export function useAiHealthRefresh() {
  return useContext(AiHealthContext).refresh;
}

function useAiHealthStatus() {
  return useContext(AiHealthContext).status;
}

/** Glossy pill anchored below the BYOK button area in the dashboard header. */
export function AiHealthHeaderNotice() {
  const status = useAiHealthStatus();

  if (!status || status.ok) return null;

  const message = status.message.trim() || HINT[status.code] || "AI issue detected";
  const { href: fixHref, label: fixLabel } = resolveFixTarget(status.code);

  return (
    <div
      role="alert"
      className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-xl border px-3 py-2.5"
      style={{
        background: "oklch(0.18 0.06 25 / 0.92)",
        borderColor: "oklch(0.55 0.22 25 / 0.30)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="mt-0.5 h-3.5 w-3.5 shrink-0"
          style={{ color: "oklch(0.72 0.20 25)" }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] leading-snug" style={{ color: "oklch(0.84 0.10 25)" }}>
            {message}
          </p>
          <Link
            href={fixHref}
            className="mt-1 block text-right text-[11px] font-semibold text-primary hover:underline"
          >
            Fix in {fixLabel} →
          </Link>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use {@link AiHealthHeaderNotice} — kept for import stability during migration. */
export function AiHealthAlertIcon() {
  return null;
}

/** @deprecated Use {@link AiHealthHeaderNotice} — kept for import stability during migration. */
export function AiHealthAlertBanner() {
  return null;
}
