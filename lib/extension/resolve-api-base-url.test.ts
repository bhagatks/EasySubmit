import { describe, expect, it } from "vitest";
import { resolveExtensionApiBaseUrl } from "@/lib/extension/resolve-api-base-url";

describe("resolveExtensionApiBaseUrl", () => {
  it("prefers the request origin when provided", () => {
    expect(resolveExtensionApiBaseUrl("http://localhost:3000/")).toBe("http://localhost:3000");
  });

  it("falls back to env when request origin is missing", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    try {
      expect(resolveExtensionApiBaseUrl(null)).toBe("https://app.example.com");
    } finally {
      if (prev === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL;
      } else {
        process.env.NEXT_PUBLIC_APP_URL = prev;
      }
    }
  });
});
