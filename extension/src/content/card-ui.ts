import { APPLY_JD_MIN_CHARS } from "@shared/extension/apply-gate";
import { brandExtensionTokens } from "@shared/brand-colors";
import { extensionButtonClass } from "@shared/brand-buttons";
import { JOB_CARD_PANEL_DEFAULT_MAX_HEIGHT, JOB_CARD_PANEL_MIN_HEIGHT } from "@shared/extension/card-position";
import type { JobDetailDraft } from "@shared/extension/job-detail-edit";
import type { CoverDetailDraft } from "@shared/extension/cover-detail-edit";
import type { ResumeDetailDraft } from "@shared/extension/resume-detail-edit";
import {
  RESUME_DETAIL_FIELD_KEYS,
  RESUME_DETAIL_FIELD_LABELS,
  RESUME_DETAIL_TEXTAREA_KEYS,
  RESUME_DETAIL_TEXTAREA_LABELS,
} from "@shared/extension/resume-detail-edit";
import {
  LOADING_JOB_MESSAGE,
  MANUAL_CAPTURE_MESSAGE,
  MANUAL_CAPTURE_TITLE,
} from "@shared/extension/card-presentation";

import {
  CARD_NAV_LABELS,
  CARD_STUDIO_LABEL,
  extensionCardLayoutStyles,
} from "@shared/extension/card-layout-tokens";
import {
  documentPreviewToolbarStyles,
  renderDocumentPreviewToolbar,
} from "@shared/extension/document-preview-toolbar";

export { CARD_NAV_LABELS, CARD_STUDIO_LABEL };

const EXTERNAL_LINK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`;

function renderSecondaryEditButton(
  attrs: string,
  label: string,
  options?: { withIcon?: boolean },
): string {
  const icon = options?.withIcon ? EXTERNAL_LINK_ICON : "";
  return `<button type="button" class="${extensionButtonClass("secondary")}" ${attrs}><span>${label}</span>${icon}</button>`;
}

export type ProfileSetupScreen1Draft = {
  authorized: string;
  authorizedCountry: string;
  requiresSponsorship: string;
  salaryMin: string;
  salaryMax: string;
  earliestStart: string;
  workMode: string;
};

export type ProfileSetupScreen2Draft = {
  gender: string;
  veteran: string;
  disability: string;
};

export function profileSetupStyles(): string {
  const t = brandExtensionTokens();
  return `
    .profile-setup-title { font-size: 14px; font-weight: 700; color: #1F2937; margin: 0 0 4px; }
    .profile-setup-skip {
      display: inline-block; margin-bottom: 8px; font-size: 11px; font-weight: 600;
      color: ${t.primary}; background: none; border: none; padding: 0; cursor: pointer;
    }
    .profile-setup-skip:hover { text-decoration: underline; }
    .profile-setup-note { font-size: 11px; color: #64748B; margin: 0 0 10px; line-height: 1.4; }
    .profile-setup-actions { margin-top: 12px; }
    .profile-setup-actions .cta { width: 100%; }
  `;
}

export function defaultProfileSetupScreen1Draft(): ProfileSetupScreen1Draft {
  return {
    authorized: "yes",
    authorizedCountry: "US",
    requiresSponsorship: "no",
    salaryMin: "",
    salaryMax: "",
    earliestStart: "2_weeks",
    workMode: "flexible",
  };
}

export function defaultProfileSetupScreen2Draft(): ProfileSetupScreen2Draft {
  return {
    gender: "prefer_not_to_say",
    veteran: "prefer_not_to_say",
    disability: "prefer_not_to_say",
  };
}

export function renderProfileSetupScreen1(
  draft: ProfileSetupScreen1Draft,
  escapeHtml: (value: string) => string,
): string {
  return `
    <h2 class="profile-setup-title">Application profile</h2>
    <p class="profile-setup-note">One-time setup — your pipeline is already running in the background.</p>
    <div class="capture-form">
      <div class="capture-field">
        <label for="es-auth-status">Work authorization</label>
        <select id="es-auth-status" data-profile-authorized="1">
          <option value="yes"${draft.authorized === "yes" ? " selected" : ""}>Authorized to work</option>
          <option value="no"${draft.authorized === "no" ? " selected" : ""}>Need authorization</option>
        </select>
      </div>
      <div class="capture-field">
        <label for="es-auth-country">Authorized country</label>
        <input id="es-auth-country" data-profile-country="1" type="text" value="${escapeHtml(draft.authorizedCountry)}" />
      </div>
      <div class="capture-field">
        <label for="es-sponsorship">Visa sponsorship needed?</label>
        <select id="es-sponsorship" data-profile-sponsorship="1">
          <option value="no"${draft.requiresSponsorship === "no" ? " selected" : ""}>No</option>
          <option value="yes"${draft.requiresSponsorship === "yes" ? " selected" : ""}>Yes</option>
        </select>
      </div>
      <div class="capture-field">
        <label for="es-salary-min">Desired salary (min)</label>
        <input id="es-salary-min" data-profile-salary-min="1" type="number" min="0" value="${escapeHtml(draft.salaryMin)}" />
      </div>
      <div class="capture-field">
        <label for="es-salary-max">Desired salary (max)</label>
        <input id="es-salary-max" data-profile-salary-max="1" type="number" min="0" value="${escapeHtml(draft.salaryMax)}" />
      </div>
      <div class="capture-field">
        <label for="es-earliest-start">Earliest start date</label>
        <select id="es-earliest-start" data-profile-earliest-start="1">
          <option value="immediately"${draft.earliestStart === "immediately" ? " selected" : ""}>Immediately</option>
          <option value="2_weeks"${draft.earliestStart === "2_weeks" ? " selected" : ""}>2 weeks</option>
          <option value="1_month"${draft.earliestStart === "1_month" ? " selected" : ""}>1 month</option>
          <option value="flexible"${draft.earliestStart === "flexible" ? " selected" : ""}>Flexible</option>
        </select>
      </div>
      <div class="capture-field">
        <label for="es-work-mode">Work mode preference</label>
        <select id="es-work-mode" data-profile-work-mode="1">
          <option value="remote"${draft.workMode === "remote" ? " selected" : ""}>Remote</option>
          <option value="hybrid"${draft.workMode === "hybrid" ? " selected" : ""}>Hybrid</option>
          <option value="onsite"${draft.workMode === "onsite" ? " selected" : ""}>On-site</option>
          <option value="flexible"${draft.workMode === "flexible" ? " selected" : ""}>Flexible</option>
        </select>
      </div>
    </div>
    <div class="profile-setup-actions">
      <button type="button" class="cta cta-primary" data-profile-continue="1">Continue</button>
    </div>
  `;
}

export function renderProfileSetupScreen2(
  draft: ProfileSetupScreen2Draft,
  escapeHtml: (value: string) => string,
): string {
  const preferOption = (value: string, current: string) =>
    current === value ? " selected" : "";

  return `
    <button type="button" class="profile-setup-skip" data-profile-skip-all="1">Skip all →</button>
    <h2 class="profile-setup-title">Optional details</h2>
    <p class="profile-setup-note">EEO fields are optional — skip anytime.</p>
    <div class="capture-form">
      <div class="capture-field">
        <label for="es-gender">Gender identity</label>
        <select id="es-gender" data-profile-gender="1">
          <option value="prefer_not_to_say"${preferOption("prefer_not_to_say", draft.gender)}>Prefer not to say</option>
          <option value="woman"${preferOption("woman", draft.gender)}>Woman</option>
          <option value="man"${preferOption("man", draft.gender)}>Man</option>
          <option value="non_binary"${preferOption("non_binary", draft.gender)}>Non-binary</option>
        </select>
      </div>
      <div class="capture-field">
        <label for="es-veteran">Veteran status</label>
        <select id="es-veteran" data-profile-veteran="1">
          <option value="prefer_not_to_say"${preferOption("prefer_not_to_say", draft.veteran)}>Prefer not to say</option>
          <option value="not_veteran"${preferOption("not_veteran", draft.veteran)}>Not a veteran</option>
          <option value="veteran"${preferOption("veteran", draft.veteran)}>Veteran</option>
        </select>
      </div>
      <div class="capture-field">
        <label for="es-disability">Disability status</label>
        <select id="es-disability" data-profile-disability="1">
          <option value="prefer_not_to_say"${preferOption("prefer_not_to_say", draft.disability)}>Prefer not to say</option>
          <option value="no"${preferOption("no", draft.disability)}>No</option>
          <option value="yes"${preferOption("yes", draft.disability)}>Yes</option>
        </select>
      </div>
    </div>
    <div class="profile-setup-actions">
      <button type="button" class="cta cta-primary" data-profile-finish="1">Finish setup</button>
    </div>
  `;
}

export function readProfileSetupScreen1FromDom(root: ParentNode): ProfileSetupScreen1Draft {
  const authorized = (root.querySelector("[data-profile-authorized]") as HTMLSelectElement | null)?.value ?? "yes";
  const authorizedCountry =
    (root.querySelector("[data-profile-country]") as HTMLInputElement | null)?.value.trim() || "US";
  const requiresSponsorship =
    (root.querySelector("[data-profile-sponsorship]") as HTMLSelectElement | null)?.value ?? "no";
  const salaryMin = (root.querySelector("[data-profile-salary-min]") as HTMLInputElement | null)?.value ?? "";
  const salaryMax = (root.querySelector("[data-profile-salary-max]") as HTMLInputElement | null)?.value ?? "";
  const earliestStart =
    (root.querySelector("[data-profile-earliest-start]") as HTMLSelectElement | null)?.value ?? "2_weeks";
  const workMode = (root.querySelector("[data-profile-work-mode]") as HTMLSelectElement | null)?.value ?? "flexible";
  return {
    authorized,
    authorizedCountry,
    requiresSponsorship,
    salaryMin,
    salaryMax,
    earliestStart,
    workMode,
  };
}

export function readProfileSetupScreen2FromDom(root: ParentNode): ProfileSetupScreen2Draft {
  return {
    gender: (root.querySelector("[data-profile-gender]") as HTMLSelectElement | null)?.value ?? "prefer_not_to_say",
    veteran: (root.querySelector("[data-profile-veteran]") as HTMLSelectElement | null)?.value ?? "prefer_not_to_say",
    disability:
      (root.querySelector("[data-profile-disability]") as HTMLSelectElement | null)?.value ?? "prefer_not_to_say",
  };
}

export type ManualCaptureDraft = {
  jobUrl: string;
  description: string;
  title: string;
  company: string;
};

export function manualCaptureStyles(): string {
  const t = brandExtensionTokens();
  return `
    .capture-form { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
    .capture-field label {
      display: block; font-size: 11px; font-weight: 600; color: #64748B; margin-bottom: 4px;
    }
    .capture-field input, .capture-field textarea {
      width: 100%; box-sizing: border-box; border: 1px solid #E5E7EB; border-radius: 12px;
      padding: 8px 10px; font-size: 12px; font-family: inherit; color: #1F2937;
      background: #fff;
    }
    .capture-field textarea { min-height: 88px; resize: vertical; }
    .capture-hint { font-size: 11px; color: #64748B; margin: 0; }
    .assist-card .assist-list { margin: 8px 0 0; padding: 0; list-style: none; }
    .assist-card .assist-item {
      display: flex; justify-content: space-between; gap: 8px; padding: 6px 0;
      border-bottom: 1px solid #F1F5F9; font-size: 11px;
    }
    .assist-card .assist-item:last-child { border-bottom: none; }
    .assist-label { font-weight: 600; color: #1F2937; }
    .assist-hint { color: #64748B; white-space: nowrap; }
    .assist-hint.assist-warning { color: #B45309; font-weight: 600; }
    .card-subtitle { font-size: 12px; color: #64748B; margin: 0 0 8px; line-height: 1.45; }
    .secondary-cta {
      width: 100%; margin-top: 8px; border: 1px solid #E5E7EB; background: #F9FAFB;
      color: #1F2937; border-radius: 12px; padding: 10px 12px; font-size: 12px; font-weight: 600;
      cursor: pointer;
    }
    .secondary-cta:hover { background: #F3F4F6; }
    .applied-badge {
      display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
      color: ${t.primaryMuted};
    }
  `;
}

export function renderManualCaptureBody(
  draft: ManualCaptureDraft,
  escapeHtml: (value: string) => string,
): string {
  const descriptionLength = draft.description.trim().length;
  return `
    <h2 class="title">${escapeHtml(MANUAL_CAPTURE_TITLE)}</h2>
    <p class="card-subtitle">${escapeHtml(MANUAL_CAPTURE_MESSAGE)}</p>
    <div class="capture-form">
      <div class="capture-field">
        <label for="es-job-url">Job URL</label>
        <input id="es-job-url" data-capture-url="1" type="url" value="${escapeHtml(draft.jobUrl)}" />
      </div>
      <div class="capture-field">
        <label for="es-job-description">Job description</label>
        <textarea id="es-job-description" data-capture-description="1">${escapeHtml(draft.description)}</textarea>
        <p class="capture-hint">${descriptionLength}/${APPLY_JD_MIN_CHARS} characters</p>
      </div>
      <div class="capture-field">
        <label for="es-job-title">Role (optional)</label>
        <input id="es-job-title" data-capture-title="1" type="text" value="${escapeHtml(draft.title)}" />
      </div>
      <div class="capture-field">
        <label for="es-job-company">Company (optional)</label>
        <input id="es-job-company" data-capture-company="1" type="text" value="${escapeHtml(draft.company)}" />
      </div>
    </div>
  `;
}

export function renderLoadingBody(escapeHtml: (value: string) => string): string {
  return `
    <h2 class="title">${escapeHtml(LOADING_JOB_MESSAGE)}</h2>
    <p class="card-subtitle">Hang tight — we're pulling the job description from this page.</p>
  `;
}

export function renderPanelResizeGripMarkup(): string {
  return `<button type="button" class="panel-resize-grip" data-panel-resize-grip="1" aria-label="Drag to resize panel">
    <svg class="panel-resize-grip-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
      <path d="M4 12 12 4"/>
      <path d="M8 12 12 8"/>
      <path d="M4 8 8 4"/>
    </svg>
  </button>`;
}

export function panelResizeStyles(): string {
  const t = brandExtensionTokens();
  return `
    .glossy-stack.is-panel-resizable { position: relative; }
    .glossy-stack.is-panel-resizable .body-expanded {
      height: var(--es-panel-body-height, min(70vh, ${JOB_CARD_PANEL_DEFAULT_MAX_HEIGHT}px));
      max-height: none;
      min-height: ${JOB_CARD_PANEL_MIN_HEIGHT}px;
      box-sizing: border-box;
    }
    .glossy-stack.is-panel-resizing,
    .glossy-stack.is-panel-resizing * {
      transition: none !important;
    }
    .glossy-stack.is-panel-resizing {
      will-change: width;
    }
    .glossy-stack.is-panel-resizing .body-expanded {
      will-change: height;
    }
    .glossy-stack.is-panel-resizing .preview-frame {
      pointer-events: none;
    }
    .panel-resize-grip {
      position: absolute;
      left: -6px;
      bottom: -6px;
      top: auto;
      z-index: 12;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      padding: 0;
      border: 1px solid #E5E7EB;
      border-radius: 8px 0 12px 0;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
      color: #9CA3AF;
      cursor: nwse-resize;
      touch-action: none;
      user-select: none;
    }
    .panel-resize-grip:hover {
      border-color: ${t.a35};
      color: ${t.primaryMuted};
      background: #fff;
    }
    .panel-resize-grip.dragging {
      border-color: ${t.a35};
      color: ${t.primaryMuted};
      box-shadow: 0 4px 14px ${t.a20};
    }
    .panel-resize-grip-icon {
      width: 12px;
      height: 12px;
      pointer-events: none;
    }
  `;
}

export function singleCardLayoutStyles(): string {
  const t = brandExtensionTokens();
  return `
    ${extensionCardLayoutStyles()}
    ${documentPreviewToolbarStyles()}
    .glossy-shell.is-expanded .white-card { overflow: hidden; }
    .row-left {
      font-size: 13px;
      color: #6B7280;
      line-height: 1.35;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .journey-status {
      color: ${t.primaryMuted};
    }
    .expand-header {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .expand-header .es-btn-secondary {
      margin-left: auto;
      flex-shrink: 0;
    }
    .detail-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .detail-toolbar .detail-save-btn[hidden] {
      display: none;
    }
    .detail-toolbar .es-btn-primary,
    .detail-toolbar .es-btn-secondary,
    .detail-toolbar .detail-status-cta {
      width: auto;
      flex-shrink: 0;
    }
    .detail-toolbar .detail-status-cta {
      margin-left: auto;
    }
    .detail-input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 12px;
      font-family: inherit;
      color: #1F2937;
      background: #fff;
    }
    .detail-input:focus {
      outline: none;
      border-color: ${t.a35};
      box-shadow: 0 0 0 2px ${t.a08};
    }
    textarea.detail-input {
      min-height: 120px;
      resize: vertical;
      line-height: 1.45;
    }
    .detail-title-input {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: var(--es-section-gap, 12px);
    }
    .back-btn {
      border: none;
      background: none;
      padding: 0;
      font-size: 12px;
      font-weight: 600;
      color: #6B7280;
      cursor: pointer;
    }
    .back-btn:hover { color: #1F2937; }
    .expand-scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-anchor: none;
      overscroll-behavior: contain;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
      background: #fff;
    }
    .expand-scroll-preview {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      overscroll-behavior: contain;
      padding: 0;
    }
    .expand-scroll-edit {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 0;
    }
    .cover-edit-textarea {
      flex: 1 1 auto;
      min-height: 200px;
      width: 100%;
      box-sizing: border-box;
      border: none;
      border-radius: 12px;
      padding: 12px;
      font-size: 12px;
      line-height: 1.5;
      font-family: inherit;
      color: #1F2937;
      background: #fff;
      resize: none;
    }
    .cover-edit-textarea:focus {
      outline: none;
      box-shadow: inset 0 0 0 2px ${t.a08};
    }
    .expand-scroll-fields {
      overflow-y: auto;
      overscroll-behavior: contain;
    }
    .detail-field { margin: 0 0 var(--es-hero-gap, 10px); }
    .detail-field-label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #9CA3AF;
      margin: 0 0 3px;
    }
    .detail-field-value {
      margin: 0;
      font-size: 12px;
      line-height: 1.45;
      color: #1F2937;
      white-space: pre-wrap;
    }
    .detail-description {
      margin: 12px 0 0;
      padding-top: 12px;
      border-top: 1px solid #F1F5F9;
    }
    .preview-frame {
      width: 100%;
      min-height: 240px;
      border: none;
      display: block;
      background: #fff;
    }
    .expand-scroll-preview .preview-frame {
      flex: 1 1 auto;
      min-height: 240px;
      height: 100%;
    }
    .preview-placeholder {
      padding: 20px 14px;
      font-size: 12px;
      color: #6B7280;
      text-align: center;
    }
    .preview-error {
      padding: 14px;
      font-size: 12px;
      color: #B91C1C;
      line-height: 1.4;
    }
  `;
}

export type SummaryCardInput = {
  title: string;
  company: string | null;
  showMetaRow: boolean;
  showReviewRow: boolean;
  statusLabel: string | null;
  showPrimaryCta: boolean;
  showAppliedActions: boolean;
  ctaClass: string;
  ctaLabel: string;
  ctaDisabled: boolean;
  ctaIcon: string;
  applyHint: string | null;
  saveError: string | null;
  escapeHtml: (value: string) => string;
};

export function renderSummaryCardBody(input: SummaryCardInput): string {
  const companyRow = input.showMetaRow
    ? `<div class="row-split">
        <span class="row-left">${input.company ? input.escapeHtml(input.company) : "Company unknown"}</span>
        ${renderSecondaryEditButton('data-open-job-detail="1"', CARD_NAV_LABELS.jobInfo)}
      </div>`
    : "";

  const reviewRow = input.showReviewRow
    ? `<div class="review-row">
        ${renderSecondaryEditButton('data-open-resume-preview="1"', CARD_NAV_LABELS.resume)}
        ${renderSecondaryEditButton('data-open-cover-preview="1"', CARD_NAV_LABELS.coverLetter)}
      </div>`
    : "";

  const statusMarkup =
    input.statusLabel && input.statusLabel !== input.ctaLabel
      ? `<p class="journey-status">${input.escapeHtml(input.statusLabel)}</p>`
      : "";

  const statusInHero =
    statusMarkup && !input.showPrimaryCta && !input.showAppliedActions ? statusMarkup : "";
  const statusInActions =
    statusMarkup && (input.showPrimaryCta || input.showAppliedActions) ? statusMarkup : "";

  const saveErrorMarkup = (message: string) => {
    const text = input.escapeHtml(message);
    return `<p class="save-error" role="alert" title="${text}">${text}</p>`;
  };

  const errors = [
    !input.showPrimaryCta && input.applyHint
      ? `<p class="save-error">${input.escapeHtml(input.applyHint)}</p>`
      : "",
    input.saveError ? saveErrorMarkup(input.saveError) : "",
  ]
    .filter(Boolean)
    .join("");

  const heroBlock = `
    <div class="card-hero">
      <h2 class="title">${input.escapeHtml(input.title)}</h2>
      ${companyRow}
      ${reviewRow}
      ${statusInHero}
      ${!input.showPrimaryCta && !input.showAppliedActions ? errors : ""}
    </div>`;

  const actionsBlock =
    input.showPrimaryCta || input.showAppliedActions
      ? `<div class="card-actions">
          ${statusInActions}
          <button type="button" class="${input.ctaClass}" data-save="1"${input.ctaDisabled ? " disabled" : ""}>${input.ctaIcon}<span>${input.escapeHtml(input.ctaLabel)}</span></button>
          ${input.showPrimaryCta && input.applyHint ? `<p class="save-error">${input.escapeHtml(input.applyHint)}</p>` : ""}
          ${input.showPrimaryCta && input.saveError ? saveErrorMarkup(input.saveError) : ""}
        </div>`
      : "";

  return `${heroBlock}${actionsBlock}`;
}

export type JobDetailBodyInput = {
  draft: JobDetailDraft;
  fields: Array<{ label: string; value: string }>;
  description: string | null;
  editing: boolean;
  dirty: boolean;
  saving: boolean;
  showStatusCta: boolean;
  statusCtaClass: string;
  statusCtaLabel: string;
  statusCtaDisabled: boolean;
  statusCtaIcon: string;
  saveError: string | null;
  escapeHtml: (value: string) => string;
};

const JOB_DETAIL_FIELD_KEYS = [
  "company",
  "location",
  "salaryText",
  "platform",
  "qualifications",
  "responsibilities",
  "incentives",
] as const;

type JobDetailFieldKey = (typeof JOB_DETAIL_FIELD_KEYS)[number];

const JOB_DETAIL_FIELD_LABELS: Record<JobDetailFieldKey, string> = {
  company: "Company",
  location: "Location",
  salaryText: "Salary",
  platform: "Platform",
  qualifications: "Qualifications",
  responsibilities: "Responsibilities",
  incentives: "Benefits",
};

function renderDetailSaveButton(
  saveAttr: string,
  dirty: boolean,
  saving: boolean,
): string {
  return `<button type="button" class="${extensionButtonClass("primary")} detail-save-btn" ${saveAttr}${dirty ? "" : " hidden"}${saving ? " disabled" : ""}><span>Save</span></button>`;
}

function renderDetailToolbar(input: {
  editing: boolean;
  dirty: boolean;
  saving: boolean;
  editLoading?: boolean;
  editAttr: string;
  saveAttr: string;
}): string {
  const saveButton = input.editing
    ? renderDetailSaveButton(input.saveAttr, input.dirty, input.saving)
    : "";
  const editLabel = input.editing ? "Done" : "Edit";
  const editDisabled = input.editLoading ? " disabled" : "";
  return `
    <div class="detail-toolbar">
      ${saveButton}
      <button type="button" class="${extensionButtonClass("secondary")}" ${input.editAttr}${editDisabled}><span>${input.editLoading ? "Loading…" : editLabel}</span></button>
    </div>`;
}

export function updateDetailToolbarDirtyState(
  root: ParentNode,
  input: { saveSelector: string; dirty: boolean; saving: boolean },
): void {
  const saveBtn = root.querySelector(input.saveSelector) as HTMLButtonElement | null;
  if (!saveBtn) return;
  saveBtn.hidden = !input.dirty;
  saveBtn.disabled = input.saving;
}

export function updateJobDetailDescriptionHint(root: ParentNode, length: number): void {
  const hint = root.querySelector(".detail-description .capture-hint");
  if (hint) {
    hint.textContent = `${length}/${APPLY_JD_MIN_CHARS} characters`;
  }
}

function renderExpandHeader(panel: "job" | "resume" | "cover"): string {
  return `
    <div class="expand-header">
      <button type="button" class="back-btn" data-card-back="1">← Back</button>
      ${renderSecondaryEditButton(`data-open-dashboard-header="1" data-panel="${panel}"`, CARD_STUDIO_LABEL, { withIcon: true })}
    </div>`;
}
function renderDetailFieldValue(
  label: string,
  value: string,
  escapeHtml: (value: string) => string,
): string {
  return `
    <div class="detail-field">
      <span class="detail-field-label">${escapeHtml(label)}</span>
      <p class="detail-field-value">${escapeHtml(value)}</p>
    </div>`;
}

function renderDetailFieldInput(
  key: JobDetailFieldKey,
  label: string,
  value: string,
  escapeHtml: (value: string) => string,
): string {
  return `
    <div class="detail-field">
      <label class="detail-field-label" for="es-detail-${key}">${escapeHtml(label)}</label>
      <input
        id="es-detail-${key}"
        class="detail-input"
        type="text"
        data-job-detail-field="${key}"
        value="${escapeHtml(value)}"
      />
    </div>`;
}

export function readJobDetailDraftFromDom(root: ParentNode, fallback: JobDetailDraft): JobDetailDraft {
  const readValue = (selector: string) =>
    (root.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | null)?.value ??
    "";

  return {
    title: readValue("[data-job-detail-title]") || fallback.title,
    company: readValue('[data-job-detail-field="company"]'),
    location: readValue('[data-job-detail-field="location"]'),
    salaryText: readValue('[data-job-detail-field="salaryText"]'),
    platform: readValue('[data-job-detail-field="platform"]') || fallback.platform,
    description: readValue("[data-job-detail-description]"),
    qualifications: readValue('[data-job-detail-field="qualifications"]'),
    responsibilities: readValue('[data-job-detail-field="responsibilities"]'),
    incentives: readValue('[data-job-detail-field="incentives"]'),
  };
}

export function renderJobDetailBody(input: JobDetailBodyInput): string {
  const saveButton = input.editing
    ? renderDetailSaveButton('data-job-detail-save="1"', input.dirty, input.saving)
    : input.dirty
      ? renderDetailSaveButton('data-job-detail-save="1"', true, input.saving)
      : "";

  const editLabel = input.editing ? "Done" : "Edit";
  const statusCta = input.showStatusCta
    ? `<button type="button" class="${input.statusCtaClass} detail-status-cta" data-job-detail-status="1"${input.statusCtaDisabled ? " disabled" : ""}>${input.statusCtaIcon}<span>${input.escapeHtml(input.statusCtaLabel)}</span></button>`
    : "";

  const saveErrorMarkup = input.saveError
    ? `<p class="save-error" role="alert">${input.escapeHtml(input.saveError)}</p>`
    : "";

  let fieldsMarkup = "";
  if (input.editing) {
    fieldsMarkup = JOB_DETAIL_FIELD_KEYS.map((key) =>
      renderDetailFieldInput(key, JOB_DETAIL_FIELD_LABELS[key], input.draft[key], input.escapeHtml),
    ).join("");
  } else {
    fieldsMarkup = input.fields
      .map((field) => renderDetailFieldValue(field.label, field.value, input.escapeHtml))
      .join("");
  }

  const titleMarkup = input.editing
    ? `<label class="detail-field-label" for="es-detail-title">Title</label>
       <input
         id="es-detail-title"
         class="detail-input detail-title-input"
         type="text"
         data-job-detail-title="1"
         value="${input.escapeHtml(input.draft.title)}"
       />`
    : `<h2 class="title detail-view-title">${input.escapeHtml(input.draft.title)}</h2>`;

  const descriptionMarkup = input.editing
    ? `<div class="detail-description">
        <label class="detail-field-label" for="es-detail-description">Job description</label>
        <textarea id="es-detail-description" class="detail-input" data-job-detail-description="1">${input.escapeHtml(input.draft.description)}</textarea>
        <p class="capture-hint">${input.draft.description.trim().length}/${APPLY_JD_MIN_CHARS} characters</p>
      </div>`
    : input.description
      ? `<div class="detail-description">
          <span class="detail-field-label">Job description</span>
          <p class="detail-field-value">${input.escapeHtml(input.description)}</p>
        </div>`
      : "";

  return `
      ${renderExpandHeader("job")}
    <div class="detail-toolbar">
      ${saveButton}
      <button type="button" class="${extensionButtonClass("secondary")}" data-job-detail-edit="1"><span>${editLabel}</span></button>
      ${statusCta}
    </div>
    ${saveErrorMarkup}
    <div class="expand-scroll">
      <div class="detail-fields">
        ${titleMarkup}
        ${fieldsMarkup}
        ${descriptionMarkup}
      </div>
    </div>
  `;
}

export function readCoverDetailDraftFromDom(root: ParentNode, fallback: CoverDetailDraft): CoverDetailDraft {
  const body =
    (root.querySelector("[data-cover-detail-body]") as HTMLTextAreaElement | null)?.value ?? fallback.body;
  return { body };
}

export function readResumeDetailDraftFromDom(
  root: ParentNode,
  fallback: ResumeDetailDraft,
): ResumeDetailDraft {
  const readValue = (selector: string) =>
    (root.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? "";

  return {
    targetTitle: readValue('[data-resume-detail-field="targetTitle"]') || fallback.targetTitle,
    firstName: readValue('[data-resume-detail-field="firstName"]'),
    lastName: readValue('[data-resume-detail-field="lastName"]'),
    email: readValue('[data-resume-detail-field="email"]'),
    phone: readValue('[data-resume-detail-field="phone"]'),
    cityState: readValue('[data-resume-detail-field="cityState"]'),
    linkedIn: readValue('[data-resume-detail-field="linkedIn"]'),
    professionalSummary: readValue('[data-resume-detail-field="professionalSummary"]'),
    skillsText: readValue('[data-resume-detail-field="skillsText"]'),
  };
}

function renderResumeScalarField(
  key: (typeof RESUME_DETAIL_FIELD_KEYS)[number],
  value: string,
  editing: boolean,
  escapeHtml: (value: string) => string,
): string {
  const label = RESUME_DETAIL_FIELD_LABELS[key];
  if (!editing) {
    return renderDetailFieldValue(label, value, escapeHtml);
  }
  return `
    <div class="detail-field">
      <label class="detail-field-label" for="es-resume-${key}">${escapeHtml(label)}</label>
      <input
        id="es-resume-${key}"
        class="detail-input"
        type="text"
        data-resume-detail-field="${key}"
        value="${escapeHtml(value)}"
      />
    </div>`;
}

function renderResumeTextareaField(
  key: (typeof RESUME_DETAIL_TEXTAREA_KEYS)[number],
  value: string,
  editing: boolean,
  escapeHtml: (value: string) => string,
): string {
  const label = RESUME_DETAIL_TEXTAREA_LABELS[key];
  if (!editing) {
    return renderDetailFieldValue(label, value, escapeHtml);
  }
  return `
    <div class="detail-field">
      <label class="detail-field-label" for="es-resume-${key}">${escapeHtml(label)}</label>
      <textarea
        id="es-resume-${key}"
        class="detail-input"
        data-resume-detail-field="${key}"
      >${escapeHtml(value)}</textarea>
    </div>`;
}

export type CoverPreviewBodyInput = {
  state: "loading" | "error" | "ready";
  previewHtml?: string;
  error?: string;
  editing: boolean;
  editLoading: boolean;
  dirty: boolean;
  saving: boolean;
  downloadBusy: "pdf" | "doc" | null;
  draft: CoverDetailDraft;
  saveError: string | null;
  escapeHtml: (value: string) => string;
};

export function renderCoverPreviewBody(input: CoverPreviewBodyInput): string {
  const saveErrorMarkup = input.saveError
    ? `<p class="save-error" role="alert">${input.escapeHtml(input.saveError)}</p>`
    : "";

  let scrollClass = "expand-scroll";
  let scrollContent = `<p class="preview-placeholder">Loading preview…</p>`;

  if (input.state === "error") {
    scrollContent = `<p class="preview-error">${input.escapeHtml(input.error ?? "Could not load preview.")}</p>`;
  } else if (input.editing) {
    scrollClass = "expand-scroll expand-scroll-edit";
    scrollContent = `<textarea class="cover-edit-textarea" data-cover-detail-body="1">${input.escapeHtml(input.draft.body)}</textarea>`;
  } else if (input.state === "ready" && input.previewHtml) {
    scrollClass = "expand-scroll expand-scroll-preview";
    scrollContent = `<iframe class="preview-frame" data-preview-frame="1" title="Cover letter preview"></iframe>`;
  }

  return `
    ${renderDocumentPreviewToolbar({
      kind: "cover",
      editing: input.editing,
      dirty: input.dirty,
      saving: input.saving,
      editLoading: input.editLoading,
      downloadsEnabled: !input.editing && input.state === "ready",
      downloadBusy: input.downloadBusy,
    })}
    ${saveErrorMarkup}
    <div class="${scrollClass}">${scrollContent}</div>
  `;
}

export type ResumePreviewBodyInput = {
  state: "loading" | "error" | "ready";
  previewHtml?: string;
  error?: string;
  editing: boolean;
  editLoading: boolean;
  dirty: boolean;
  saving: boolean;
  downloadBusy: "pdf" | "doc" | null;
  draft: ResumeDetailDraft;
  saveError: string | null;
  escapeHtml: (value: string) => string;
};

export function renderResumePreviewBody(input: ResumePreviewBodyInput): string {
  const saveErrorMarkup = input.saveError
    ? `<p class="save-error" role="alert">${input.escapeHtml(input.saveError)}</p>`
    : "";

  let scrollClass = "expand-scroll";
  let scrollContent = `<p class="preview-placeholder">Loading preview…</p>`;

  if (input.state === "error") {
    scrollContent = `<p class="preview-error">${input.escapeHtml(input.error ?? "Could not load preview.")}</p>`;
  } else if (input.editing) {
    scrollClass = "expand-scroll expand-scroll-fields";
    const fieldsMarkup = [
      ...RESUME_DETAIL_FIELD_KEYS.map((key) =>
        renderResumeScalarField(key, input.draft[key], true, input.escapeHtml),
      ),
      ...RESUME_DETAIL_TEXTAREA_KEYS.map((key) =>
        renderResumeTextareaField(key, input.draft[key], true, input.escapeHtml),
      ),
    ].join("");
    scrollContent = `<div class="detail-fields">${fieldsMarkup}</div>`;
  } else if (input.state === "ready" && input.previewHtml) {
    scrollClass = "expand-scroll expand-scroll-preview";
    scrollContent = `<iframe class="preview-frame" data-preview-frame="1" title="Resume preview"></iframe>`;
  }

  return `
    ${renderDocumentPreviewToolbar({
      kind: "resume",
      editing: input.editing,
      dirty: input.dirty,
      saving: input.saving,
      editLoading: input.editLoading,
      downloadsEnabled: !input.editing && input.state === "ready",
      downloadBusy: input.downloadBusy,
    })}
    ${saveErrorMarkup}
    <div class="${scrollClass}">${scrollContent}</div>
  `;
}
