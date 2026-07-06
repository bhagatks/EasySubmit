"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { SettingToggleRow } from "@/components/dashboard/SettingToggleRow";
import {
  buildAiSettingsStatusText,
  isAiTailoringAvailable,
} from "@/lib/dashboard/ai-settings-copy";

interface AiSettingsPanelProps {
  aiEnabled: boolean;
  systemAiFeatureEnabled: boolean;
  isSubscribed: boolean;
  systemDailyLimit?: number;
  customerAiDailyUnlimited?: boolean;
  customerDailyEnhancementLimit?: number;
  hasByokKey?: boolean;
  onToggleAiEnabled: (enabled: boolean) => Promise<void>;
  isLoading?: boolean;
}

export function AiSettingsPanel({
  aiEnabled,
  systemAiFeatureEnabled,
  isSubscribed,
  systemDailyLimit = 5,
  customerAiDailyUnlimited = true,
  customerDailyEnhancementLimit = 50,
  hasByokKey = false,
  onToggleAiEnabled,
  isLoading = false,
}: AiSettingsPanelProps) {
  const [busy, setBusy] = useState(false);

  const tailoringAvailable = isAiTailoringAvailable({
    systemAiFeatureEnabled,
    hasByokKey,
  });

  const statusText = useMemo(
    () =>
      buildAiSettingsStatusText({
        aiEnabled,
        hasByokKey,
        systemAiFeatureEnabled,
        customerAiDailyUnlimited,
        customerDailyEnhancementLimit,
        systemDailyLimit,
        isSubscribed,
      }),
    [
      aiEnabled,
      hasByokKey,
      systemAiFeatureEnabled,
      customerAiDailyUnlimited,
      customerDailyEnhancementLimit,
      systemDailyLimit,
      isSubscribed,
    ],
  );

  const handleToggleAi = async (enabled: boolean) => {
    if (enabled && !tailoringAvailable) return;
    setBusy(true);
    try {
      await onToggleAiEnabled(enabled);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <SettingToggleRow
        label="AI tailoring"
        checked={tailoringAvailable && aiEnabled}
        disabled={busy || isLoading || !tailoringAvailable}
        onChange={(enabled) => void handleToggleAi(enabled)}
        icon={<Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
      />

      <p className="rounded-xl border border-border/70 bg-background/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        {statusText}
      </p>
    </div>
  );
}
