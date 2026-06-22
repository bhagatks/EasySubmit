import { setupBridgeRelay } from "./bridge-relay";
import { EXTENSION_MESSAGE, STORAGE_KEYS } from "@shared/extension/constants";
import { detectJobPage } from "@shared/extension/detect-job-page";
import { buildFallbackJobMetadata } from "@shared/extension/force-metadata";
import { isJobPage } from "@shared/extension/is-job-page";
import { scrapeDescription } from "@shared/extension/scrape-helpers";
import { mergeExtensionRuntimeConfig, EXTENSION_RUNTIME_DEFAULTS } from "@shared/extension/runtime-config-merge";
import {
  JOB_CARD_COLLAPSED_SIZE,
  JOB_CARD_WIDTH,
  clampFixedCardPosition,
  getCollapsedFixedCardPosition,
  getDefaultFixedCardPosition,
  type FixedCardPosition,
} from "@shared/extension/card-position";
import type {
  ExtensionResumeProfilesResponse,
  ExtensionRuntimeConfig,
  ScrapedJobMetadata,
} from "@shared/extension/types";
import { bindStageNudge, glossyShellStyles, renderStageNudgeMarkup, stageNudgeStyles, type ManualPipelineStep } from "@shared/extension/stage-nudge";
import {
  buildCaptureDiagnostics,
  logCaptureDiagnostics,
} from "@shared/extension/capture-diagnostics";
import { pollJobStatusUntil } from "@shared/extension/pipeline-status-poll";
import { runWorkdayAutofillStub } from "@shared/extension/workday-autofill-stub";

const CONTENT_INIT_KEY = "__easysubmitContentInit__";
const contentWindow = window as Window & { [CONTENT_INIT_KEY]?: boolean };
if (contentWindow[CONTENT_INIT_KEY]) {
  // Already initialized on this page (e.g. programmatic re-injection).
} else {
  contentWindow[CONTENT_INIT_KEY] = true;
  bootContentScript();
}

function bootContentScript(): void {
const HOST_ID = "easysubmit-job-card-host";
const CARD_WIDTH = JOB_CARD_WIDTH;
const COLLAPSED_SIZE = JOB_CARD_COLLAPSED_SIZE;

const DEFAULT_RUNTIME_CONFIG = EXTENSION_RUNTIME_DEFAULTS;

type CardHost = {
  host: HTMLDivElement;
  shadow: ShadowRoot;
  position: FixedCardPosition;
};

let cardHost: CardHost | null = null;
let currentMetadata: ScrapedJobMetadata | null = null;
let lastScrapeContext: { path: string; enrichments: string[] } | null = null;
let savedStatus: { saved: boolean; status?: string; id?: string } = { saved: false };
let runtimeConfig: ExtensionRuntimeConfig | null = null;
let connectedAccountEmail: string | null = null;
let pinnedUrl: string | null = null;
let cardCollapsed = false;
let pipelineBusy = false;
let pipelineBusyLabel: string | null = null;
let pendingPipelinePhase: string | null = null;
let saveError: string | null = null;
let statusPollTimer: ReturnType<typeof setInterval> | null = null;
let autofillRunForEntryId: string | null = null;

type ResumeProfileOption = { id: string; label: string; isDefault: boolean };
let resumeProfiles: ResumeProfileOption[] = [];
let selectedProfileId: string | null = null;
let defaultProfileId: string | null = null;
let profilePickerOpen = false;
let settingsMenuOpen = false;

type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  onMove: (event: PointerEvent) => void;
  onEnd: (event: PointerEvent) => void;
};

let activeDrag: DragSession | null = null;

function isDragging(): boolean {
  return activeDrag !== null;
}

function stopDrag(): void {
  if (!activeDrag) return;
  window.removeEventListener("pointermove", activeDrag.onMove);
  window.removeEventListener("pointerup", activeDrag.onEnd);
  window.removeEventListener("pointercancel", activeDrag.onEnd);
  activeDrag = null;
}

function isContextValid(): boolean {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

function sendMessage<T>(message: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!isContextValid()) {
      reject(new Error("Extension context invalidated"));
      return;
    }
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response as T);
    });
  });
}

function shouldUseOneClickApply(
  meta: ScrapedJobMetadata,
  config: ExtensionRuntimeConfig | null,
): boolean {
  if (config?.autoApplyEnabled === false) return false;
  if (!config?.oneClickApply) return false;
  const platforms = config.oneClickApplyPlatforms ?? ["workday"];
  return platforms.includes(meta.platform);
}

function getPipelineUiMode(config: ExtensionRuntimeConfig | null): "auto" | "manual" {
  return config?.autoApplyEnabled === false ? "manual" : "auto";
}

function getManualPipelineStep(): ManualPipelineStep {
  if (!savedStatus.saved) return 1;
  const status = savedStatus.status;
  if (
    status === "RESUME_READY" ||
    status === "READY_TO_APPLY" ||
    status === "APPLIED"
  ) {
    return 3;
  }
  return 2;
}

function getPrimaryCtaLabel(): string {
  if (pipelineBusy) {
    return pipelineBusyLabel ?? "Preparing apply…";
  }
  if (savedStatus.saved) return "Review in dashboard";
  if (getPipelineUiMode(runtimeConfig) === "manual") {
    return "Save to Tracker";
  }
  const meta = currentMetadata;
  if (meta && shouldUseOneClickApply(meta, runtimeConfig)) {
    return "Apply with EasySubmit";
  }
  return "Save to Tracker";
}

function statusLabel(saved: boolean, status?: string): string {
  if (!saved) return "Not saved";
  if (status === "APPLIED") return "Applied";
  if (status === "RESUME_READY") return "Resume prepared";
  if (status === "READY_TO_APPLY") return "Ready to apply";
  return "Job captured";
}

function getHostWidth(): number {
  return cardCollapsed ? COLLAPSED_SIZE : CARD_WIDTH;
}

function cardStyles(): string {
  return `
    :host { all: initial; }
    .card {
      box-sizing: border-box;
      width: 100%;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      color: #1F2937;
      overflow: visible;
    }
    .grip {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 10px 8px 12px; background: #F9FAFB; border-bottom: 1px solid #E5E7EB;
      cursor: grab; user-select: none; touch-action: none;
      overflow: visible;
      position: relative;
      z-index: 5;
    }
    .grip.dragging { cursor: grabbing; }
    .grip-left { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #6B7280; font-weight: 600; min-width: 0; flex: 1; }
    .brand { font-size: 12px; font-weight: 700; letter-spacing: -0.02em; color: #1F2937; line-height: 1; white-space: nowrap; }
    .brand-suffix { color: #12B3D1; }
    .grip-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      overflow: visible;
      position: relative;
      flex-shrink: 0;
    }
    .dots { letter-spacing: 1px; color: #9CA3AF; font-size: 14px; line-height: 1; }
    .badge { font-size: 10px; padding: 2px 8px; border-radius: 999px; background: #F3F4F6; color: #6B7280; white-space: nowrap; flex-shrink: 0; }
    .badge.saved { background: rgba(18,179,209,0.12); color: #0E7490; }
    .header-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; padding: 0; border: none; border-radius: 8px;
      background: transparent; color: #9CA3AF; font-size: 18px; line-height: 1;
      cursor: pointer; flex-shrink: 0;
    }
    .header-btn:hover { background: #F3F4F6; color: #374151; }
    .header-btn svg { width: 14px; height: 14px; display: block; pointer-events: none; }
    .header-btn.is-active { color: #0E7490; background: rgba(18, 179, 209, 0.12); }
    .profile-picker-wrap {
      position: relative;
      display: inline-flex;
      z-index: 20;
    }
    .profile-picker-heading {
      margin: 0;
      padding: 6px 10px 4px;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #9CA3AF;
    }
    .profile-picker-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      left: auto;
      z-index: 30;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 12rem;
      max-width: 16rem;
      max-height: 12rem;
      overflow-x: hidden;
      overflow-y: auto;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
      background: #fff;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);
      padding: 4px;
    }
    .profile-picker-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      flex-shrink: 0;
      border: none;
      border-radius: 10px;
      background: transparent;
      padding: 8px 10px;
      text-align: left;
      font-size: 11px;
      line-height: 1.35;
      color: #1F2937;
      cursor: pointer;
      box-sizing: border-box;
    }
    .profile-picker-item:hover { background: #F3F4F6; }
    .profile-picker-item.is-selected { background: rgba(18, 179, 209, 0.1); color: #0E7490; }
    .profile-picker-item-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .profile-picker-badge {
      flex-shrink: 0;
      font-size: 9px;
      font-weight: 600;
      color: #6B7280;
    }
    .settings-menu-wrap {
      position: relative;
      display: inline-flex;
      z-index: 20;
    }
    .settings-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      z-index: 30;
      min-width: 13rem;
      max-width: 16rem;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
      background: #fff;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);
      padding: 4px;
    }
    .settings-menu-email {
      margin: 0;
      padding: 8px 10px 6px;
      font-size: 10px;
      line-height: 1.35;
      color: #6B7280;
      border-bottom: 1px solid #F3F4F6;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .settings-menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      border: none;
      border-radius: 10px;
      background: transparent;
      padding: 8px 10px;
      text-align: left;
      font-size: 11px;
      line-height: 1.35;
      color: #1F2937;
      cursor: pointer;
      box-sizing: border-box;
    }
    .settings-menu-item:hover { background: #F3F4F6; }
    .settings-menu-item svg { width: 14px; height: 14px; flex-shrink: 0; color: #6B7280; }
    .body { padding: 14px 14px 14px; position: relative; z-index: 1; }
    .title { font-size: 15px; font-weight: 700; line-height: 1.35; margin: 0 0 8px; }
    .meta { font-size: 13px; color: #6B7280; line-height: 1.45; margin: 0 0 4px; }
    .salary { font-size: 12px; color: #374151; margin: 0 0 12px; }
    .actions { margin-top: 2px; display: flex; flex-direction: column; gap: 8px; }
    .save-error {
      margin: 0;
      padding: 8px 10px;
      border-radius: 12px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #B91C1C;
      font-size: 11px;
      line-height: 1.4;
    }
    .cta {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; box-sizing: border-box;
      border: none; border-radius: 12px;
      padding: 10px 14px;
      font-size: 13px; font-weight: 600; line-height: 1.2;
      cursor: pointer;
      transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, color 0.15s ease;
    }
    .cta svg { width: 15px; height: 15px; flex-shrink: 0; pointer-events: none; }
    .cta-primary {
      background: linear-gradient(135deg, #12B3D1 0%, #0E9CB6 100%);
      color: #fff;
      box-shadow: 0 4px 14px rgba(18, 179, 209, 0.32);
    }
    .cta-primary:hover:not(:disabled) {
      box-shadow: 0 6px 18px rgba(18, 179, 209, 0.42);
      transform: translateY(-1px);
    }
    .cta-primary:active:not(:disabled) { transform: translateY(0); }
    .cta-saved {
      background: #F9FAFB;
      color: #0E7490;
      border: 1px solid rgba(18, 179, 209, 0.28);
      box-shadow: none;
    }
    .cta-saved:hover:not(:disabled) { background: rgba(18, 179, 209, 0.08); }
    .cta:disabled { opacity: 0.65; cursor: wait; transform: none; box-shadow: none; }
    .launcher {
      box-sizing: border-box;
      display: flex; align-items: center; justify-content: center;
      width: ${COLLAPSED_SIZE}px; height: ${COLLAPSED_SIZE}px;
      margin: 0; padding: 0;
      border: 1px solid rgba(18, 179, 209, 0.35);
      border-radius: 12px;
      background: linear-gradient(135deg, #12B3D1 0%, #0E9CB6 100%);
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.18);
      cursor: grab; user-select: none; touch-action: none;
      transition: box-shadow 0.2s ease, transform 0.2s ease;
    }
    .launcher:hover { box-shadow: 0 8px 22px rgba(18, 179, 209, 0.35); transform: translateY(-1px); }
    .launcher.dragging { cursor: grabbing; transform: scale(1.04); }
    .launcher img { width: 30px; height: 30px; display: block; pointer-events: none; }
  `;
}

function renderCollapsedLauncher(root: ShadowRoot): void {
  const iconUrl = chrome.runtime.getURL("icons/icon-48.png");
  root.innerHTML = `
    <style>${cardStyles()}</style>
    <button type="button" class="launcher" data-launcher="1" aria-label="Open EasySubmit.ai job card">
      <img src="${iconUrl}" alt="" />
    </button>
  `;

  const launcher = root.querySelector("[data-launcher]") as HTMLButtonElement | null;
  launcher?.addEventListener("pointerdown", onLauncherPointerDown);
}

function renderExpandedCard(root: ShadowRoot): void {
  const meta = currentMetadata;
  if (!meta) return;

  const badgeClass = savedStatus.saved ? "badge saved" : "badge";
  const ctaClass = savedStatus.saved ? "cta cta-saved" : "cta cta-primary";
  const ctaLabel = getPrimaryCtaLabel();
  const ctaDisabled = pipelineBusy ? " disabled" : "";
  const uiMode = getPipelineUiMode(runtimeConfig);
  const manualStep = getManualPipelineStep();
  const showUpdateResume = uiMode === "manual" && savedStatus.saved && manualStep === 2;
  const nudgeVariant = savedStatus.saved ? "captured" : "capture";
  const ctaIcon = savedStatus.saved
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`;

  root.innerHTML = `
    <style>${cardStyles()}${glossyShellStyles()}${stageNudgeStyles()}</style>
    <div class="glossy-stack">
      <div class="glossy-shell${savedStatus.saved ? "" : " is-live"}">
        <div class="glossy-shell-sheen" aria-hidden="true"></div>
        <div class="glossy-shell-shimmer" aria-hidden="true"></div>
        <div class="glossy-cards">
          <div class="card white-card" part="card">
            <div class="grip" data-grip="1">
              <div class="grip-left">
                <span class="dots">⋮⋮</span>
                <span class="brand"><span class="brand-name">EasySubmit</span><span class="brand-suffix">.ai</span></span>
              </div>
              <div class="grip-actions">
                <span class="${badgeClass}">${statusLabel(savedStatus.saved, savedStatus.status)}</span>
                ${renderProfilePickerMarkup()}
                ${renderSettingsMenuMarkup()}
                <button type="button" class="header-btn" data-minimize="1" aria-label="Minimize">×</button>
              </div>
            </div>
            <div class="body">
              <h2 class="title">${escapeHtml(meta.title)}</h2>
              ${meta.company ? `<p class="meta">${escapeHtml(meta.company)}</p>` : ""}
              ${meta.location ? `<p class="meta">${escapeHtml(meta.location)}</p>` : ""}
              ${meta.salaryText ? `<p class="salary">${escapeHtml(meta.salaryText)}</p>` : ""}
              <div class="actions">
                <button type="button" class="${ctaClass}" data-save="1"${ctaDisabled}>${ctaIcon}<span>${ctaLabel}</span></button>
                ${
                  showUpdateResume
                    ? `<button type="button" class="cta cta-primary" data-update-resume="1"><span>Update resume</span></button>`
                    : ""
                }
                ${saveError ? `<p class="save-error" role="alert">${escapeHtml(saveError)}</p>` : ""}
              </div>
            </div>
          </div>
          ${renderStageNudgeMarkup(nudgeVariant, { mode: uiMode, manualStep })}
        </div>
      </div>
    </div>
  `;

  root.querySelector("[data-save]")?.addEventListener("click", () => {
    void onPrimaryClick();
  });

  root.querySelector("[data-update-resume]")?.addEventListener("click", () => {
    void openUpdateResumeDashboard();
  });

  bindStageNudge(root, {
    saved: savedStatus.saved,
    onCapture: () => {
      void onPrimaryClick();
    },
    onManualStep: (step) => {
      if (step === 2) {
        void openUpdateResumeDashboard();
      }
    },
  });

  bindHeaderButton(root, "[data-minimize]", () => {
    minimizeCard();
  });
  bindSettingsMenu(root);
  bindProfilePicker(root);

  const grip = root.querySelector("[data-grip]") as HTMLElement | null;
  grip?.addEventListener("pointerdown", onGripDown);
}

function bindHeaderButton(root: ParentNode, selector: string, onActivate: () => void): void {
  const button = root.querySelector(selector);
  button?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  button?.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();
    onActivate();
  });
}

function isInteractiveGripTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("[data-minimize], [data-settings], [data-settings-dashboard], [data-settings-reconnect], .settings-menu, [data-profile-picker], [data-profile-id], .profile-picker-menu, button, a"));
}

function renderCard(root: ShadowRoot): void {
  if (!currentMetadata || isDragging()) return;
  if (cardCollapsed) {
    renderCollapsedLauncher(root);
    return;
  }
  renderExpandedCard(root);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SETTINGS_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;

const DASHBOARD_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`;

const RESUME_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>`;

function selectedProfileLabel(): string {
  const match = resumeProfiles.find((p) => p.id === selectedProfileId);
  return match?.label ?? "Resume profile";
}

let profilePickerOutsideCleanup: (() => void) | null = null;
let settingsMenuOutsideCleanup: (() => void) | null = null;
let profilePickerDelegationReady = false;
let settingsMenuDelegationReady = false;

function normalizeResumeProfileOptions(
  profiles: ExtensionResumeProfilesResponse["profiles"],
): ResumeProfileOption[] {
  if (!Array.isArray(profiles)) return [];
  return profiles
    .filter(
      (profile): profile is { id: string; label: string; isDefault: boolean } =>
        Boolean(profile && typeof profile.id === "string" && profile.id.trim()),
    )
    .map((profile) => ({
      id: profile.id.trim(),
      label:
        typeof profile.label === "string" && profile.label.trim()
          ? profile.label.trim()
          : "Untitled profile",
      isDefault: Boolean(profile.isDefault),
    }));
}

async function refreshResumeProfiles(): Promise<void> {
  const tokenRes = await sendMessage<{ token: string | null }>({ action: EXTENSION_MESSAGE.GET_AUTH });
  if (!tokenRes.token) return;

  const res = await sendMessage<ExtensionResumeProfilesResponse>({
    action: EXTENSION_MESSAGE.GET_RESUME_PROFILES,
  });
  const normalized = normalizeResumeProfileOptions(res.profiles);
  if (!res.success || normalized.length === 0) return;

  resumeProfiles = normalized;
  defaultProfileId = res.defaultProfileId ?? normalized.find((p) => p.isDefault)?.id ?? null;

  const stored = await chrome.storage.local.get(STORAGE_KEYS.selectedProfileId);
  const lastSelected =
    typeof stored[STORAGE_KEYS.selectedProfileId] === "string"
      ? stored[STORAGE_KEYS.selectedProfileId]
      : null;

  if (res.pickerMode === "LAST_SELECTED" && lastSelected) {
    const match = resumeProfiles.find((p) => p.id === lastSelected);
    if (match) {
      selectedProfileId = match.id;
      return;
    }
  }

  selectedProfileId = defaultProfileId;
}

function renderSettingsMenuMarkup(): string {
  const email = connectedAccountEmail?.trim() ?? "";
  const menu = settingsMenuOpen
    ? `<div class="settings-menu" role="menu" aria-label="Dashboard settings">
        ${email ? `<p class="settings-menu-email" title="${escapeHtml(email)}">${escapeHtml(email)}</p>` : ""}
        <button type="button" class="settings-menu-item" data-settings-dashboard="1" role="menuitem">
          ${DASHBOARD_ICON_SVG}
          <span>Open Job Tracker</span>
        </button>
        <button type="button" class="settings-menu-item" data-settings-reconnect="1" role="menuitem">
          ${SETTINGS_ICON_SVG}
          <span>Reconnect account</span>
        </button>
      </div>`
    : "";

  return `
    <div class="settings-menu-wrap">
      <button type="button" class="header-btn${settingsMenuOpen ? " is-active" : ""}" data-settings="1" aria-label="Dashboard settings${email ? `: ${email}` : ""}" title="${email ? escapeHtml(email) : "Dashboard settings"}">
        ${SETTINGS_ICON_SVG}
      </button>
      ${menu}
    </div>
  `;
}

function renderProfilePickerMarkup(): string {
  if (resumeProfiles.length === 0) return "";

  const label = escapeHtml(selectedProfileLabel());
  const menu = profilePickerOpen
    ? `<div class="profile-picker-menu" role="listbox" aria-label="Choose resume profile">
        ${resumeProfiles.length > 1 ? `<p class="profile-picker-heading">${resumeProfiles.length} profiles</p>` : ""}
        ${resumeProfiles
          .map((profile) => {
            const isSelected = profile.id === selectedProfileId;
            return `<button type="button" class="profile-picker-item${isSelected ? " is-selected" : ""}" data-profile-id="${escapeHtml(profile.id)}" role="option" aria-selected="${isSelected}">
              <span class="profile-picker-item-label">${escapeHtml(profile.label)}</span>
              ${profile.isDefault ? `<span class="profile-picker-badge">Default</span>` : ""}
            </button>`;
          })
          .join("")}
      </div>`
    : "";

  return `
    <div class="profile-picker-wrap">
      <button type="button" class="header-btn${selectedProfileId ? " is-active" : ""}" data-profile-picker="1" aria-label="Resume profile: ${label}" title="${label}">
        ${RESUME_ICON_SVG}
      </button>
      ${menu}
    </div>
  `;
}

async function selectResumeProfile(profileId: string): Promise<void> {
  if (!resumeProfiles.some((p) => p.id === profileId)) return;
  selectedProfileId = profileId;
  closeProfilePickerMenu();
  await chrome.storage.local.set({ [STORAGE_KEYS.selectedProfileId]: profileId });
  if (cardHost) renderCard(cardHost.shadow);
}

function closeSettingsMenu(): void {
  settingsMenuOpen = false;
  settingsMenuOutsideCleanup?.();
  settingsMenuOutsideCleanup = null;
}

function openSettingsMenu(): void {
  closeProfilePickerMenu();
  settingsMenuOpen = true;
  settingsMenuOutsideCleanup?.();
  settingsMenuOutsideCleanup = null;

  window.setTimeout(() => {
    const closeOnOutside = (event: MouseEvent) => {
      const path = event.composedPath();
      const inside = path.some(
        (node) =>
          node instanceof Element &&
          Boolean(
            node.closest?.(
              "[data-settings], [data-settings-dashboard], [data-settings-reconnect], .settings-menu",
            ),
          ),
      );
      if (inside) return;
      closeSettingsMenu();
      if (cardHost) renderCard(cardHost.shadow);
    };
    window.addEventListener("click", closeOnOutside, true);
    settingsMenuOutsideCleanup = () => {
      window.removeEventListener("click", closeOnOutside, true);
    };
  }, 0);
}

async function toggleSettingsMenu(): Promise<void> {
  if (settingsMenuOpen) {
    closeSettingsMenu();
    if (cardHost) renderCard(cardHost.shadow);
    return;
  }

  await refreshRuntimeConfig().catch(() => undefined);
  openSettingsMenu();
  if (cardHost) renderCard(cardHost.shadow);
}

function setupSettingsMenuDelegation(shadow: ShadowRoot): void {
  if (settingsMenuDelegationReady) return;
  settingsMenuDelegationReady = true;

  shadow.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest("[data-settings-dashboard]")) {
      event.stopPropagation();
      event.preventDefault();
      closeSettingsMenu();
      void openJobTrackerDashboard({ review: true });
      return;
    }

    if (target.closest("[data-settings-reconnect]")) {
      event.stopPropagation();
      event.preventDefault();
      closeSettingsMenu();
      void sendMessage({ action: EXTENSION_MESSAGE.OPEN_LOGIN });
      return;
    }

    if (target.closest("[data-settings]")) {
      event.stopPropagation();
      event.preventDefault();
      void toggleSettingsMenu();
    }
  });
}

function bindSettingsMenu(_root: ParentNode): void {
  // Delegated on shadow root — see setupSettingsMenuDelegation().
}

function closeProfilePickerMenu(): void {
  profilePickerOpen = false;
  profilePickerOutsideCleanup?.();
  profilePickerOutsideCleanup = null;
}

function openProfilePickerMenu(): void {
  closeSettingsMenu();
  profilePickerOpen = true;
  profilePickerOutsideCleanup?.();
  profilePickerOutsideCleanup = null;

  window.setTimeout(() => {
    const closeOnOutside = (event: MouseEvent) => {
      const path = event.composedPath();
      const insideMenuOrPicker = path.some(
        (node) =>
          node instanceof Element &&
          Boolean(
            node.closest?.("[data-profile-picker], [data-profile-id], .profile-picker-menu"),
          ),
      );
      if (insideMenuOrPicker) return;
      closeProfilePickerMenu();
      if (cardHost) renderCard(cardHost.shadow);
    };
    window.addEventListener("click", closeOnOutside, true);
    profilePickerOutsideCleanup = () => {
      window.removeEventListener("click", closeOnOutside, true);
    };
  }, 0);
}

async function toggleProfilePicker(): Promise<void> {
  if (profilePickerOpen) {
    closeProfilePickerMenu();
    if (cardHost) renderCard(cardHost.shadow);
    return;
  }

  await refreshResumeProfiles().catch(() => undefined);
  openProfilePickerMenu();
  if (cardHost) renderCard(cardHost.shadow);
}

function setupProfilePickerDelegation(shadow: ShadowRoot): void {
  if (profilePickerDelegationReady) return;
  profilePickerDelegationReady = true;

  shadow.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const profileButton = target.closest("[data-profile-id]");
    if (profileButton) {
      event.stopPropagation();
      event.preventDefault();
      const id = profileButton.getAttribute("data-profile-id");
      if (id) void selectResumeProfile(id);
      return;
    }

    if (target.closest("[data-profile-picker]")) {
      event.stopPropagation();
      event.preventDefault();
      void toggleProfilePicker();
    }
  });
}

function bindProfilePicker(_root: ParentNode): void {
  // Delegated on shadow root — see setupProfilePickerDelegation().
}

function applyHostShell(host: HTMLDivElement): void {
  host.style.cssText = [
    "all: initial",
    "position: fixed",
    "z-index: 2147483647",
    "margin: 0",
    "padding: 0",
    "border: none",
    "background: transparent",
    "pointer-events: auto",
    "width: auto",
    "height: auto",
    "display: block",
  ].join(";");
}

function setCardVisible(visible: boolean): void {
  if (!cardHost) return;
  cardHost.host.style.display = visible ? "block" : "none";
}

function applyHostPosition(host: HTMLDivElement, position: FixedCardPosition): void {
  host.style.position = "fixed";
  host.style.zIndex = "2147483646";
  host.style.margin = "0";
  host.style.width = "auto";
  host.style.maxWidth = "none";
  host.style.left = `${position.x}px`;
  host.style.top = `${position.y}px`;
  host.style.right = "auto";
  host.style.transform = "none";
}

function saveCardPosition(_hostKey: string, _position: FixedCardPosition): void {
  // Position is session-only; a full page refresh restores the default upper-left anchor.
}

function minimizeCard(): void {
  if (!cardHost) return;
  stopDrag();
  cardCollapsed = true;
  cardHost.position = getCollapsedFixedCardPosition(window.innerWidth, cardHost.position.y);
  applyHostPosition(cardHost.host, cardHost.position);
  renderCard(cardHost.shadow);
}

function expandCard(): void {
  if (!cardHost) return;
  stopDrag();
  cardCollapsed = false;
  cardHost.position = cardHost.position.custom
    ? clampFixedCardPosition(cardHost.position, CARD_WIDTH)
    : getDefaultFixedCardPosition();
  applyHostPosition(cardHost.host, cardHost.position);
  renderCard(cardHost.shadow);
}

function onViewportChange(): void {
  if (!cardHost || isDragging()) return;
  const hostWidth = getHostWidth();
  if (cardHost.position.custom) {
    cardHost.position = clampFixedCardPosition(cardHost.position, hostWidth);
  } else if (cardCollapsed) {
    cardHost.position = getCollapsedFixedCardPosition(window.innerWidth, cardHost.position.y);
  } else {
    cardHost.position = getDefaultFixedCardPosition();
  }
  applyHostPosition(cardHost.host, cardHost.position);
}

function onGripDown(e: PointerEvent): void {
  if (!cardHost || e.button !== 0 || isDragging()) return;
  if (isInteractiveGripTarget(e.target)) return;
  e.preventDefault();
  e.stopPropagation();
  bindDragTarget(e, e.currentTarget as HTMLElement, CARD_WIDTH);
}

function onLauncherPointerDown(e: PointerEvent): void {
  if (!cardHost || e.button !== 0 || isDragging()) return;
  e.preventDefault();
  e.stopPropagation();
  bindDragTarget(e, e.currentTarget as HTMLElement, COLLAPSED_SIZE, () => expandCard());
}

function bindDragTarget(
  e: PointerEvent,
  target: HTMLElement,
  hostWidth: number,
  onTap?: () => void,
): void {
  if (!cardHost) return;
  const hostKey = location.hostname;
  const rect = cardHost.host.getBoundingClientRect();
  const fixed = clampFixedCardPosition(
    { mode: "fixed", x: rect.left, y: rect.top, custom: cardHost.position.custom },
    hostWidth,
  );

  cardHost.position = fixed;
  applyHostPosition(cardHost.host, fixed);
  if (cardHost.host.parentElement !== document.documentElement) {
    document.documentElement.appendChild(cardHost.host);
  }

  target.classList.add("dragging");
  let moved = false;

  const session: DragSession = {
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    originX: fixed.x,
    originY: fixed.y,
    onMove: (ev: PointerEvent) => {
      if (!activeDrag || ev.pointerId !== activeDrag.pointerId || !cardHost) return;
      const dx = ev.clientX - activeDrag.startX;
      const dy = ev.clientY - activeDrag.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      const x = Math.max(8, Math.min(activeDrag.originX + dx, window.innerWidth - hostWidth - 8));
      const y = Math.max(
        8,
        Math.min(activeDrag.originY + dy, window.innerHeight - Math.max(hostWidth, 80)),
      );
      cardHost.position = clampFixedCardPosition({ mode: "fixed", x, y, custom: true }, hostWidth);
      applyHostPosition(cardHost.host, cardHost.position);
    },
    onEnd: (ev: PointerEvent) => {
      if (!activeDrag || ev.pointerId !== activeDrag.pointerId) return;
      target.classList.remove("dragging");
      stopDrag();
      if (cardHost) {
        cardHost.position = { ...cardHost.position, custom: true };
        void saveCardPosition(hostKey, cardHost.position);
      }
      if (!moved) onTap?.();
    },
  };

  activeDrag = session;
  window.addEventListener("pointermove", session.onMove);
  window.addEventListener("pointerup", session.onEnd);
  window.addEventListener("pointercancel", session.onEnd);

  try {
    target.setPointerCapture(e.pointerId);
  } catch {
    // ignore
  }
}

async function refreshSavedStatus(): Promise<void> {
  const res = await sendMessage<{ saved: boolean; status?: string; id?: string }>({
    action: EXTENSION_MESSAGE.JOB_STATUS,
    url: location.href,
  });
  savedStatus = {
    saved: Boolean(res.saved),
    status: res.status,
    id: typeof res.id === "string" ? res.id : undefined,
  };
}

function stopStatusPolling(): void {
  if (statusPollTimer) {
    clearInterval(statusPollTimer);
    statusPollTimer = null;
  }
}

function startStatusPolling(intervalMs = 2000): void {
  stopStatusPolling();
  statusPollTimer = setInterval(() => {
    void refreshSavedStatus()
      .then(() => {
        if (cardHost) renderCard(cardHost.shadow);
        if (
          savedStatus.status === "READY_TO_APPLY" ||
          savedStatus.status === "APPLIED" ||
          (!pipelineBusy && pendingPipelinePhase !== "autofill")
        ) {
          stopStatusPolling();
        }
      })
      .catch(() => undefined);
  }, intervalMs);
}

async function runAutofillPhase(entryId: string): Promise<void> {
  if (pipelineBusy || autofillRunForEntryId === entryId) return;
  if (savedStatus.status === "READY_TO_APPLY" || savedStatus.status === "APPLIED") {
    pendingPipelinePhase = null;
    await chrome.storage.local.remove(STORAGE_KEYS.pendingApplyJobId);
    return;
  }

  autofillRunForEntryId = entryId;
  pipelineBusy = true;
  pipelineBusyLabel = "Preparing application…";
  saveError = null;
  startStatusPolling();
  if (cardHost) renderCard(cardHost.shadow);

  try {
    const stub = await runWorkdayAutofillStub(document, location.href);
    if (!stub.ok) {
      saveError = stub.error;
      return;
    }

    pipelineBusyLabel = "Finalizing apply…";
    if (cardHost) renderCard(cardHost.shadow);

    const res = await sendMessage<{
      success: boolean;
      status?: string;
      error?: string;
    }>({
      action: EXTENSION_MESSAGE.COMPLETE_AUTOFILL,
      entryId,
      stub: true,
      note: stub.note,
    });

    if (!res?.success) {
      saveError = res?.error ?? "Could not complete autofill for this job.";
      return;
    }

    savedStatus = {
      saved: true,
      status: res.status ?? "READY_TO_APPLY",
      id: entryId,
    };
    pendingPipelinePhase = null;
    saveError = null;
    await chrome.storage.local.remove(STORAGE_KEYS.pendingApplyJobId);
    void refreshSavedStatus().catch(() => undefined);
  } catch (error) {
    saveError =
      error instanceof Error
        ? error.message
        : "Autofill could not complete. Finish the form manually on Workday.";
  } finally {
    pipelineBusy = false;
    pipelineBusyLabel = null;
    autofillRunForEntryId = null;
    stopStatusPolling();
    if (cardHost) renderCard(cardHost.shadow);
  }
}

async function maybeContinuePendingAutofill(): Promise<void> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.pendingApplyJobId);
  const pendingId = stored[STORAGE_KEYS.pendingApplyJobId];
  const entryId =
    typeof pendingId === "string" && pendingId.trim()
      ? pendingId.trim()
      : savedStatus.id;

  const shouldAutofill =
    Boolean(entryId) &&
    (pendingPipelinePhase === "autofill" ||
      savedStatus.status === "RESUME_READY" ||
      Boolean(pendingId));

  if (!shouldAutofill || !entryId) return;
  if (savedStatus.status === "READY_TO_APPLY" || savedStatus.status === "APPLIED") {
    await chrome.storage.local.remove(STORAGE_KEYS.pendingApplyJobId);
    return;
  }

  if (savedStatus.status === "RESUME_READY" || pendingPipelinePhase === "autofill") {
    void runAutofillPhase(entryId);
  }
}

async function pollUntilResumeReady(entryId: string): Promise<void> {
  const result = await pollJobStatusUntil({
    intervalMs: 2000,
    maxMs: 120_000,
    fetchStatus: async () => {
      await refreshSavedStatus();
      return savedStatus;
    },
    isDone: (snapshot) =>
      snapshot.status === "RESUME_READY" ||
      snapshot.status === "READY_TO_APPLY" ||
      snapshot.status === "APPLIED",
  });

  if (
    result.snapshot.status === "RESUME_READY" &&
    (pendingPipelinePhase === "autofill" || result.ok)
  ) {
    void runAutofillPhase(entryId);
  }
}

function defaultReviewPanelForStatus(status?: string): string {
  if (status === "RESUME_READY") return "resume";
  if (status === "READY_TO_APPLY") return "apply";
  return "job";
}

async function openJobTrackerDashboard(options?: { review?: boolean }): Promise<void> {
  let path = "/dashboard/job-tracker";
  if (options?.review !== false && savedStatus.id) {
    const panel = defaultReviewPanelForStatus(savedStatus.status);
    path = `/dashboard/job-tracker?job=${encodeURIComponent(savedStatus.id)}&panel=${panel}`;
  }
  await sendMessage({ action: EXTENSION_MESSAGE.OPEN_DASHBOARD, path });
}

async function openUpdateResumeDashboard(): Promise<void> {
  const path = selectedProfileId
    ? `/dashboard/resume-profiles/${selectedProfileId}/edit`
    : "/dashboard/resume-profiles";
  await sendMessage({ action: EXTENSION_MESSAGE.OPEN_DASHBOARD, path });
}

async function waitForJobDescriptionBeforeSave(maxMs = 4500): Promise<void> {
  if (!/linkedin\.com\/jobs\//i.test(location.href)) return;

  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (scrapeDescription(document).length >= 120) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function refreshMetadataBeforeSave(config: ExtensionRuntimeConfig): Promise<void> {
  await waitForJobDescriptionBeforeSave();
  const detectedDirect = detectJobPage(document, location.href, config);
  const detected =
    detectedDirect ??
    ({
      metadata: buildFallbackJobMetadata(document, location.href, config),
      mountSelector: "body",
    } as const);

  const metaWithEnrichments = detected.metadata as ScrapedJobMetadata & {
    enrichmentsApplied?: string[];
  };

  lastScrapeContext = {
    path: detectedDirect ? "detectJobPage" : "buildFallbackJobMetadata",
    enrichments: metaWithEnrichments.enrichmentsApplied ?? [],
  };
  currentMetadata = detected.metadata;
}

async function onPrimaryClick(): Promise<void> {
  if (!currentMetadata || pipelineBusy) return;

  if (savedStatus.saved) {
    await openJobTrackerDashboard({ review: true });
    return;
  }

  const tokenRes = await sendMessage<{ token: string | null }>({ action: EXTENSION_MESSAGE.GET_AUTH });
  if (!tokenRes.token) {
    await sendMessage({ action: EXTENSION_MESSAGE.OPEN_LOGIN });
    return;
  }

  const config = runtimeConfig ?? (await ensureRuntimeConfig());
  await refreshMetadataBeforeSave(config);

  const usePipeline = shouldUseOneClickApply(currentMetadata, config);
  const captureDiagnostics = buildCaptureDiagnostics({
    url: location.href,
    title: currentMetadata.title,
    company: currentMetadata.company,
    location: currentMetadata.location,
    salaryText: currentMetadata.salaryText,
    description: currentMetadata.description,
    platform: currentMetadata.platform,
    metadata: { confidence: currentMetadata.confidence },
    adapter: currentMetadata.platform,
    scrapePath: lastScrapeContext?.path ?? null,
    enrichmentsApplied: lastScrapeContext?.enrichments ?? [],
  });
  logCaptureDiagnostics(captureDiagnostics, { phase: "extension-save" });

  const payload = {
    url: location.href,
    title: currentMetadata.title,
    company: currentMetadata.company,
    location: currentMetadata.location,
    salaryText: currentMetadata.salaryText,
    description: currentMetadata.description?.slice(0, 48_000) ?? null,
    platform: currentMetadata.platform,
    sourceProfileId: selectedProfileId,
    metadata: {
      confidence: currentMetadata.confidence,
      scrapePath: lastScrapeContext?.path ?? null,
      enrichmentsApplied: lastScrapeContext?.enrichments ?? [],
    },
  };

  pipelineBusy = true;
  pipelineBusyLabel = usePipeline ? "Tailoring resume…" : "Saving job…";
  saveError = null;
  startStatusPolling();
  if (cardHost) renderCard(cardHost.shadow);

  try {
    const action = usePipeline ? EXTENSION_MESSAGE.RUN_PIPELINE : EXTENSION_MESSAGE.SAVE_JOB;
    const res = await sendMessage<{
      success: boolean;
      saved?: boolean;
      status?: string;
      id?: string;
      pendingPhase?: string | null;
      hasTailoredResume?: boolean;
      sourceProfileId?: string | null;
      error?: string;
      code?: string;
    }>({
      action,
      payload,
    });

    const jobSaved = Boolean(res?.success || res?.saved);

    if (jobSaved) {
      savedStatus = {
        saved: true,
        status: res?.status ?? "CAPTURED",
        id: typeof res.id === "string" ? res.id : savedStatus.id,
      };
      pendingPipelinePhase = res?.pendingPhase ?? null;
      saveError = res?.success ? null : (res?.error ?? null);
      void refreshSavedStatus().catch(() => undefined);
      if (cardHost) renderCard(cardHost.shadow);

      if (res?.success && res?.pendingPhase === "autofill" && savedStatus.id) {
        void runAutofillPhase(savedStatus.id);
      } else if (res?.success && res?.status === "RESUME_READY" && savedStatus.id) {
        pendingPipelinePhase = "autofill";
        void runAutofillPhase(savedStatus.id);
      }
      return;
    }

    saveError =
      res?.error ??
      "Could not save this job. Reconnect the extension from the dashboard, then try again.";

    if (res?.error?.toLowerCase().includes("unauthorized")) {
      await sendMessage({ action: EXTENSION_MESSAGE.OPEN_LOGIN });
    }
  } catch (error) {
    saveError =
      error instanceof Error
        ? error.message
        : "Could not reach the extension background worker. Reload the extension and try again.";
  } finally {
    pipelineBusy = false;
    pipelineBusyLabel = null;
    stopStatusPolling();
    if (cardHost) renderCard(cardHost.shadow);
  }
}

async function onSaveClick(): Promise<void> {
  await onPrimaryClick();
}

async function refreshRuntimeConfig(): Promise<ExtensionRuntimeConfig> {
  const res = await sendMessage<{ success: boolean; config?: ExtensionRuntimeConfig }>({
    action: EXTENSION_MESSAGE.GET_CONFIG,
  });
  runtimeConfig = mergeExtensionRuntimeConfig(res.config);
  connectedAccountEmail = runtimeConfig.connectedUser?.email ?? null;
  return runtimeConfig;
}

async function ensureRuntimeConfig(): Promise<ExtensionRuntimeConfig> {
  if (runtimeConfig) return runtimeConfig;
  return refreshRuntimeConfig();
}

async function forceShowCard(): Promise<{ success: boolean; error?: string; title?: string }> {
  if (!isContextValid() || window.top !== window.self) {
    return { success: false, error: "Cannot show the card in this frame." };
  }

  if (isEasySubmitAppPage()) {
    return {
      success: false,
      error: "The job card is hidden on the EasySubmit dashboard. Use Job Tracker in the app.",
    };
  }

  try {
    stopDrag();
    cardCollapsed = false;
    const config = await ensureRuntimeConfig();
    pinnedUrl = location.href;
    const metadata = buildFallbackJobMetadata(document, location.href, config);

    await mountCard("body", metadata, { useDefaultPosition: true });
    return { success: true, title: metadata.title };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not show the job card.",
    };
  }
}

async function mountCard(
  _mountSelector: string,
  metadata: ScrapedJobMetadata,
  options?: { useDefaultPosition?: boolean },
): Promise<void> {
  await refreshRuntimeConfig().catch(() => ensureRuntimeConfig());

  const sameTitle = currentMetadata?.title === metadata.title;
  currentMetadata = metadata;
  await refreshSavedStatus().catch(() => undefined);
  await refreshResumeProfiles().catch(() => undefined);
  await maybeContinuePendingAutofill().catch(() => undefined);
  if (cardHost && !isDragging()) {
    renderCard(cardHost.shadow);
  }

  if (isDragging() && cardHost && sameTitle) {
    return;
  }

  const hostKey = location.hostname;

  let position: FixedCardPosition;
  if (cardHost?.position.custom && !options?.useDefaultPosition) {
    position = cardHost.position;
  } else if (cardCollapsed) {
    position = getCollapsedFixedCardPosition();
  } else {
    position = getDefaultFixedCardPosition();
  }

  if (!cardHost) {
    const host = document.createElement("div");
    host.id = HOST_ID;
    host.setAttribute("data-easysubmit", "job-card");
    applyHostShell(host);
    const shadow = host.attachShadow({ mode: "open" });
    cardHost = { host, shadow, position };
    setupProfilePickerDelegation(shadow);
    setupSettingsMenuDelegation(shadow);
  } else if (!isDragging() || options?.useDefaultPosition) {
    cardHost.position = position;
  }

  applyHostPosition(cardHost.host, cardHost.position);
  if (!isDragging()) {
    renderCard(cardHost.shadow);
  }

  if (!document.documentElement.contains(cardHost.host)) {
    document.documentElement.appendChild(cardHost.host);
  }

  setCardVisible(true);
}

function removeCard(): void {
  stopDrag();
  closeProfilePickerMenu();
  closeSettingsMenu();
  profilePickerDelegationReady = false;
  settingsMenuDelegationReady = false;
  cardHost?.host.remove();
  cardHost = null;
  currentMetadata = null;
  cardCollapsed = false;
}

let updateTimer: ReturnType<typeof setTimeout> | null = null;

function isEasySubmitAppPage(): boolean {
  const host = location.hostname;
  const onAppHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "easysubmit.ai" ||
    host.endsWith(".easysubmit.ai");

  if (!onAppHost) return false;

  const path = location.pathname;
  return (
    path.startsWith("/dashboard") ||
    path.startsWith("/onboarding") ||
    path === "/login" ||
    path.startsWith("/extension") && !path.startsWith("/extension/bridge")
  );
}

async function updateCard(): Promise<void> {
  if (!isContextValid() || window.top !== window.self) return;
  if (isDragging()) return;

  if (isEasySubmitAppPage()) {
    removeCard();
    return;
  }

  try {
    const config = await ensureRuntimeConfig();
    const onJobPage = isJobPage(document, location.href);

    if (pinnedUrl === location.href) {
      const metadata = buildFallbackJobMetadata(document, location.href, config);
      if (cardHost && currentMetadata?.title === metadata.title) {
        currentMetadata = metadata;
        setCardVisible(true);
        return;
      }
      await mountCard("body", metadata, { useDefaultPosition: true });
      return;
    }

    pinnedUrl = null;

    if (!onJobPage) {
      setCardVisible(false);
      return;
    }

    const detected =
      detectJobPage(document, location.href, config) ??
      ({
        metadata: buildFallbackJobMetadata(document, location.href, config),
        mountSelector: "body",
      } as const);

    await mountCard(detected.mountSelector, detected.metadata);
  } catch (error) {
    console.warn("EasySubmit: job card update failed", error);
    if (!runtimeConfig) {
      runtimeConfig = DEFAULT_RUNTIME_CONFIG;
      void updateCard();
    }
  }
}

function scheduleUpdate(delayMs = 350): void {
  if (updateTimer) clearTimeout(updateTimer);
  const delay = pinnedUrl === location.href ? Math.max(delayMs, 2000) : delayMs;
  updateTimer = setTimeout(() => {
    void updateCard();
  }, delay);
}

function mutationTouchesCardHost(mutations: MutationRecord[]): boolean {
  return mutations.some((mutation) => {
    const nodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];
    return nodes.some((node) => {
      if (!(node instanceof HTMLElement)) return false;
      return node.id === HOST_ID || node.getAttribute("data-easysubmit") === "job-card";
    });
  });
}

function bootJobPageObservers(): void {
  scheduleUpdate();

  const domObserver = new MutationObserver((mutations) => {
    if (!mutationTouchesCardHost(mutations)) {
      scheduleUpdate();
    }
  });

  if (document.body) {
    domObserver.observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener("resize", onViewportChange);
  window.addEventListener("popstate", () => scheduleUpdate());
  window.addEventListener("hashchange", () => scheduleUpdate());

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      pinnedUrl = null;
      runtimeConfig = null;
      removeCard();
      scheduleUpdate();
    }
  }, 800);
}

if (window.top === window.self) {
  const isBridgePage = window.location.pathname.startsWith("/extension/bridge");

  if (isBridgePage) {
    setupBridgeRelay();
    console.log("EasySubmit: bridge relay ready");
  } else {
    const boot = (): void => {
      bootJobPageObservers();
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.action === EXTENSION_MESSAGE.FORCE_SHOW_CARD) {
        void forceShowCard().then(sendResponse);
        return true;
      }

      if (
        message?.action === EXTENSION_MESSAGE.START_APPLY &&
        typeof message.jobId === "string"
      ) {
        const jobId = message.jobId;
        void chrome.storage.local
          .set({ [STORAGE_KEYS.pendingApplyJobId]: jobId })
          .then(async () => {
            savedStatus = { ...savedStatus, id: jobId };
            pendingPipelinePhase = "autofill";
            const shown = await forceShowCard();
            if (shown.success) {
              await refreshSavedStatus().catch(() => undefined);
              if (savedStatus.status === "RESUME_READY") {
                void runAutofillPhase(jobId);
              } else if (savedStatus.saved) {
                void pollUntilResumeReady(jobId);
              } else {
                void runAutofillPhase(jobId);
              }
            }
            sendResponse(shown);
          });
        return true;
      }

      if (message?.action === EXTENSION_MESSAGE.PING) {
        sendResponse({ ready: true });
        return true;
      }

      return false;
    });

    console.log("EasySubmit: content script ready");
  }
}
}
