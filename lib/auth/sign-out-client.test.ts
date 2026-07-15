import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPLIED_ARCHIVE_TOAST_KEY,
  DASHBOARD_EXTENSION_ID_KEY,
  IGNITION_PREFS_STORAGE_KEY,
  ONBOARDING_STORAGE_KEY,
} from "@/lib/auth/client-storage";
import { WORKBENCH_SESSION_STORAGE_KEY } from "@/lib/onboarding/workbench-session";
import { PAGE_SIZE_STORAGE_KEY } from "@/lib/resume/page-sizes";
import { STUDIO_ZOOM_STORAGE_KEY } from "@/lib/resume/studio-preview-zoom";

const { signOutMock, resetStoreMock, resetIgnitionMock, clearVaultMock, assignMock } =
  vi.hoisted(() => ({
    signOutMock: vi.fn(),
    resetStoreMock: vi.fn(),
    resetIgnitionMock: vi.fn(),
    clearVaultMock: vi.fn(),
    assignMock: vi.fn(),
  }));

vi.mock("next-auth/react", () => ({
  signOut: signOutMock,
}));

vi.mock("@/src/stores/onboarding-store", () => ({
  useOnboardingStore: {
    getState: () => ({ resetStore: resetStoreMock }),
  },
}));

vi.mock("@/src/stores/use-ignition-store", () => ({
  useIgnitionStore: {
    getState: () => ({ resetIgnition: resetIgnitionMock }),
  },
}));

vi.mock("@/src/lib/ai/session-key-vault", () => ({
  clearSessionApiKeyVault: clearVaultMock,
}));

vi.mock("@/lib/extension/clear-extension-auth", () => ({
  clearExtensionAuthFromBrowser: vi.fn().mockResolvedValue(true),
}));

import { clearClientSessionState, signOutUser } from "@/lib/auth/sign-out-client";
import { clearExtensionAuthFromBrowser } from "@/lib/extension/clear-extension-auth";

function createStorageMock() {
  let store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

describe("sign-out-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("sessionStorage", createStorageMock());
    vi.stubGlobal("localStorage", createStorageMock());
    vi.stubGlobal("window", { location: { assign: assignMock } });

    sessionStorage.setItem(ONBOARDING_STORAGE_KEY, "{}");
    sessionStorage.setItem(WORKBENCH_SESSION_STORAGE_KEY, "{}");
    sessionStorage.setItem("easysubmit-ignition-vault-key", "vault");
    localStorage.setItem(IGNITION_PREFS_STORAGE_KEY, "{}");
    localStorage.setItem(STUDIO_ZOOM_STORAGE_KEY, "100");
    localStorage.setItem(PAGE_SIZE_STORAGE_KEY, "letter");
    localStorage.setItem(DASHBOARD_EXTENSION_ID_KEY, "abc123");
    localStorage.setItem(APPLIED_ARCHIVE_TOAST_KEY, "1");
    localStorage.setItem("openai_key", "legacy");

    signOutMock.mockResolvedValue(undefined);
  });

  it("clearClientSessionState resets stores and removes all EasySubmit storage", () => {
    clearClientSessionState();

    expect(resetStoreMock).toHaveBeenCalledOnce();
    expect(resetIgnitionMock).toHaveBeenCalledOnce();
    expect(clearVaultMock).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(WORKBENCH_SESSION_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem("easysubmit-ignition-vault-key")).toBeNull();
    expect(localStorage.getItem(IGNITION_PREFS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(STUDIO_ZOOM_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(PAGE_SIZE_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(DASHBOARD_EXTENSION_ID_KEY)).toBeNull();
    expect(localStorage.getItem(APPLIED_ARCHIVE_TOAST_KEY)).toBeNull();
    expect(localStorage.getItem("openai_key")).toBeNull();
  });

  it("signOutUser clears extension auth, client state, then signs out via NextAuth redirect", async () => {
    await signOutUser();

    expect(clearExtensionAuthFromBrowser).toHaveBeenCalledOnce();
    expect(resetStoreMock).toHaveBeenCalledOnce();
    expect(resetIgnitionMock).toHaveBeenCalledOnce();
    expect(clearVaultMock).toHaveBeenCalledOnce();
    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: "/login?signedOut=1" });
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("signOutUser falls back to server signout route when NextAuth signOut throws", async () => {
    signOutMock.mockRejectedValueOnce(new Error("network"));

    await signOutUser();

    expect(assignMock).toHaveBeenCalledWith(
      "/api/auth/signout?callbackUrl=%2Flogin%3FsignedOut%3D1",
    );
  });
});
