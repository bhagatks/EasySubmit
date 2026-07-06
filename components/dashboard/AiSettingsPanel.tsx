"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { SettingToggleRow } from "@/components/dashboard/SettingToggleRow";

interface AiSettingsPanelProps {
  systemAiEnabled: boolean;
  isSubscribed: boolean;
  systemDailyLimit?: number;
  customerAiDailyUnlimited?: boolean;
  customerDailyEnhancementLimit?: number;
  onToggleSystemAi: (enabled: boolean) => Promise<void>;
  isLoading?: boolean;
}

export function AiSettingsPanel({
  systemAiEnabled,
  isSubscribed,
  systemDailyLimit = 5,
  customerAiDailyUnlimited = true,
  customerDailyEnhancementLimit = 50,
  onToggleSystemAi,
  isLoading = false,
}: AiSettingsPanelProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    setIsUpdating(true);
    try {
      await onToggleSystemAi(enabled);
    } finally {
      setIsUpdating(false);
    }
  };

  const byokLimitLine = !customerAiDailyUnlimited ? (
    <>
      Your API key: daily limit{" "}
      <strong>{customerDailyEnhancementLimit} enhancements</strong>
    </>
  ) : (
    <>Add API key anytime for unlimited</>
  );

  if (!isSubscribed) {
    return (
      <div className="space-y-4">
        <SettingToggleRow
          label="Use EasySubmit's shared AI"
          description={
            systemAiEnabled ? (
              <>
                Daily limit: <strong>{systemDailyLimit} enhancements</strong>
                <br />({byokLimitLine})
              </>
            ) : (
              <>
                System AI is disabled for your account.
                <br />
                Add an API key below to use AI features.
                {!customerAiDailyUnlimited ? (
                  <>
                    <br />
                    {byokLimitLine}
                  </>
                ) : null}
              </>
            )
          }
          checked={systemAiEnabled}
          disabled={isUpdating || isLoading}
          onChange={(enabled) => void handleToggle(enabled)}
        />

        {!systemAiEnabled && (
          <div className="rounded-lg border border-warning bg-warning/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-warning" />
              <p className="text-sm text-muted-foreground">
                To use AI features, you must add your own API key in the Provider keys section.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-success/5 p-4">
        <p className="text-sm">
          <strong>Unlimited system AI access</strong>
          <br />
          Your subscription includes unlimited AI tailoring from our shared pool.
          {!customerAiDailyUnlimited ? (
            <>
              <br />
              {byokLimitLine}
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
