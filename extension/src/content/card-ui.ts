import { APPLY_JD_MIN_CHARS } from "@shared/extension/apply-gate";
import type { AssistFieldSuggestion } from "@shared/extension/assist-suggestions";
import {
  LOADING_JOB_MESSAGE,
  MANUAL_CAPTURE_MESSAGE,
  MANUAL_CAPTURE_TITLE,
} from "@shared/extension/card-presentation";

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
  return `
    .profile-setup-title { font-size: 14px; font-weight: 700; color: #1F2937; margin: 0 0 4px; }
    .profile-setup-skip {
      display: inline-block; margin-bottom: 8px; font-size: 11px; font-weight: 600;
      color: #12B3D1; background: none; border: none; padding: 0; cursor: pointer;
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
      color: #0E7490;
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

export function renderAssistCardMarkup(
  suggestions: AssistFieldSuggestion[],
  escapeHtml: (value: string) => string,
): string {
  const items =
    suggestions.length > 0
      ? suggestions
          .map(
            (item) => `
        <li class="assist-item">
          <span class="assist-label">${escapeHtml(item.label)}</span>
          <span class="assist-hint${item.warning ? " assist-warning" : ""}">${item.warning ? "⚠ " : ""}${escapeHtml(item.hint)}</span>
        </li>`,
          )
          .join("")
      : `<li class="assist-item"><span class="assist-label">No form fields detected yet</span><span class="assist-hint">Navigate to apply step</span></li>`;

  return `
    <div class="card white-card assist-card" part="assist-card">
      <div class="body" style="padding: 12px;">
        <p class="card-subtitle" style="margin-bottom: 4px; font-weight: 700; color: #0E7490;">Apply assist</p>
        <p class="card-subtitle">Field suggestions for this application step.</p>
        <ul class="assist-list">${items}</ul>
        <button type="button" class="secondary-cta" data-mark-applied="1">Mark as applied</button>
      </div>
    </div>
  `;
}

export function renderResumeReadyCardMarkup(
  profileLabel: string,
  escapeHtml: (value: string) => string,
): string {
  return `
    <div class="card white-card" part="resume-card">
      <div class="body" style="padding: 12px;">
        <p class="card-subtitle" style="margin-bottom: 4px; font-weight: 700; color: #0E7490;">Resume ready</p>
        <p class="card-subtitle">Tailored from <strong>${escapeHtml(profileLabel)}</strong></p>
        <button type="button" class="secondary-cta" data-review-resume="1">Review in dashboard</button>
      </div>
    </div>
  `;
}
