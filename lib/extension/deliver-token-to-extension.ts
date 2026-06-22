import {
  BRIDGE_MESSAGE,
  type BridgeAuthResultMessage,
} from "@/src/shared/extension/bridge-protocol";

const RELAY_TIMEOUT_MS = 10_000;

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

/** Prefer content-script relay; fall back to chrome.runtime.sendMessage from the page. */
export async function deliverTokenToExtension(
  token: string,
  extensionId: string,
): Promise<{ success: boolean; error?: string }> {
  const relay = await deliverViaContentRelay(token);
  if (relay.success) return relay;
  return deliverViaExternalMessage(token, extensionId);
}

function deliverViaContentRelay(
  token: string,
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    let settled = false;
    let retryId = 0;
    let timeoutId = 0;

    const finish = (result: { success: boolean; error?: string }) => {
      if (settled) return;
      settled = true;
      window.clearInterval(retryId);
      window.clearTimeout(timeoutId);
      window.removeEventListener("message", onMessage);
      resolve(result);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data as BridgeAuthResultMessage | null;
      if (!data || data.type !== BRIDGE_MESSAGE.authResult) return;
      finish({
        success: data.success,
        error: data.error ?? (data.success ? undefined : "Extension did not confirm the token"),
      });
    };

    window.addEventListener("message", onMessage);

    const sendAuth = () => {
      const apiBaseUrl = window.location.origin.replace(/\/$/, "");
      window.postMessage(
        { type: BRIDGE_MESSAGE.auth, token, apiBaseUrl },
        window.location.origin,
      );
    };

    sendAuth();
    retryId = window.setInterval(sendAuth, 400);
    timeoutId = window.setTimeout(() => {
      finish({
        success: false,
        error:
          "Extension content script did not respond. Reload the extension at chrome://extensions, then try again.",
      });
    }, RELAY_TIMEOUT_MS);
  });
}

function deliverViaExternalMessage(
  token: string,
  extensionId: string,
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const chromeBridge = getChromeBridge();
    if (!chromeBridge?.runtime?.sendMessage) {
      resolve({
        success: false,
        error:
          "Open this page in Chrome with the EasySubmit extension loaded (dist/extension).",
      });
      return;
    }

    let settled = false;
    const finish = (result: { success: boolean; error?: string }) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(result);
    };

    const timeoutId = window.setTimeout(() => {
      finish({
        success: false,
        error: "Extension did not respond. Reload it at chrome://extensions and try again.",
      });
    }, RELAY_TIMEOUT_MS);

    chromeBridge.runtime.sendMessage(
      extensionId,
      {
        action: "EASYSUBMIT_AUTH_TOKEN",
        token,
        apiBaseUrl: window.location.origin.replace(/\/$/, ""),
      },
      (response) => {
        if (chromeBridge.runtime?.lastError) {
          finish({
            success: false,
            error: chromeBridge.runtime.lastError.message ?? "Extension connection failed",
          });
          return;
        }

        const ok =
          response &&
          typeof response === "object" &&
          (response as { success?: boolean }).success;

        finish({
          success: Boolean(ok),
          error: ok ? undefined : "Extension rejected the token. Reload it at chrome://extensions.",
        });
      },
    );
  });
}
