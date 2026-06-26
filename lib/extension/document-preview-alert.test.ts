import { describe, expect, it } from "vitest";
import {
  DOCUMENT_PREVIEW_USE_MY_KEY_LABEL,
  formatDocumentPreviewErrorMessage,
  renderDocumentPreviewAlert,
} from "@/src/shared/extension/document-preview-alert";

describe("formatDocumentPreviewErrorMessage", () => {
  it("maps generic 500 to enhance guidance", () => {
    expect(formatDocumentPreviewErrorMessage("Request failed (500)")).toContain(
      "Enhance failed",
    );
  });

  it("passes through other messages", () => {
    expect(formatDocumentPreviewErrorMessage("Could not download this document.")).toBe(
      "Could not download this document.",
    );
  });
});

describe("resolveEnhanceFallbackWarning", () => {
  it("uses BYOK copy for customer mode", async () => {
    const { resolveEnhanceFallbackWarning, ENHANCE_BYOK_KEY_FAILED_MESSAGE } = await import(
      "@/src/shared/extension/document-preview-alert"
    );
    expect(resolveEnhanceFallbackWarning("customer")).toBe(ENHANCE_BYOK_KEY_FAILED_MESSAGE);
  });

  it("uses system copy otherwise", async () => {
    const { resolveEnhanceFallbackWarning, ENHANCE_SYSTEM_FALLBACK_MESSAGE } = await import(
      "@/src/shared/extension/document-preview-alert"
    );
    expect(resolveEnhanceFallbackWarning("system")).toBe(ENHANCE_SYSTEM_FALLBACK_MESSAGE);
  });
});

describe("renderDocumentPreviewAlert", () => {
  it("renders assertive alert with escaped message", () => {
    const html = renderDocumentPreviewAlert("Request failed (500)", (s) => s);
    expect(html).toContain('class="document-preview-alert"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("Enhance failed");
  });

  it("renders BYOK choice buttons when pool is down", () => {
    const html = renderDocumentPreviewAlert("Shared AI unavailable", (s) => s, {
      showUseMyKey: true,
      documentKind: "resume",
    });
    expect(html).toContain("data-enhance-use-my-key");
    expect(html).toContain(DOCUMENT_PREVIEW_USE_MY_KEY_LABEL);
    expect(html).toContain("data-fix-ai-dashboard");
  });

  it("renders fix key button when AI fallback used with BYOK", () => {
    const html = renderDocumentPreviewAlert("Your API key didn't work.", (s) => s, {
      showAiSettingsFix: true,
      aiSettingsFixPath: "/dashboard/keys",
      aiSettingsFixLabel: "Fix in AI Keys",
    });
    expect(html).toContain("data-fix-ai-dashboard");
    expect(html).toContain('data-fix-path="/dashboard/keys"');
    expect(html).toContain("Fix in AI Keys");
  });
});
