"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DashboardByokPromptModal } from "@/components/dashboard/DashboardByokPromptModal";
import { ExtensionInstallPromptModal } from "@/components/dashboard/ExtensionInstallPromptModal";
import { DASHBOARD_TUTORIALS_WELCOME_HREF } from "@/lib/dashboard/dashboard-tutorial-links";
import {
  isByokSetupPromptCompleted,
  markByokSetupPromptCompleted,
} from "@/lib/dashboard/dashboard-setup-prompt-storage";
import { isExtensionConnectedForDashboard } from "@/lib/extension/extension-dashboard-connection";

type DashboardSetupPromptsProps = {
  vaultKeyId?: string | null;
  storeUrl: string;
  refreshIntervalMinutes: number;
};

function DashboardSetupPromptsInner({
  vaultKeyId = null,
  storeUrl,
  refreshIntervalMinutes,
}: DashboardSetupPromptsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupHandledRef = useRef(false);
  const setupFlowActiveRef = useRef(false);
  const [byokOpen, setByokOpen] = useState(false);
  const [extensionOpen, setExtensionOpen] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState<boolean | null>(null);

  const isSetupEntry = searchParams.get("setup") === "1";
  const onExtensionPage = pathname.startsWith("/dashboard/extension");
  const onTutorialsPage = pathname.startsWith("/dashboard/tutorials");
  const onPromptExemptPage = onExtensionPage || onTutorialsPage;

  const refreshExtensionConnection = useCallback(async () => {
    const connected = await isExtensionConnectedForDashboard();
    setExtensionConnected(connected);
    if (connected) {
      setExtensionOpen(false);
    }
    return connected;
  }, []);

  const proceedToTutorials = useCallback(() => {
    setupFlowActiveRef.current = false;
    router.push(DASHBOARD_TUTORIALS_WELCOME_HREF);
  }, [router]);

  const openExtensionPrompt = useCallback(() => {
    if (onPromptExemptPage || byokOpen) return;
    setExtensionOpen(true);
  }, [byokOpen, onPromptExemptPage]);

  const proceedToExtensionStep = useCallback(() => {
    markByokSetupPromptCompleted(window.sessionStorage);
    void refreshExtensionConnection().then((connected) => {
      if (setupFlowActiveRef.current) {
        if (connected) {
          proceedToTutorials();
          return;
        }
        openExtensionPrompt();
        return;
      }
      if (!connected) {
        openExtensionPrompt();
      }
    });
  }, [openExtensionPrompt, proceedToTutorials, refreshExtensionConnection]);

  const handleExtensionOpenChange = useCallback(
    (open: boolean) => {
      setExtensionOpen(open);
      if (!open && setupFlowActiveRef.current) {
        proceedToTutorials();
      }
    },
    [proceedToTutorials],
  );

  useEffect(() => {
    void refreshExtensionConnection();
  }, [refreshExtensionConnection, vaultKeyId]);

  useEffect(() => {
    if (!isSetupEntry || setupHandledRef.current) return;
    if (extensionConnected === null) return;

    setupHandledRef.current = true;
    setupFlowActiveRef.current = true;
    router.replace(pathname, { scroll: false });

    if (extensionConnected) {
      proceedToTutorials();
      return;
    }

    if (!vaultKeyId && !isByokSetupPromptCompleted(window.sessionStorage)) {
      setByokOpen(true);
      return;
    }

    openExtensionPrompt();
  }, [
    extensionConnected,
    isSetupEntry,
    openExtensionPrompt,
    pathname,
    proceedToTutorials,
    router,
    vaultKeyId,
  ]);

  useEffect(() => {
    if (extensionConnected !== false) return;
    if (isSetupEntry && !setupHandledRef.current) return;
    if (onPromptExemptPage) return;
    if (byokOpen) return;

    openExtensionPrompt();
  }, [byokOpen, extensionConnected, isSetupEntry, onPromptExemptPage, openExtensionPrompt]);

  useEffect(() => {
    if (extensionConnected !== false) return;

    const intervalMs = Math.max(1, refreshIntervalMinutes) * 60_000;
    const timer = window.setInterval(() => {
      void refreshExtensionConnection().then((connected) => {
        if (!connected) {
          openExtensionPrompt();
        }
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [extensionConnected, openExtensionPrompt, refreshExtensionConnection, refreshIntervalMinutes]);

  useEffect(() => {
    if (extensionConnected !== false) return;

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      void refreshExtensionConnection().then((connected) => {
        if (!connected) {
          openExtensionPrompt();
        }
      });
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [extensionConnected, openExtensionPrompt, refreshExtensionConnection]);

  return (
    <>
      <DashboardByokPromptModal
        open={byokOpen}
        onOpenChange={setByokOpen}
        onCompleted={proceedToExtensionStep}
      />
      <ExtensionInstallPromptModal
        open={extensionOpen}
        onOpenChange={handleExtensionOpenChange}
        storeUrl={storeUrl}
      />
    </>
  );
}

export function DashboardSetupPrompts(props: DashboardSetupPromptsProps) {
  return (
    <Suspense fallback={null}>
      <DashboardSetupPromptsInner {...props} />
    </Suspense>
  );
}
