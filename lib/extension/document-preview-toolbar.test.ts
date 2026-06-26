import { describe, expect, it } from "vitest";
import { renderDocumentPreviewToolbar } from "@/src/shared/extension/document-preview-toolbar";

describe("renderDocumentPreviewToolbar", () => {
  it("renders view-mode controls with pencil edit and download buttons", () => {
    const html = renderDocumentPreviewToolbar({
      kind: "resume",
      editing: false,
      dirty: false,
      saving: false,
      editLoading: false,
      downloadsEnabled: true,
      downloadBusy: null,
    });

    expect(html).toContain('data-card-back="1"');
    expect(html).toContain('data-resume-detail-edit="1"');
    expect(html).toContain('aria-label="Edit"');
    expect(html).toContain('data-document-download="doc"');
    expect(html).toContain('data-document-download="pdf"');
    expect(html.indexOf('data-document-download="doc"')).toBeLessThan(
      html.indexOf('data-document-download="pdf"'),
    );
    expect(html).toContain("Edit in Studio");
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
    });

    expect(html).toContain('data-cover-detail-save="1"');
    expect(html).not.toContain('data-cover-detail-save="1" hidden');
    expect(html).toContain('aria-label="Save changes"');
    expect(html).toContain('aria-label="Discard changes"');
    expect(html).toMatch(/data-document-download="pdf"[\s\S]*disabled/);
  });
});
