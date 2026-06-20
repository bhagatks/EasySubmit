import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/stores/onboardingStore", () => ({
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

import { clearClientSessionState, signOutUser } from "@/lib/auth/sign-out-client";

function createStorageMock() {
  let store: Record<string, string> = {};
  return {
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
    sessionStorage.setItem("easysubmit-onboarding", "{}");
    localStorage.setItem("easysubmit-ignition-prefs", "{}");
    signOutMock.mockResolvedValue(undefined);
  });

  it("clearClientSessionState resets stores and removes persisted keys", () => {
    clearClientSessionState();

    expect(resetStoreMock).toHaveBeenCalledOnce();
    expect(resetIgnitionMock).toHaveBeenCalledOnce();
    expect(clearVaultMock).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem("easysubmit-onboarding")).toBeNull();
    expect(localStorage.getItem("easysubmit-ignition-prefs")).toBeNull();
  });

  it("signOutUser clears client state then redirects to EasySubmit login", async () => {
    await signOutUser();

    expect(resetStoreMock).toHaveBeenCalledOnce();
    expect(resetIgnitionMock).toHaveBeenCalledOnce();
    expect(clearVaultMock).toHaveBeenCalledOnce();
    expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
    expect(assignMock).toHaveBeenCalledWith("/login?signedOut=1");
  });
});
