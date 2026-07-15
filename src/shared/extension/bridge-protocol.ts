/** Page ↔ content-script messages for /extension/bridge auth handoff. */
export const BRIDGE_MESSAGE = {
  ready: "EASYSUBMIT_EXTENSION_BRIDGE_READY",
  auth: "EASYSUBMIT_BRIDGE_AUTH",
  authResult: "EASYSUBMIT_BRIDGE_AUTH_RESULT",
  clearAuth: "EASYSUBMIT_BRIDGE_CLEAR_AUTH",
  clearAuthResult: "EASYSUBMIT_BRIDGE_CLEAR_AUTH_RESULT",
} as const;

export type BridgeAuthResultMessage = {
  type: typeof BRIDGE_MESSAGE.authResult;
  success: boolean;
  error?: string;
};
