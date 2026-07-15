import { EXTENSION_MESSAGE } from "@/src/shared/extension/constants";
import { readExtensionTokenUserId } from "@/src/shared/extension/auth-token-payload";
import { isEasySubmitManagedAppPage } from "@/src/shared/extension/easysubmit-app-page";

type RuntimeBridge = {
  sendMessage: (message: unknown, callback: (response: unknown) => void) => void;
  lastError?: { message?: string };
};

type DashboardAuthTokenResponse = {
  success?: boolean;
  token?: string;
  userId?: string;
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

async function clearExtensionAuth(runtime: RuntimeBridge): Promise<void> {
  await sendRuntimeMessage<{ success?: boolean }>(runtime, {
    action: EXTENSION_MESSAGE.CLEAR_AUTH,
  });
}

let autoConnectInFlight: Promise<boolean> | null = null;

/** Silently sync extension auth with the signed-in dashboard session. */
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
      const existingToken = auth?.token ?? null;

      const res = await fetch(`${location.origin}/api/extension/auth/token`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        if (existingToken) {
          await clearExtensionAuth(runtime);
        }
        return false;
      }

      const data = (await res.json()) as DashboardAuthTokenResponse;
      if (!data.success || !data.token) {
        if (existingToken) {
          await clearExtensionAuth(runtime);
        }
        return false;
      }

      const existingUserId = readExtensionTokenUserId(existingToken);
      const nextUserId = readExtensionTokenUserId(data.token) ?? data.userId ?? null;

      if (existingToken && existingUserId && nextUserId && existingUserId === nextUserId) {
        return true;
      }

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
