"use client";

import { useEffect, useState } from "react";
import { isClientAiGloballyEnabled } from "@/lib/ai/ai-global-enabled";

type AiPreferenceResponse = {
  aiSourcePreference?: string;
  aiGloballyEnabled?: boolean;
};

/**
 * Whether Enhance should show as "Enhance with AI" (true) vs rules-only "Enhance" (false).
 * Uses server `aiGloballyEnabled` when available so UI matches `EASYSUBMIT_AI_GLOBALLY_ENABLED`.
 */
export function useEnhanceAiEnabled(active = true): boolean {
  const [aiEnabled, setAiEnabled] = useState(isClientAiGloballyEnabled());

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    void fetch("/api/user/ai-preference")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AiPreferenceResponse | null) => {
        if (cancelled || !data) return;
        const globallyOn =
          data.aiGloballyEnabled !== undefined
            ? data.aiGloballyEnabled
            : isClientAiGloballyEnabled();
        setAiEnabled(
          globallyOn && (data.aiSourcePreference ?? "disabled") !== "disabled",
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [active]);

  return aiEnabled;
}
