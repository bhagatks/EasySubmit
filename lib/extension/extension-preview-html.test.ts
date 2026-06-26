import { describe, expect, it } from "vitest";
import {
  EXTENSION_EMBED_PREVIEW_CSS,
  prepareExtensionEmbedPreview,
} from "@/lib/extension/extension-preview-html";
import { buildResumePreviewHtml } from "@/lib/job-tracker/export/resume-preview-html";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";

describe("prepareExtensionEmbedPreview", () => {
  it("removes toolbar spacer and injects narrow-panel css", () => {
    const html = buildResumePreviewHtml(
      { ...emptyHubRefineryForm(), firstName: "Ada", lastName: "Lovelace" },
      "Engineer",
    );

    const prepared = prepareExtensionEmbedPreview(html);

    expect(prepared).not.toContain('class="toolbar-spacer"');
    expect(prepared).toContain(EXTENSION_EMBED_PREVIEW_CSS.trim());
    expect(prepared).toContain("overflow-x: hidden");
  });
});
