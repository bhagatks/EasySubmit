import { describe, expect, it } from "vitest";
import {
  evaluateByokKeyGate,
  formatLastJobKeyFailureMessage,
  isKeyRelatedPipelineError,
  parsePipelineMetadataError,
} from "@/src/lib/ai/engine/byok-key-gate";

describe("evaluateByokKeyGate", () => {
  it("does not apply on EasySubmit system-only preference without vault", () => {
    const result = evaluateByokKeyGate({
      preference: "system",
      vaultKeyId: null,
      activeProvider: null,
      route: { mode: "system", modelId: "gemini" },
      unvaultOk: null,
      recentApiFailures60m: 0,
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
      route: { mode: "system", modelId: "gemini" },
      unvaultOk: null,
      recentApiFailures60m: 0,
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
        vaultKeyId: "vault-1",
      },
      unvaultOk: false,
      recentApiFailures60m: 0,
      lastJobFailure: null,
    });
    expect(result).toMatchObject({
      applies: true,
      valid: false,
      reason: "vault_unreadable",
      code: "key_invalid",
    });
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
        vaultKeyId: "vault-1",
      },
      unvaultOk: true,
      recentApiFailures60m: 0,
      lastJobFailure,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("last_job_key_failure");
    expect(result.message).toBe(formatLastJobKeyFailureMessage(lastJobFailure));
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
