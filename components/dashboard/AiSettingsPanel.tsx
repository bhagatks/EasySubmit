"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

interface AiSettingsPanelProps {
  systemAiEnabled: boolean;
  isSubscribed: boolean;
  systemDailyLimit?: number;
  onToggleSystemAi: (enabled: boolean) => Promise<void>;
  isLoading?: boolean;
}

export function AiSettingsPanel({
  systemAiEnabled,
  isSubscribed,
  systemDailyLimit = 5,
  onToggleSystemAi,
  isLoading = false,
}: AiSettingsPanelProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsUpdating(true);
    try {
      await onToggleSystemAi(e.target.checked);
    } finally {
      setIsUpdating(false);
    }
  };

  // Note: System AI disabled check is handled by parent component based on app config

  // Free user toggle (only show if system is enabled and user is free tier)
  if (!isSubscribed) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="system-ai-toggle" className="text-base font-medium cursor-pointer">
              Use EasySubmit&apos;s shared AI
            </label>
            <input
              id="system-ai-toggle"
              type="checkbox"
              checked={systemAiEnabled}
              onChange={handleToggle}
              disabled={isUpdating || isLoading}
              className="h-6 w-11 rounded-full bg-gray-300 appearance-none cursor-pointer transition-colors checked:bg-blue-600 disabled:opacity-50"
              aria-label="Toggle system AI access"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {systemAiEnabled ? (
              <>
                Daily limit: <strong>{systemDailyLimit} enhancements</strong>
                <br />
                (Add API key anytime for unlimited)
              </>
            ) : (
              <>
                System AI is disabled for your account.
                <br />
                Add an API key below to use AI features.
              </>
            )}
          </p>
        </div>

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

  // Paid user - system AI always available
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-success/5 p-4">
        <p className="text-sm">
          <strong>Unlimited system AI access</strong>
          <br />
          Your subscription includes unlimited AI tailoring from our shared pool.
        </p>
      </div>
    </div>
  );
}
