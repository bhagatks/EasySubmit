import { extensionButtonClass } from "../brand-buttons";
import {
  escapeHintAttr,
  floatingHintStyles,
  FLOATING_HINT_BUTTON_CLASS,
} from "./floating-hint-styles";
import { PDF_DOWNLOAD_ICON_SVG, WORD_DOWNLOAD_ICON_SVG } from "./format-download-icon-svg";

const ICONS = {
  chevronLeft: `<svg class="preview-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="preview-back-chevron" d="m15 18-6-6 6-6"/></svg>`,
  pencil: `<svg class="preview-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="preview-edit-line" d="M12 20h9"/><path class="preview-edit-pencil" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`,
  sparkles: `<svg class="preview-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="preview-spark-main" d="M9.937 15.5A2 2 0 0 0 8.5 14.062l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.964 0z"/><path class="preview-spark-plus-a" d="M20 3v4"/><path class="preview-spark-plus-b" d="M22 5h-4"/><path class="preview-spark-plus-c" d="M4 17v2"/><path class="preview-spark-plus-d" d="M5 18H3"/></svg>`,
  check: `<svg class="preview-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
  close: `<svg class="preview-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="preview-discard-a" d="M18 6 6 18"/><path class="preview-discard-b" d="m6 6 12 12"/></svg>`,
  spinner: `<svg class="preview-icon-spin preview-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
  studioWeb: `<svg class="preview-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="preview-studio-arrow" d="M15 3h6v6"/><path class="preview-studio-line" d="M10 14 21 3"/><path class="preview-studio-box" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,
} as const;

export const PREVIEW_TOOLBAR_HINTS = {
  back: "Back",
  edit: "Edit here",
  enhance: "Enhance with AI",
  downloadWord: "Download Word",
  downloadPdf: "Download PDF",
  studioWeb: "Edit in Studio Web",
  save: "Save changes",
  discard: "Discard changes",
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
  enhanceEnabled: boolean;
  enhanceBusy: boolean;
};

function escapeAttr(value: string): string {
  return escapeHintAttr(value);
}

function renderIconButton(input: {
  className: string;
  attrs: string;
  hint: string;
  ariaLabel?: string;
  icon: string;
  disabled?: boolean;
  hidden?: boolean;
}): string {
  const hidden = input.hidden ? " hidden" : "";
  const disabled = input.disabled ? " disabled" : "";
  const hint = escapeAttr(input.hint);
  const ariaLabel = escapeAttr(input.ariaLabel ?? input.hint);
  return `<button type="button" class="${input.className} ${FLOATING_HINT_BUTTON_CLASS}" ${input.attrs} data-hint="${hint}" title="${hint}" aria-label="${ariaLabel}"${hidden}${disabled}>${input.icon}</button>`;
}

function renderDownloadButton(input: {
  format: "pdf" | "doc";
  kind: DocumentPreviewKind;
  enabled: boolean;
  busy: boolean;
}): string {
  const hint =
    input.format === "pdf" ? PREVIEW_TOOLBAR_HINTS.downloadPdf : PREVIEW_TOOLBAR_HINTS.downloadWord;
  const icon =
    input.busy
      ? ICONS.spinner
      : input.format === "pdf"
        ? PDF_DOWNLOAD_ICON_SVG
        : WORD_DOWNLOAD_ICON_SVG;
  return renderIconButton({
    className: `preview-icon-btn preview-download-btn preview-download-btn--${input.format}`,
    attrs: `data-document-download="${input.format}" data-document-kind="${input.kind}"`,
    hint,
    icon,
    disabled: !input.enabled || input.busy,
  });
}

export function renderDocumentPreviewToolbar(input: DocumentPreviewToolbarInput): string {
  const editAttr =
    input.kind === "resume" ? 'data-resume-detail-edit="1"' : 'data-cover-detail-edit="1"';
  const saveAttr =
    input.kind === "resume" ? 'data-resume-detail-save="1"' : 'data-cover-detail-save="1"';

  const backButton = renderIconButton({
    className: "preview-icon-btn preview-back-btn",
    attrs: 'data-card-back="1"',
    hint: PREVIEW_TOOLBAR_HINTS.back,
    icon: ICONS.chevronLeft,
  });

  let editControls = "";
  if (input.editing) {
    editControls += renderIconButton({
      className: `${extensionButtonClass("primary")} preview-icon-btn preview-save-btn detail-save-btn`,
      attrs: saveAttr,
      hint: input.saving ? "Saving…" : PREVIEW_TOOLBAR_HINTS.save,
      ariaLabel: input.saving ? "Saving…" : PREVIEW_TOOLBAR_HINTS.save,
      icon: input.saving ? ICONS.spinner : ICONS.check,
      disabled: input.saving,
      hidden: !input.dirty,
    });
    editControls += renderIconButton({
      className: "preview-icon-btn",
      attrs: editAttr,
      hint: PREVIEW_TOOLBAR_HINTS.discard,
      icon: ICONS.close,
      disabled: input.editLoading || input.saving,
    });
  } else {
    editControls += renderIconButton({
      className: "preview-icon-btn",
      attrs: editAttr,
      hint: PREVIEW_TOOLBAR_HINTS.edit,
      icon: ICONS.pencil,
      disabled: input.editLoading,
    });
  }

  const enhanceButton = renderIconButton({
    className: "preview-icon-btn preview-enhance-btn",
    attrs: `data-document-enhance="1" data-document-kind="${input.kind}"`,
    hint: PREVIEW_TOOLBAR_HINTS.enhance,
    icon: input.enhanceBusy ? ICONS.spinner : ICONS.sparkles,
    disabled: !input.enhanceEnabled || input.enhanceBusy || input.editing,
  });

  const studioButton = renderIconButton({
    className: `${extensionButtonClass("secondary")} preview-icon-btn preview-studio-btn`,
    attrs: `data-open-dashboard-header="1" data-panel="${input.kind === "resume" ? "resume" : "cover"}"`,
    hint: PREVIEW_TOOLBAR_HINTS.studioWeb,
    icon: ICONS.studioWeb,
  });

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

  return `
    <div class="preview-toolbar">
      <div class="preview-toolbar-icons">
        ${backButton}
        ${editControls}
        ${enhanceButton}
        ${downloads}
        ${studioButton}
      </div>
    </div>`;
}

export function documentPreviewToolbarStyles(): string {
  return `
    .preview-toolbar {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
      flex-shrink: 0;
      margin: 0 0 var(--es-detail-header-mb);
      overflow: visible;
    }
    .preview-toolbar-icons {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: nowrap;
      min-width: 0;
      overflow: visible;
    }
    ${floatingHintStyles()}
    .preview-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
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
      transform-origin: center;
    }
    .preview-back-btn svg {
      width: 16px;
      height: 16px;
    }
    .preview-enhance-btn:not(:disabled) {
      color: #6366F1;
      border-color: rgba(99, 102, 241, 0.35);
      background: rgba(99, 102, 241, 0.06);
    }
    .preview-studio-btn:not(:disabled) {
      color: #6366F1;
      border-color: rgba(99, 102, 241, 0.28);
      background: rgba(99, 102, 241, 0.04);
    }
    .preview-save-btn {
      width: 34px;
      height: 34px;
      padding: 0;
      min-width: 34px;
    }
    .preview-save-btn svg {
      width: 14px;
      height: 14px;
    }
    .preview-download-btn svg {
      width: 15px;
      height: 15px;
    }
    .preview-format-icon .preview-pdf-label {
      pointer-events: none;
    }
    .preview-icon-btn:hover:not(:disabled) .preview-word-line {
      animation: es-preview-word-scan 0.75s ease;
    }
    .preview-icon-btn:hover:not(:disabled) .preview-pdf-label {
      animation: es-preview-pdf-pulse 0.55s ease;
    }
    .preview-icon-btn:hover:not(:disabled) .preview-back-chevron {
      animation: es-preview-back-nudge 0.45s ease;
    }
    .preview-icon-btn:hover:not(:disabled) .preview-edit-pencil {
      animation: es-preview-edit-tilt 0.5s ease;
    }
    .preview-icon-btn:hover:not(:disabled) .preview-spark-main {
      animation: es-preview-spark-pulse 0.65s ease;
    }
    .preview-icon-btn:hover:not(:disabled) .preview-spark-plus-a,
    .preview-icon-btn:hover:not(:disabled) .preview-spark-plus-b,
    .preview-icon-btn:hover:not(:disabled) .preview-spark-plus-c,
    .preview-icon-btn:hover:not(:disabled) .preview-spark-plus-d {
      animation: es-preview-spark-twinkle 0.55s ease;
    }
    .preview-icon-btn:hover:not(:disabled) .preview-dl-head {
      animation: es-preview-dl-bounce 0.55s ease;
    }
    .preview-icon-btn:hover:not(:disabled) .preview-studio-arrow,
    .preview-icon-btn:hover:not(:disabled) .preview-studio-line {
      animation: es-preview-studio-launch 0.55s ease;
    }
    .preview-icon-btn:hover:not(:disabled) .preview-discard-a,
    .preview-icon-btn:hover:not(:disabled) .preview-discard-b {
      animation: es-preview-discard-pop 0.4s ease;
    }
    @keyframes es-preview-back-nudge {
      0%, 100% { transform: translateX(0); }
      45% { transform: translateX(-2px); }
    }
    @keyframes es-preview-edit-tilt {
      0%, 100% { transform: rotate(0deg); }
      40% { transform: rotate(-12deg) translateY(-1px); }
      70% { transform: rotate(4deg); }
    }
    @keyframes es-preview-spark-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.08); opacity: 0.88; }
    }
    @keyframes es-preview-spark-twinkle {
      0%, 100% { opacity: 0.55; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.15); }
    }
    @keyframes es-preview-dl-bounce {
      0%, 100% { transform: translateY(0); }
      45% { transform: translateY(2px); }
    }
    @keyframes es-preview-word-scan {
      0% { opacity: 0.4; stroke-dasharray: 2 10; stroke-dashoffset: 6; }
      50% { opacity: 1; stroke-dasharray: 10 2; stroke-dashoffset: 0; }
      100% { opacity: 0.6; stroke-dasharray: 2 10; stroke-dashoffset: -6; }
    }
    @keyframes es-preview-pdf-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.08); opacity: 0.9; }
    }
    @keyframes es-preview-studio-launch {
      0%, 100% { transform: translate(0, 0); }
      45% { transform: translate(1px, -1px); }
    }
    @keyframes es-preview-discard-pop {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }
    @media (prefers-reduced-motion: reduce) {
      .preview-icon-btn:hover:not(:disabled) .preview-back-chevron,
      .preview-icon-btn:hover:not(:disabled) .preview-edit-pencil,
      .preview-icon-btn:hover:not(:disabled) .preview-spark-main,
      .preview-icon-btn:hover:not(:disabled) .preview-spark-plus-a,
      .preview-icon-btn:hover:not(:disabled) .preview-spark-plus-b,
      .preview-icon-btn:hover:not(:disabled) .preview-spark-plus-c,
      .preview-icon-btn:hover:not(:disabled) .preview-spark-plus-d,
      .preview-icon-btn:hover:not(:disabled) .preview-dl-head,
      .preview-icon-btn:hover:not(:disabled) .preview-word-line,
      .preview-icon-btn:hover:not(:disabled) .preview-pdf-label,
      .preview-icon-btn:hover:not(:disabled) .preview-studio-arrow,
      .preview-icon-btn:hover:not(:disabled) .preview-studio-line,
      .preview-icon-btn:hover:not(:disabled) .preview-discard-a,
      .preview-icon-btn:hover:not(:disabled) .preview-discard-b {
        animation: none;
      }
    }
    @keyframes es-preview-icon-spin {
      to { transform: rotate(360deg); }
    }
    .preview-icon-spin {
      animation: es-preview-icon-spin 0.8s linear infinite;
    }
  `;
}
