import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createExtensionToken } from "@/lib/extension/auth-token";
import { EXTENSION_MESSAGE } from "@/src/shared/extension/constants";
import { maybeAutoConnectExtensionFromDashboard } from "@/src/shared/extension/dashboard-auto-connect";

describe("maybeAutoConnectExtensionFromDashboard", () => {
  beforeEach(() => {
    process.env.EXTENSION_TOKEN_SECRET = "test-secret";
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

    const token = createExtensionToken("user-new", 60_000);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, token, userId: "user-new" }),
      }),
    );

    await expect(maybeAutoConnectExtensionFromDashboard(runtime)).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/extension/auth/token", {
      method: "POST",
      credentials: "include",
    });
  });

  it("skips token delivery when the extension already matches the dashboard user", async () => {
    const token = createExtensionToken("user-same", 60_000);
    const runtime = {
      sendMessage: vi.fn((message: { action?: string }, callback: (response: unknown) => void) => {
        if (message.action === EXTENSION_MESSAGE.GET_AUTH) {
          callback({ token });
        }
      }),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, token, userId: "user-same" }),
      }),
    );

    await expect(maybeAutoConnectExtensionFromDashboard(runtime)).resolves.toBe(true);
    expect(runtime.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("replaces the token when the dashboard user differs from the extension token", async () => {
    const existingToken = createExtensionToken("user-old", 60_000);
    const nextToken = createExtensionToken("user-new", 60_000);
    const runtime = {
      sendMessage: vi.fn((message: { action?: string }, callback: (response: unknown) => void) => {
        if (message.action === EXTENSION_MESSAGE.GET_AUTH) {
          callback({ token: existingToken });
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
        json: async () => ({ success: true, token: nextToken, userId: "user-new" }),
      }),
    );

    await expect(maybeAutoConnectExtensionFromDashboard(runtime)).resolves.toBe(true);
    expect(runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: EXTENSION_MESSAGE.AUTH_TOKEN,
        token: nextToken,
      }),
      expect.any(Function),
    );
  });

  it("clears extension auth when the dashboard session cannot issue a token", async () => {
    const existingToken = createExtensionToken("user-old", 60_000);
    const runtime = {
      sendMessage: vi.fn((message: { action?: string }, callback: (response: unknown) => void) => {
        if (message.action === EXTENSION_MESSAGE.GET_AUTH) {
          callback({ token: existingToken });
          return;
        }
        if (message.action === EXTENSION_MESSAGE.CLEAR_AUTH) {
          callback({ success: true });
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
    expect(runtime.sendMessage).toHaveBeenCalledWith(
      { action: EXTENSION_MESSAGE.CLEAR_AUTH },
      expect.any(Function),
    );
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
