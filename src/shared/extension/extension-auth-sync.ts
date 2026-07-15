import type { ExtensionConnectedUser } from "@/src/shared/extension/types";

export type ExtensionPopupAuthState = "disconnected" | "sign_in_required" | "connected";

export type ExtensionDisconnectedReason = "never_connected" | "session_expired";

export function resolveExtensionPopupAuthState(input: {
  hasToken: boolean;
  connectedUser?: ExtensionConnectedUser | null;
}): ExtensionPopupAuthState {
  if (!input.hasToken) return "disconnected";
  if (!input.connectedUser?.id) return "sign_in_required";
  return "connected";
}

export function extensionDisconnectedReason(
  state: ExtensionPopupAuthState,
): ExtensionDisconnectedReason {
  return state === "sign_in_required" ? "session_expired" : "never_connected";
}

export const EXTENSION_POPUP_DISCONNECTED_COPY: Record<
  ExtensionDisconnectedReason,
  { subtitle: string; primaryLabel: string; secondaryLabel: string }
> = {
  never_connected: {
    subtitle: "This extension is not synced with EasySubmit yet. Sign in to connect your account.",
    primaryLabel: "Sign in",
    secondaryLabel: "Open dashboard",
  },
  session_expired: {
    subtitle: "Your EasySubmit session expired. Sign in again to stay in sync with the app.",
    primaryLabel: "Sign in",
    secondaryLabel: "Open dashboard",
  },
};

/** Default sync model: extension starts unsynced until dashboard issues a bearer token. */
export const EXTENSION_AUTH_SYNC_DEFAULT =
  "Extension and app are not synced by default. They sync after you sign in on EasySubmit and the dashboard hands the extension a token." as const;
