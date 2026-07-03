import { EXTENSION_MESSAGE } from "@/src/shared/extension/constants";
import { isEasySubmitManagedAppPage } from "@/src/shared/extension/easysubmit-app-page";

type RuntimeBridge = {
  sendMessage: (message: unknown, callback: (response: unknown) => void) => void;
  lastError?: { message?: string };
};

function sendRuntimeMessage<T>(runtime: RuntimeBridge, message: unknown): Promise<T | null> {
  return new Promise((resolve) => {
    runtime.sendMessage(message, (response) => {
      if (runtime.lastError?.message) {
        resolve(null);
        return;
      }
      resolve((response as T | undefined) ?? null);
    });
  });
}

let autoConnectInFlight: Promise<boolean> | null = null;

/** Silently issue an extension token when the user is signed in on the dashboard. */
export async function maybeAutoConnectExtensionFromDashboard(
  runtime: RuntimeBridge,
): Promise<boolean> {
  if (typeof location === "undefined") return false;
  if (!isEasySubmitManagedAppPage()) return false;

  if (autoConnectInFlight) return autoConnectInFlight;

  autoConnectInFlight = (async () => {
    try {
      const auth = await sendRuntimeMessage<{ token?: string | null }>(runtime, {
        action: EXTENSION_MESSAGE.GET_AUTH,
      });
      if (auth?.token) return true;

      const res = await fetch(`${location.origin}/api/extension/auth/token`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return false;

      const data = (await res.json()) as { success?: boolean; token?: string };
      if (!data.success || !data.token) return false;

      const delivered = await sendRuntimeMessage<{ success?: boolean }>(runtime, {
        action: EXTENSION_MESSAGE.AUTH_TOKEN,
        token: data.token,
        apiBaseUrl: location.origin.replace(/\/$/, ""),
      });

      return Boolean(delivered?.success);
    } catch {
      return false;
    } finally {
      autoConnectInFlight = null;
    }
  })();

  return autoConnectInFlight;
}
