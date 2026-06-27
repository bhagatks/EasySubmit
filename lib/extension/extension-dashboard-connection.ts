import { EXTENSION_MESSAGE } from "@/src/shared/extension/constants";
import { readExtensionIdForDashboard } from "@/lib/extension/start-job-apply-from-dashboard";

const EXTENSION_PING_TIMEOUT_MS = 2_000;

type ChromeBridge = {
  runtime?: {
    sendMessage: (
      extensionId: string,
      message: unknown,
      callback: (response: unknown) => void,
    ) => void;
    lastError?: { message?: string };
  };
};

function getChromeBridge(): ChromeBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { chrome?: ChromeBridge }).chrome;
}

function pingExtension(extensionId: string): Promise<boolean> {
  const chromeBridge = getChromeBridge();
  if (!chromeBridge?.runtime?.sendMessage) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (connected: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(connected);
    };

    const timeoutId = window.setTimeout(() => {
      finish(false);
    }, EXTENSION_PING_TIMEOUT_MS);

    chromeBridge.runtime!.sendMessage(
      extensionId,
      { action: EXTENSION_MESSAGE.PING },
      (response) => {
        if (chromeBridge.runtime?.lastError) {
          finish(false);
          return;
        }
        finish(
          Boolean(
            response &&
              typeof response === "object" &&
              (response as { ready?: boolean }).ready === true,
          ),
        );
      },
    );
  });
}

/** True when this browser has a reachable EasySubmit extension (stored id + PING). */
export async function isExtensionConnectedForDashboard(): Promise<boolean> {
  const extensionId = readExtensionIdForDashboard();
  if (!extensionId) {
    return false;
  }
  return pingExtension(extensionId);
}
