import { describe, expect, it } from "vitest";
import {
  resolveExtensionApiBase,
  shouldClearStaleLocalApiBasePin,
} from "@/src/shared/extension/resolve-api-base";

describe("resolveExtensionApiBase", () => {
  const prodDefault = "https://www.easysubmit.ai";
  const devDefault = "http://localhost:3000";

  it("prod package ignores localhost tab and storage", () => {
    expect(
      resolveExtensionApiBase({
        buildDefault: prodDefault,
        storedApiBaseUrl: "http://localhost:3000",
        openTabOrigin: "http://localhost:3000",
      }),
    ).toBe(prodDefault);
  });

  it("prod package uses prod storage pin from bridge", () => {
    expect(
      resolveExtensionApiBase({
        buildDefault: prodDefault,
        storedApiBaseUrl: "https://www.easysubmit.ai",
        openTabOrigin: "http://localhost:3000",
      }),
    ).toBe("https://www.easysubmit.ai");
  });

  it("dev package prefers localhost tab when present", () => {
    expect(
      resolveExtensionApiBase({
        buildDefault: devDefault,
        storedApiBaseUrl: null,
        openTabOrigin: "http://localhost:3000",
      }),
    ).toBe(devDefault);
  });

  it("dev package ignores prod tab when no local pin", () => {
    expect(
      resolveExtensionApiBase({
        buildDefault: devDefault,
        storedApiBaseUrl: null,
        openTabOrigin: "https://www.easysubmit.ai",
      }),
    ).toBe(devDefault);
  });

  it("flags stale localhost storage on prod package", () => {
    expect(
      shouldClearStaleLocalApiBasePin(prodDefault, "http://localhost:3000"),
    ).toBe(true);
    expect(
      shouldClearStaleLocalApiBasePin(devDefault, "http://localhost:3000"),
    ).toBe(false);
  });
});
