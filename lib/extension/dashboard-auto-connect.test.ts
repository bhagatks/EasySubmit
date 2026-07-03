import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EXTENSION_MESSAGE } from "@/src/shared/extension/constants";
import { maybeAutoConnectExtensionFromDashboard } from "@/src/shared/extension/dashboard-auto-connect";

describe("maybeAutoConnectExtensionFromDashboard", () => {
  beforeEach(() => {
    vi.stubGlobal("location", {
      origin: "http://localhost:3000",
      hostname: "localhost",
      pathname: "/dashboard/job-tracker",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("skips when not on an EasySubmit app page", async () => {
    vi.stubGlobal("location", {
      origin: "https://www.linkedin.com",
      hostname: "www.linkedin.com",
      pathname: "/jobs/view/1",
    });

    const runtime = { sendMessage: vi.fn() };
    await expect(maybeAutoConnectExtensionFromDashboard(runtime)).resolves.toBe(false);
    expect(runtime.sendMessage).not.toHaveBeenCalled();
  });

  it("stores token when dashboard session exists and extension is unauthenticated", async () => {
    const runtime = {
      sendMessage: vi.fn((message: { action?: string }, callback: (response: unknown) => void) => {
        if (message.action === EXTENSION_MESSAGE.GET_AUTH) {
          callback({ token: null });
          return;
        }
        if (message.action === EXTENSION_MESSAGE.AUTH_TOKEN) {
          callback({ success: true });
        }
      }),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, token: "ext-token" }),
      }),
    );

    await expect(maybeAutoConnectExtensionFromDashboard(runtime)).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/extension/auth/token", {
      method: "POST",
      credentials: "include",
    });
  });

  it("no-ops when extension already has a token", async () => {
    const runtime = {
      sendMessage: vi.fn((_message, callback) => {
        callback({ token: "existing-token" });
      }),
    };

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(maybeAutoConnectExtensionFromDashboard(runtime)).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns false when the dashboard session cannot issue a token", async () => {
    const runtime = {
      sendMessage: vi.fn((message: { action?: string }, callback: (response: unknown) => void) => {
        if (message.action === EXTENSION_MESSAGE.GET_AUTH) {
          callback({ token: null });
        }
      }),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false }),
      }),
    );

    await expect(maybeAutoConnectExtensionFromDashboard(runtime)).resolves.toBe(false);
  });

  it("returns false when the extension rejects the delivered token", async () => {
    const runtime = {
      sendMessage: vi.fn((message: { action?: string }, callback: (response: unknown) => void) => {
        if (message.action === EXTENSION_MESSAGE.GET_AUTH) {
          callback({ token: null });
          return;
        }
        if (message.action === EXTENSION_MESSAGE.AUTH_TOKEN) {
          callback({ success: false });
        }
      }),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, token: "ext-token" }),
      }),
    );

    await expect(maybeAutoConnectExtensionFromDashboard(runtime)).resolves.toBe(false);
  });

  it("returns false when token fetch throws", async () => {
    const runtime = {
      sendMessage: vi.fn((message: { action?: string }, callback: (response: unknown) => void) => {
        if (message.action === EXTENSION_MESSAGE.GET_AUTH) {
          callback({ token: null });
        }
      }),
    };

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    await expect(maybeAutoConnectExtensionFromDashboard(runtime)).resolves.toBe(false);
  });
});
