"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DashboardByokPromptModal } from "@/components/dashboard/DashboardByokPromptModal";
import { ExtensionInstallPromptModal } from "@/components/dashboard/ExtensionInstallPromptModal";
import { DASHBOARD_TUTORIALS_WELCOME_HREF } from "@/lib/dashboard/dashboard-tutorial-links";
import {
  dismissExtensionInstallForSession,
  isExtensionInstallDismissed,
} from "@/lib/dashboard/extension-install-dismiss-storage";
import {
  isExtensionPromptOpenBlocked,
  shouldOpenOnDashboardVisit,
  shouldOpenOnPeriodicRefresh,
  shouldOpenOnTabFocus,
  type ExtensionInstallPromptTriggerContext,
} from "@/lib/dashboard/extension-install-prompt-triggers";
import {
  isByokSetupPromptCompleted,
  markByokSetupPromptCompleted,
} from "@/lib/dashboard/dashboard-setup-prompt-storage";
import { isExtensionConnectedForDashboard } from "@/lib/extension/extension-dashboard-connection";
import type { ExtensionInstallPromptConfig } from "@/src/lib/services/extension-install-prompt-config";

type DashboardSetupPromptsProps = {
  vaultKeyId?: string | null;
  storeUrl: string;
  extensionInstallPrompt: ExtensionInstallPromptConfig;
};

function DashboardSetupPromptsInner({
  vaultKeyId = null,
  storeUrl,
  extensionInstallPrompt,
}: DashboardSetupPromptsProps) {
  const { refreshIntervalMinutes, dashboardVisit, tabFocusReturn, periodicRefresh } =
    extensionInstallPrompt;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupHandledRef = useRef(false);
  const setupFlowActiveRef = useRef(false);
  const [byokOpen, setByokOpen] = useState(false);
  const [extensionOpen, setExtensionOpen] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState<boolean | null>(null);
  const [sessionDismissed, setSessionDismissed] = useState(false);

  const isSetupEntry = searchParams.get("setup") === "1";
  const onExtensionPage = pathname.startsWith("/dashboard/extension");
  const onTutorialsPage = pathname.startsWith("/dashboard/tutorials");
  const onPromptExemptPage = onExtensionPage || onTutorialsPage;

  const buildTriggerContext = useCallback((): ExtensionInstallPromptTriggerContext => {
    return {
      extensionConnected,
      onPromptExemptPage,
      byokOpen,
      sessionDismissed,
      setupFlowActive: setupFlowActiveRef.current,
      isSetupEntry,
      setupHandled: setupHandledRef.current,
    };
  }, [byokOpen, extensionConnected, isSetupEntry, onPromptExemptPage, sessionDismissed]);

  const proceedToTutorials = useCallback(() => {
    setupFlowActiveRef.current = false;
    router.push(DASHBOARD_TUTORIALS_WELCOME_HREF);
  }, [router]);

  const refreshExtensionConnection = useCallback(async () => {
    const connected = await isExtensionConnectedForDashboard();
    setExtensionConnected(connected);
    if (connected) {
      setExtensionOpen(false);
      if (setupFlowActiveRef.current) {
        proceedToTutorials();
      }
    }
    return connected;
  }, [proceedToTutorials]);

  const tryOpenExtensionPrompt = useCallback(() => {
    if (isExtensionPromptOpenBlocked(buildTriggerContext())) return;
    setExtensionOpen(true);
  }, [buildTriggerContext]);

  const proceedToExtensionStep = useCallback(() => {
    markByokSetupPromptCompleted(window.sessionStorage);
    void refreshExtensionConnection().then((connected) => {
      if (setupFlowActiveRef.current) {
        if (connected) {
          return;
        }
        setExtensionOpen(true);
        return;
      }
      if (!connected) {
        tryOpenExtensionPrompt();
      }
    });
  }, [refreshExtensionConnection, tryOpenExtensionPrompt]);

  const handleExtensionOpenChange = useCallback(
    (open: boolean) => {
      setExtensionOpen(open);
      if (!open && setupFlowActiveRef.current) {
        proceedToTutorials();
        return;
      }
      if (!open) {
        dismissExtensionInstallForSession(window.sessionStorage);
        setSessionDismissed(true);
      }
    },
    [proceedToTutorials],
  );

  useEffect(() => {
    setSessionDismissed(isExtensionInstallDismissed(window.sessionStorage));
  }, []);

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

    setExtensionOpen(true);
  }, [extensionConnected, isSetupEntry, pathname, proceedToTutorials, router, vaultKeyId]);

  useEffect(() => {
    if (!shouldOpenOnDashboardVisit({ ...buildTriggerContext(), dashboardVisit })) return;
    tryOpenExtensionPrompt();
  }, [
    buildTriggerContext,
    byokOpen,
    dashboardVisit,
    extensionConnected,
    isSetupEntry,
    onPromptExemptPage,
    sessionDismissed,
    tryOpenExtensionPrompt,
  ]);

  useEffect(() => {
    if (!periodicRefresh) return;
    if (extensionConnected !== false) return;

    const intervalMs = Math.max(1, refreshIntervalMinutes) * 60_000;
    const timer = window.setInterval(() => {
      void refreshExtensionConnection().then((connected) => {
        if (
          !connected &&
          shouldOpenOnPeriodicRefresh({ ...buildTriggerContext(), periodicRefresh: true })
        ) {
          tryOpenExtensionPrompt();
        }
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [
    buildTriggerContext,
    extensionConnected,
    periodicRefresh,
    refreshExtensionConnection,
    refreshIntervalMinutes,
    sessionDismissed,
    byokOpen,
    onPromptExemptPage,
    tryOpenExtensionPrompt,
  ]);

  useEffect(() => {
    if (!tabFocusReturn) return;
    if (extensionConnected !== false) return;

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      void refreshExtensionConnection().then((connected) => {
        if (
          !connected &&
          shouldOpenOnTabFocus({ ...buildTriggerContext(), tabFocusReturn: true })
        ) {
          tryOpenExtensionPrompt();
        }
      });
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [
    buildTriggerContext,
    extensionConnected,
    tabFocusReturn,
    refreshExtensionConnection,
    sessionDismissed,
    byokOpen,
    onPromptExemptPage,
    tryOpenExtensionPrompt,
  ]);

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
