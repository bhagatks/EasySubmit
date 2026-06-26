import { extensionButtonClass } from "../brand-buttons";
import { CARD_STUDIO_LABEL } from "./card-layout-tokens";

const EXTERNAL_LINK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`;

const ICONS = {
  chevronLeft: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`,
  pencil: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  download: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M5 21h14"/></svg>`,
  spinner: `<svg class="preview-icon-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
} as const;

export type DocumentPreviewKind = "resume" | "cover";

export type DocumentPreviewToolbarInput = {
  kind: DocumentPreviewKind;
  editing: boolean;
  dirty: boolean;
  saving: boolean;
  editLoading: boolean;
  downloadsEnabled: boolean;
  downloadBusy: "pdf" | "doc" | null;
};

function renderIconButton(input: {
  className: string;
  attrs: string;
  title: string;
  ariaLabel: string;
  icon: string;
  disabled?: boolean;
  hidden?: boolean;
}): string {
  const hidden = input.hidden ? " hidden" : "";
  const disabled = input.disabled ? " disabled" : "";
  return `<button type="button" class="${input.className}" ${input.attrs} title="${input.title}" aria-label="${input.ariaLabel}"${hidden}${disabled}>${input.icon}</button>`;
}

function renderDownloadButton(input: {
  format: "pdf" | "doc";
  kind: DocumentPreviewKind;
  enabled: boolean;
  busy: boolean;
}): string {
  const label = input.format === "pdf" ? "PDF" : "DOC";
  const formatName = input.format === "pdf" ? "PDF" : "Word";
  const icon = input.busy ? ICONS.spinner : ICONS.download;
  const disabled = !input.enabled || input.busy ? " disabled" : "";
  return `<button type="button" class="preview-icon-btn preview-download-btn" data-document-download="${input.format}" data-document-kind="${input.kind}" title="Download ${formatName}" aria-label="Download ${formatName}"${disabled}>${icon}<span class="preview-download-label">${label}</span></button>`;
}

export function renderDocumentPreviewToolbar(input: DocumentPreviewToolbarInput): string {
  const editAttr =
    input.kind === "resume" ? 'data-resume-detail-edit="1"' : 'data-cover-detail-edit="1"';
  const saveAttr =
    input.kind === "resume" ? 'data-resume-detail-save="1"' : 'data-cover-detail-save="1"';

  const backButton = renderIconButton({
    className: "preview-icon-btn preview-back-btn",
    attrs: 'data-card-back="1"',
    title: "Back to job",
    ariaLabel: "Back to job",
    icon: ICONS.chevronLeft,
  });

  let editControls = "";
  if (input.editing) {
    editControls += renderIconButton({
      className: `${extensionButtonClass("primary")} preview-icon-btn preview-save-btn detail-save-btn`,
      attrs: saveAttr,
      title: input.saving ? "Saving…" : "Save changes",
      ariaLabel: input.saving ? "Saving…" : "Save changes",
      icon: input.saving ? ICONS.spinner : ICONS.check,
      disabled: input.saving,
      hidden: !input.dirty,
    });
    editControls += renderIconButton({
      className: "preview-icon-btn",
      attrs: editAttr,
      title: "Discard changes",
      ariaLabel: "Discard changes",
      icon: ICONS.close,
      disabled: input.editLoading || input.saving,
    });
  } else {
    editControls += renderIconButton({
      className: "preview-icon-btn",
      attrs: editAttr,
      title: "Edit",
      ariaLabel: "Edit",
      icon: ICONS.pencil,
      disabled: input.editLoading,
    });
  }

  const downloads = `
    ${renderDownloadButton({
      format: "doc",
      kind: input.kind,
      enabled: input.downloadsEnabled,
      busy: input.downloadBusy === "doc",
    })}
    ${renderDownloadButton({
      format: "pdf",
      kind: input.kind,
      enabled: input.downloadsEnabled,
      busy: input.downloadBusy === "pdf",
    })}
  `;

  const studioButton = `<button type="button" class="${extensionButtonClass("secondary")} preview-studio-btn" data-open-dashboard-header="1" data-panel="${input.kind === "resume" ? "resume" : "cover"}" title="${CARD_STUDIO_LABEL}" aria-label="${CARD_STUDIO_LABEL}"><span>${CARD_STUDIO_LABEL}</span>${EXTERNAL_LINK_ICON}</button>`;

  return `
    <div class="preview-toolbar">
      ${backButton}
      ${editControls}
      <div class="preview-toolbar-spacer" aria-hidden="true"></div>
      ${downloads}
      ${studioButton}
    </div>`;
}

export function documentPreviewToolbarStyles(): string {
  return `
    .preview-toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      margin: 0 0 var(--es-detail-header-mb);
    }
    .preview-toolbar-spacer {
      flex: 1;
      min-width: 4px;
    }
    .preview-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
      background: #fff;
      padding: 0;
      cursor: pointer;
      color: #6B7280;
      flex-shrink: 0;
      box-sizing: border-box;
    }
    .preview-icon-btn:hover:not(:disabled) {
      color: #1F2937;
      border-color: #D1D5DB;
    }
    .preview-icon-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .preview-icon-btn[hidden] {
      display: none;
    }
    .preview-icon-btn svg {
      width: 14px;
      height: 14px;
      pointer-events: none;
    }
    .preview-back-btn svg {
      width: 16px;
      height: 16px;
    }
    .preview-save-btn {
      width: 32px;
      height: 32px;
      padding: 0;
      min-width: 32px;
    }
    .preview-save-btn svg {
      width: 14px;
      height: 14px;
    }
    .preview-download-btn {
      width: 36px;
      height: 36px;
      flex-direction: column;
      gap: 1px;
    }
    .preview-download-label {
      font-size: 9px;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0.02em;
      pointer-events: none;
    }
    .preview-studio-btn {
      flex-shrink: 0;
      margin-left: 0;
    }
    .preview-studio-btn svg {
      width: 12px;
      height: 12px;
      pointer-events: none;
    }
    @keyframes es-preview-icon-spin {
      to { transform: rotate(360deg); }
    }
    .preview-icon-spin {
      animation: es-preview-icon-spin 0.8s linear infinite;
    }
  `;
}
