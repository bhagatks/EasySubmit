import { describe, expect, it } from "vitest";
import { createExtensionToken, verifyExtensionToken } from "@/lib/extension/auth-token";

describe("extension auth token", () => {
  it("round-trips user id", () => {
    process.env.EXTENSION_TOKEN_SECRET = "test-secret";
    const token = createExtensionToken("user-123", 60_000);
    expect(verifyExtensionToken(token)).toBe("user-123");
  });

  it("rejects tampered token", () => {
    process.env.EXTENSION_TOKEN_SECRET = "test-secret";
    const token = createExtensionToken("user-123", 60_000);
    expect(verifyExtensionToken(`${token}x`)).toBeNull();
  });
});
