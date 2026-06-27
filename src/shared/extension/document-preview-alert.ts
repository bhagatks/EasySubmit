import { SETTINGS_ADD_KEY_HREF, SETTINGS_AI_AUTO_HREF } from "@/lib/dashboard/settings-ai-links";

const ENHANCE_SERVER_ERROR =
  "Enhance failed — server error. Try again or check AI Keys in Settings.";

export const ENHANCE_BYOK_KEY_FAILED_MESSAGE =
  "Your API key didn't work. Fix it in AI Keys and try again.";

export const ENHANCE_SYSTEM_FALLBACK_MESSAGE =
  "EasySubmit AI failed. Try again or add your own key in AI Settings.";

export const DOCUMENT_PREVIEW_USE_MY_KEY_LABEL = "Use my API key";
export const DOCUMENT_PREVIEW_AI_SETTINGS_LABEL = "AI Settings";
export const DOCUMENT_PREVIEW_FIX_KEY_LABEL = "Fix in AI Keys";

export type DocumentPreviewAlertOptions = {
  showUseMyKey?: boolean;
  documentKind?: "resume" | "cover";
  /** Link to AI Keys or Settings when enhance used non-AI fallback. */
  showAiSettingsFix?: boolean;
  aiSettingsFixPath?: string;
  aiSettingsFixLabel?: string;
};

/** Short copy when AI failed and deterministic keyword fallback ran instead. */
export function resolveEnhanceFallbackWarning(aiMode?: string | null): string {
  return aiMode === "customer"
    ? ENHANCE_BYOK_KEY_FAILED_MESSAGE
    : ENHANCE_SYSTEM_FALLBACK_MESSAGE;
}

export function resolveEnhanceFallbackSettingsPath(aiMode?: string | null): string {
  return aiMode === "customer" ? SETTINGS_ADD_KEY_HREF : SETTINGS_AI_AUTO_HREF;
}

/** User-facing copy for document preview toolbar errors (enhance, download, save). */
export function formatDocumentPreviewErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;
  if (/^request failed \(500\)$/i.test(trimmed)) return ENHANCE_SERVER_ERROR;
  if (/^enhance failed/i.test(trimmed)) return trimmed;
  return trimmed;
}

export function renderDocumentPreviewAlert(
  message: string,
  escapeHtml: (value: string) => string,
  options: DocumentPreviewAlertOptions = {},
): string {
  const text = formatDocumentPreviewErrorMessage(message);
  const safe = escapeHtml(text);
  let actions = "";
  if (options.showUseMyKey && options.documentKind) {
    actions = `<div class="document-preview-alert-actions">
          <button type="button" class="document-preview-alert-btn document-preview-alert-btn-primary" data-enhance-use-my-key="1" data-document-kind="${escapeHtml(options.documentKind)}" aria-label="${escapeHtml(DOCUMENT_PREVIEW_USE_MY_KEY_LABEL)}">${escapeHtml(DOCUMENT_PREVIEW_USE_MY_KEY_LABEL)}</button>
          <button type="button" class="document-preview-alert-btn" data-fix-ai-dashboard="1" data-fix-path="${escapeHtml(SETTINGS_AI_AUTO_HREF)}" aria-label="${escapeHtml(DOCUMENT_PREVIEW_AI_SETTINGS_LABEL)}">${escapeHtml(DOCUMENT_PREVIEW_AI_SETTINGS_LABEL)}</button>
        </div>`;
  } else if (options.showAiSettingsFix && options.aiSettingsFixPath) {
    const fixLabel = options.aiSettingsFixLabel ?? DOCUMENT_PREVIEW_AI_SETTINGS_LABEL;
    actions = `<div class="document-preview-alert-actions">
          <button type="button" class="document-preview-alert-btn document-preview-alert-btn-primary" data-fix-ai-dashboard="1" data-fix-path="${escapeHtml(options.aiSettingsFixPath)}" aria-label="${escapeHtml(fixLabel)}">${escapeHtml(fixLabel)}</button>
        </div>`;
  }

  return `<div class="document-preview-alert" role="alert" aria-live="assertive">
    <p class="document-preview-alert-message" title="${safe}">${safe}</p>
    ${actions}
  </div>`;
}

export function documentPreviewStackStyles(): string {
  return `
    .document-preview-stack {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      min-width: 0;
    }
    .document-preview-alert {
      flex-shrink: 0;
      margin: 0 0 8px;
      padding: 10px 12px;
      border-radius: 12px;
      background: #FEF2F2;
      border: 1px solid rgba(239, 68, 68, 0.28);
      border-left: 3px solid #EF4444;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
      color: #991B1B;
      position: relative;
      z-index: 2;
    }
    .document-preview-alert-message {
      margin: 0;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.45;
      word-break: break-word;
    }
    .document-preview-alert-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .document-preview-alert-btn {
      flex: 1 1 auto;
      min-width: 0;
      padding: 7px 10px;
      border-radius: 12px;
      border: 1px solid rgba(239, 68, 68, 0.35);
      background: #fff;
      color: #991B1B;
      font-family: inherit;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.2;
      cursor: pointer;
    }
    .document-preview-alert-btn:hover {
      background: #FEF2F2;
    }
    .document-preview-alert-btn-primary {
      background: #991B1B;
      border-color: #991B1B;
      color: #fff;
    }
    .document-preview-alert-btn-primary:hover {
      background: #7F1D1D;
    }
    .document-preview-stack .preview-toolbar {
      flex-shrink: 0;
    }
    .document-preview-stack .expand-scroll {
      flex: 1 1 auto;
      min-height: 0;
    }
  `;
}
