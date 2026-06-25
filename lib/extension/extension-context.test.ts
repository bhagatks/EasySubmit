import { describe, expect, it } from "vitest";
import {
  isExtensionContextInvalidatedError,
  isExtensionContextInvalidatedMessage,
} from "@/src/shared/extension/extension-context";

describe("extension-context", () => {
  it("detects invalidated context messages", () => {
    expect(isExtensionContextInvalidatedMessage("Extension context invalidated.")).toBe(true);
    expect(isExtensionContextInvalidatedMessage("Could not establish connection. Receiving end does not exist.")).toBe(
      true,
    );
  });

  it("ignores unrelated errors", () => {
    expect(isExtensionContextInvalidatedMessage("Failed to fetch")).toBe(false);
    expect(isExtensionContextInvalidatedMessage("NetworkError when attempting to fetch resource.")).toBe(false);
  });

  it("detects invalidated context errors", () => {
    expect(isExtensionContextInvalidatedError(new Error("Extension context invalidated"))).toBe(true);
    expect(isExtensionContextInvalidatedError(new Error("Failed to fetch"))).toBe(false);
  });
});
