"use client";

import { JetBrains_Mono } from "next/font/google";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IgnitionBlastOverlay,
  type IgnitionBlastPayload,
} from "@/components/keys/IgnitionBlast";
import { GlossyModal } from "@/components/ui/glossy-modal";
import { IgnitionGate } from "@/src/components/auth/IgnitionGate";
import { HANDSHAKE_PROVIDERS, type HandshakeProvider } from "@/src/lib/config/career-grade-models";
import { trackByokCtaClicked } from "@/src/shared/analytics/product-events";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

type DashboardByokPromptModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
};

export function DashboardByokPromptModal({
  open,
  onOpenChange,
  onCompleted,
}: DashboardByokPromptModalProps) {
  const router = useRouter();
  const mono = jetbrainsMono.className;
  const [blastPayload, setBlastPayload] = useState<IgnitionBlastPayload | null>(null);

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        onCompleted();
      }
      onOpenChange(nextOpen);
    },
    [onCompleted, onOpenChange],
  );

  const handleVaultSuccess = useCallback(
    (payload: { provider: HandshakeProvider; providerLabel: string }) => {
      setBlastPayload({ ...payload, origin: { x: 50, y: 45 } });
    },
    [],
  );

  const handleBlastComplete = useCallback(() => {
    setBlastPayload(null);
    router.refresh();
    onCompleted();
    onOpenChange(false);
  }, [onCompleted, onOpenChange, router]);

  return (
    <>
      <IgnitionBlastOverlay payload={blastPayload} onComplete={handleBlastComplete} />

      <GlossyModal
        open={open && !blastPayload}
        onOpenChange={handleClose}
        title="Add provider key"
        description="Pick a provider and paste your API key — validate, then ignite."
        className="max-w-lg"
        zIndex={160}
      >
        <IgnitionGate
          variant="manage"
          monoClass={mono}
          apiKeyInputId="dashboard-setup-byok-key"
          initialProvider={HANDSHAKE_PROVIDERS[0]}
          setAsActiveOnSave
          manageTitle="Add provider key"
          manageDescription="Pick a provider and paste your API key — validate, then ignite."
          manageSubmitLabel="Save Key"
          manageIgniteGlow
          hideManageHeader
          onVaultSuccess={handleVaultSuccess}
          onKeySaved={() => {
            trackByokCtaClicked("dashboard_setup_prompt");
            router.refresh();
          }}
        />
      </GlossyModal>
    </>
  );
}
