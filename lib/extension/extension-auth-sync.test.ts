import { describe, expect, it } from "vitest";
import {
  extensionDisconnectedReason,
  resolveExtensionPopupAuthState,
} from "@/src/shared/extension/extension-auth-sync";

describe("resolveExtensionPopupAuthState", () => {
  it("returns disconnected when the extension has no token", () => {
    expect(resolveExtensionPopupAuthState({ hasToken: false })).toBe("disconnected");
  });

  it("requires sign-in when a token exists but the app user is missing", () => {
    expect(resolveExtensionPopupAuthState({ hasToken: true, connectedUser: null })).toBe(
      "sign_in_required",
    );
  });

  it("returns connected when token and connected user are present", () => {
    expect(
      resolveExtensionPopupAuthState({
        hasToken: true,
        connectedUser: { id: "user-1", email: "a@example.com", name: "A" },
      }),
    ).toBe("connected");
  });
});

describe("extensionDisconnectedReason", () => {
  it("maps sign-in-required to session_expired", () => {
    expect(extensionDisconnectedReason("sign_in_required")).toBe("session_expired");
  });
});
