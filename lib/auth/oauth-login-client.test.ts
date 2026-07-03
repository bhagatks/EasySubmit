import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLoginTermsAccepted,
  clearOAuthRedirectPending,
  consumeOAuthRedirectPending,
  hasOAuthRedirectPending,
  markLoginTermsAccepted,
  markOAuthRedirectPending,
  readLoginTermsAccepted,
} from "@/lib/auth/oauth-login-client";

describe("oauth login client helpers", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearOAuthRedirectPending();
  });

  it("marks and consumes a pending redirect once", () => {
    markOAuthRedirectPending("google");
    expect(consumeOAuthRedirectPending()).toBe(true);
    expect(consumeOAuthRedirectPending()).toBe(false);
  });

  it("clears pending redirect without consuming", () => {
    markOAuthRedirectPending("linkedin");
    clearOAuthRedirectPending();
    expect(consumeOAuthRedirectPending()).toBe(false);
  });

  it("tracks login terms acceptance in session", () => {
    expect(readLoginTermsAccepted()).toBe(false);
    markLoginTermsAccepted();
    expect(readLoginTermsAccepted()).toBe(true);
    clearLoginTermsAccepted();
    expect(readLoginTermsAccepted()).toBe(false);
  });

  it("detects pending redirect without consuming", () => {
    expect(hasOAuthRedirectPending()).toBe(false);
    markOAuthRedirectPending("google");
    expect(hasOAuthRedirectPending()).toBe(true);
    clearOAuthRedirectPending();
    expect(hasOAuthRedirectPending()).toBe(false);
  });

  it("handles unavailable sessionStorage", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });

    markOAuthRedirectPending("google");
    markLoginTermsAccepted();
    expect(readLoginTermsAccepted()).toBe(false);
    expect(consumeOAuthRedirectPending()).toBe(false);
    expect(hasOAuthRedirectPending()).toBe(false);
    clearOAuthRedirectPending();
    clearLoginTermsAccepted();
  });
});
