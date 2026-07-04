import { describe, expect, it } from "vitest";
import {
  evaluateByokKeyGate,
  formatLastJobKeyFailureMessage,
  ignoreStaleKeyFailure,
  isKeyRelatedPipelineError,
  parsePipelineMetadataError,
} from "@/src/lib/ai/engine/byok-key-gate";

describe("evaluateByokKeyGate", () => {
  it("does not apply on EasySubmit system-only preference without vault", () => {
    const result = evaluateByokKeyGate({
      preference: "system",
      vaultKeyId: null,
      activeProvider: null,
      route: { mode: "system", provider: "gemini", modelId: "gemini" },
      unvaultOk: null,
      recentApiFailures60m: 0,
      recentApiSuccesses60m: 0,
      lastJobFailure: null,
    });
    expect(result.applies).toBe(false);
    expect(result.valid).toBe(true);
  });

  it("flags My key preference without a saved key", () => {
    const result = evaluateByokKeyGate({
      preference: "customer",
      vaultKeyId: null,
      activeProvider: null,
      route: { mode: "system", provider: "gemini", modelId: "gemini" },
      unvaultOk: null,
      recentApiFailures60m: 0,
      recentApiSuccesses60m: 0,
      lastJobFailure: null,
    });
    expect(result).toMatchObject({
      applies: true,
      valid: false,
      code: "key_missing",
      reason: "missing_key",
    });
  });

  it("flags unreadable vaulted key on customer route", () => {
    const result = evaluateByokKeyGate({
      preference: "auto",
      vaultKeyId: "vault-1",
      activeProvider: "gemini",
      route: {
        mode: "customer",
        provider: "gemini",
        modelId: "gemini-2.5-flash",
        modelCandidates: ["gemini-2.5-flash"],
        vaultKeyId: "vault-1",
      },
      unvaultOk: false,
      recentApiFailures60m: 0,
      recentApiSuccesses60m: 0,
      lastJobFailure: null,
    });
    expect(result).toMatchObject({
      applies: true,
      valid: false,
      reason: "vault_unreadable",
      code: "key_invalid",
    });
  });

  it("ignores last job failure from before the key was updated", () => {
    const lastJobFailure = {
      entryId: "job-1",
      title: "Senior Engineer",
      company: "Acme",
      error: "API key was rejected",
      code: "provider_error",
      failedAt: new Date("2026-01-01T12:00:00Z"),
    };
    const keyUpdatedAt = new Date("2026-01-02T12:00:00Z");

    expect(ignoreStaleKeyFailure(lastJobFailure, keyUpdatedAt)).toBeNull();
  });

  it("surfaces last job key failure message", () => {
    const lastJobFailure = {
      entryId: "job-1",
      title: "Senior Engineer",
      company: "Acme",
      error: "API key was rejected. Update your key in AI Keys and try again.",
      code: "provider_error",
      failedAt: new Date(),
    };

    const result = evaluateByokKeyGate({
      preference: "customer",
      vaultKeyId: "vault-1",
      activeProvider: "gemini",
      route: {
        mode: "customer",
        provider: "gemini",
        modelId: "gemini-2.5-flash",
        modelCandidates: ["gemini-2.5-flash"],
        vaultKeyId: "vault-1",
      },
      unvaultOk: true,
      recentApiFailures60m: 0,
      recentApiSuccesses60m: 0,
      lastJobFailure,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("last_job_key_failure");
    expect(result.message).toBe(formatLastJobKeyFailureMessage(lastJobFailure));
  });

  it("stays valid when key errors are offset by recent successful BYOK calls", () => {
    const result = evaluateByokKeyGate({
      preference: "auto",
      vaultKeyId: "vault-1",
      activeProvider: "gemini",
      route: {
        mode: "customer",
        provider: "gemini",
        modelId: "gemini-2.5-flash",
        modelCandidates: ["gemini-2.5-flash"],
        vaultKeyId: "vault-1",
      },
      unvaultOk: true,
      recentApiFailures60m: 1,
      recentApiSuccesses60m: 2,
      lastJobFailure: null,
    });

    expect(result.valid).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("flags recent_api_failures only when no successes in the window", () => {
    const result = evaluateByokKeyGate({
      preference: "customer",
      vaultKeyId: "vault-1",
      activeProvider: "gemini",
      route: {
        mode: "customer",
        provider: "gemini",
        modelId: "gemini-2.5-flash",
        modelCandidates: ["gemini-2.5-flash"],
        vaultKeyId: "vault-1",
      },
      unvaultOk: true,
      recentApiFailures60m: 2,
      recentApiSuccesses60m: 0,
      lastJobFailure: null,
    });

    expect(result).toMatchObject({
      valid: false,
      reason: "recent_api_failures",
      code: "key_invalid",
    });
  });
});

describe("parsePipelineMetadataError", () => {
  it("reads pipeline errors from job metadata", () => {
    expect(
      parsePipelineMetadataError({
        pipelineError: "API key was rejected",
        pipelineErrorCode: "provider_error",
      }),
    ).toEqual({
      error: "API key was rejected",
      code: "provider_error",
    });
  });

  it("detects key-related enhance failures", () => {
    expect(
      isKeyRelatedPipelineError(
        "Daily enhancement limit reached (5/day). Add your API key for more.",
        "quota_enhancement",
      ),
    ).toBe(false);
    expect(isKeyRelatedPipelineError("API key was rejected", "provider_error")).toBe(true);
  });
});
