import { describe, expect, it } from "vitest";
import { EXTENSION_ID, EXTENSION_STORE_URL } from "@/lib/brand";

describe("extension store constants", () => {
  it("points at the published EasySubmit Chrome Web Store listing", () => {
    expect(EXTENSION_ID).toBe("ondcaafebdfegfkmdggeklofnmbijmlc");
    expect(EXTENSION_STORE_URL).toBe(
      "https://chromewebstore.google.com/detail/ondcaafebdfegfkmdggeklofnmbijmlc",
    );
    expect(EXTENSION_STORE_URL).toContain(EXTENSION_ID);
  });
});
