import { describe, expect, it } from "vitest";
import {
  MAX_EXTENSION_JSON_BODY_BYTES,
  readExtensionJsonBody,
} from "@/lib/extension/extension-request-body";

describe("readExtensionJsonBody", () => {
  it("parses valid JSON under the size cap", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/jobs/1" }),
    });

    const result = await readExtensionJsonBody<{ url: string }>(request);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.url).toBe("https://example.com/jobs/1");
    }
  });

  it("rejects oversized bodies", async () => {
    const oversized = "x".repeat(MAX_EXTENSION_JSON_BODY_BYTES + 1);
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(oversized.length),
      },
      body: oversized,
    });

    const result = await readExtensionJsonBody(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(413);
    }
  });
});
