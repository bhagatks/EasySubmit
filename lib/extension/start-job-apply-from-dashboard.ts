import { EXTENSION_MESSAGE } from "@/src/shared/extension/constants";
import { appendAssistOpenParam } from "@/src/shared/extension/assist-open-url";

const DASHBOARD_EXTENSION_ID_KEY = "easysubmit_extension_id_v1";

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

export function storeExtensionIdForDashboard(extensionId: string): void {
  if (!extensionId.trim()) return;
  try {
    window.localStorage.setItem(DASHBOARD_EXTENSION_ID_KEY, extensionId.trim());
  } catch {
    // ignore quota / private mode
  }
}

export function readExtensionIdForDashboard(): string | null {
  try {
    const value = window.localStorage.getItem(DASHBOARD_EXTENSION_ID_KEY);
    return value?.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

export type StartJobApplyResult =
  | { success: true; usedExtension: boolean }
  | { success: false; error: string };

/** Open or focus the job posting and notify the extension to start apply. */
export async function startJobApplyFromDashboard(input: {
  jobId: string;
  canonicalUrl: string;
  /** When false, do not open the job URL if the extension is unreachable. */
  openUrlFallback?: boolean;
}): Promise<StartJobApplyResult> {
  const chromeBridge = getChromeBridge();
  const extensionId = readExtensionIdForDashboard();
  const openUrlFallback = input.openUrlFallback !== false;

  if (chromeBridge?.runtime?.sendMessage && extensionId) {
    const response = await new Promise<{ success?: boolean; error?: string }>((resolve) => {
      let settled = false;
      const finish = (value: { success?: boolean; error?: string }) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(value);
      };

      const timeoutId = window.setTimeout(() => {
        finish({ success: false, error: "Extension did not respond" });
      }, 8000);

      chromeBridge.runtime!.sendMessage!(
        extensionId,
        {
          action: EXTENSION_MESSAGE.START_APPLY,
          jobId: input.jobId,
          url: input.canonicalUrl,
        },
        (response) => {
          if (chromeBridge.runtime?.lastError) {
            finish({ success: false, error: chromeBridge.runtime.lastError.message });
            return;
          }
          finish(
            response && typeof response === "object"
              ? (response as { success?: boolean; error?: string })
              : { success: false },
          );
        },
      );
    });

    if (response.success) {
      return { success: true, usedExtension: true };
    }

    if (!openUrlFallback) {
      return {
        success: false,
        error: response.error ?? "Extension not reachable. Install EasySubmit to continue.",
      };
    }
  } else if (!openUrlFallback) {
    return {
      success: false,
      error: "Install the EasySubmit extension to continue on the job page.",
    };
  }

  window.open(appendAssistOpenParam(input.canonicalUrl), "_blank", "noopener,noreferrer");
  return { success: true, usedExtension: false };
}
