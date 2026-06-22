import { EXTENSION_MESSAGE } from "@shared/extension/constants";
import { BRIDGE_MESSAGE } from "@shared/extension/bridge-protocol";

/** Relays bridge page tokens to the background worker (more reliable than external sendMessage). */
export function setupBridgeRelay(): void {
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;

    const data = event.data as { type?: string; token?: string; apiBaseUrl?: string } | null;
    if (!data || data.type !== BRIDGE_MESSAGE.auth || typeof data.token !== "string") {
      return;
    }

    chrome.runtime.sendMessage(
      {
        action: EXTENSION_MESSAGE.AUTH_TOKEN,
        token: data.token,
        apiBaseUrl: data.apiBaseUrl,
      },
      (response) => {
        const payload = {
          type: BRIDGE_MESSAGE.authResult,
          success: Boolean((response as { success?: boolean } | undefined)?.success),
          error: chrome.runtime.lastError?.message,
        };
        window.postMessage(payload, window.location.origin);
      },
    );
  });

  window.postMessage({ type: BRIDGE_MESSAGE.ready }, window.location.origin);
}
