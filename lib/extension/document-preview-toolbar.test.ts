import { describe, expect, it } from "vitest";
import { renderDocumentPreviewToolbar } from "@/src/shared/extension/document-preview-toolbar";

const baseInput = {
  editing: false,
  dirty: false,
  saving: false,
  editLoading: false,
  downloadsEnabled: true,
  downloadBusy: null,
  enhanceEnabled: true,
  enhanceBusy: false,
} as const;

describe("renderDocumentPreviewToolbar", () => {
  it("renders view-mode controls with edit, enhance, downloads, and studio", () => {
    const html = renderDocumentPreviewToolbar({
      ...baseInput,
      kind: "resume",
    });

    expect(html).toContain('data-card-back="1"');
    expect(html).toContain('data-resume-detail-edit="1"');
    expect(html).toContain('data-document-enhance="1"');
    expect(html).toContain('data-hint="Back"');
    expect(html).toContain('data-hint="Edit here"');
    expect(html).toContain('data-hint="Enhance with AI"');
    expect(html).toContain('data-hint="Download Word"');
    expect(html).toContain('data-hint="Download PDF"');
    expect(html).toContain('data-document-download="doc"');
    expect(html).toContain('data-document-download="pdf"');
    expect(html).toContain("preview-download-btn--doc");
    expect(html).toContain("preview-download-btn--pdf");
    expect(html).toContain("preview-word-line");
    expect(html).toContain("preview-pdf-label");
    expect(html.indexOf('data-resume-detail-edit="1"')).toBeLessThan(
      html.indexOf('data-document-enhance="1"'),
    );
    expect(html.indexOf('data-document-enhance="1"')).toBeLessThan(
      html.indexOf('data-document-download="doc"'),
    );
    expect(html).toContain('data-hint="Edit in Studio Web"');
    expect(html).toContain('data-open-dashboard-header="1"');
    expect(html).not.toContain("Studio Edition");
    expect(html).not.toContain("detail-save-btn");
  });

  it("shows save and discard icons while editing with unsaved changes", () => {
    const html = renderDocumentPreviewToolbar({
      kind: "cover",
      editing: true,
      dirty: true,
      saving: false,
      editLoading: false,
      downloadsEnabled: false,
      downloadBusy: null,
      enhanceEnabled: false,
      enhanceBusy: false,
    });

    expect(html).toContain('data-cover-detail-save="1"');
    expect(html).not.toContain('data-cover-detail-save="1" hidden');
    expect(html).toContain('aria-label="Save changes"');
    expect(html).toContain('aria-label="Discard changes"');
    expect(html).toMatch(/data-document-enhance="1"[\s\S]*disabled/);
    expect(html).toMatch(/data-document-download="pdf"[\s\S]*disabled/);
  });
});
