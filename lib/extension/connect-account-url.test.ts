import { describe, expect, it } from "vitest";
import {
  buildExtensionBridgePath,
  buildExtensionBridgeUrl,
  buildExtensionConnectUrl,
} from "@/src/shared/extension/connect-account-url";

describe("connect-account-url", () => {
  const extensionId = "ondcaafebdfegfkmdggeklofnmbijmlc";

  it("builds bridge path with encoded extension id", () => {
    expect(buildExtensionBridgePath(extensionId)).toBe(
      `/extension/bridge?extensionId=${extensionId}`,
    );
  });

  it("routes new connects through login with bridge callback", () => {
    expect(buildExtensionConnectUrl("https://www.easysubmit.ai", extensionId)).toBe(
      `https://www.easysubmit.ai/login?callbackUrl=${encodeURIComponent(
        `/extension/bridge?extensionId=${extensionId}`,
      )}`,
    );
  });

  it("builds direct bridge url for reconnect", () => {
    expect(buildExtensionBridgeUrl("https://www.easysubmit.ai/", extensionId)).toBe(
      `https://www.easysubmit.ai/extension/bridge?extensionId=${extensionId}`,
    );
  });
});
