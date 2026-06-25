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
import { runWorkdayAutofill, type WorkdayFillData } from "@shared/extension/workday-autofill";
import { setupFieldCaptureBridge } from "@shared/extension/field-capture-bridge";
import type { FieldCapturePayload } from "@shared/extension/field-descriptor";
import type { ServerLookupMap } from "@shared/extension/field-resolution";
import { injectApiInterceptScript, onApiIntercept, type InterceptedJobData } from "@shared/extension/api-intercept";
import { isExtensionGlobalSwitchOn } from "@shared/extension/extension-global-switch";
import { resolveJourneyDisplay, type JourneyDisplay } from "@shared/journey-display";
import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import type { ApplicationProfile } from "@/lib/profile/application-profile";
import {
  isApplicationProfileSetupComplete,
  applicationProfilePatchFromScreen1,
  applicationProfilePatchFromScreen2,
  syncProfileSetupDraftsFromProfile,
} from "@/lib/profile/application-profile-setup";
import {
  buildManualCaptureMetadata,
  buildNoJobDetectedMetadata,
  NO_JOB_DETECTED_MESSAGE,
  type CardPresentation,
} from "@shared/extension/card-presentation";
import { canApplyCapture, applyCaptureBlockReason } from "@shared/extension/apply-gate";
import { resolveJobIdentity } from "@shared/extension/job-identity";
import { hasStrongJobUrlSignal } from "@shared/extension/job-url-parse";
import { detectApplicationConfirmation } from "@shared/extension/confirmation-detect";
import { buildAssistFieldSuggestions } from "@shared/extension/assist-suggestions";
import { hasAssistOpenParam, stripAssistOpenParam } from "@shared/extension/assist-open-url";
import { resolveCardContent as resolveCardContentShared } from "./resolve-card-content";
import {
  manualCaptureStyles,
  renderAssistCardMarkup,
  renderLoadingBody,
  renderManualCaptureBody,
  renderResumeReadyCardMarkup,
  renderProfileSetupScreen1,
  renderProfileSetupScreen2,
  readProfileSetupScreen1FromDom,
  readProfileSetupScreen2FromDom,
  defaultProfileSetupScreen1Draft,
  defaultProfileSetupScreen2Draft,
  profileSetupStyles,
  type ManualCaptureDraft,
  type ProfileSetupScreen1Draft,
  type ProfileSetupScreen2Draft,
} from "./card-ui";
import { startExtensionJobRealtime, stopExtensionJobRealtime } from "./job-realtime";
import {
  isChromeExtensionContextValid,
  isExtensionContextInvalidatedError,
  isExtensionContextInvalidatedMessage,
} from "@shared/extension/extension-context";

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
let interceptedMetadata: ScrapedJobMetadata | null = null;
let lastScrapeContext: { path: string; enrichments: string[] } | null = null;
let savedStatus: {
  saved: boolean;
  status?: string;
  id?: string;
  canReapply?: boolean;
} = { saved: false };
let runtimeConfig: ExtensionRuntimeConfig | null = null;
let connectedAccountEmail: string | null = null;
let pinnedUrl: string | null = null;
let cardPresentation: CardPresentation = "job";
let cardCollapsed = false;
let pipelineBusy = false;
let pipelineBusyLabel: string | null = null;
let pendingPipelinePhase: string | null = null;
let saveError: string | null = null;
let statusPollTimer: ReturnType<typeof setInterval> | null = null;
let autofillRunForEntryId: string | null = null;
let manualCaptureDraft: ManualCaptureDraft | null = null;
let profileSetupScreen: 0 | 1 | 2 = 0;
let profileSetupScreen1Draft: ProfileSetupScreen1Draft = defaultProfileSetupScreen1Draft();
let profileSetupScreen2Draft: ProfileSetupScreen2Draft = defaultProfileSetupScreen2Draft();
let cachedApplicationProfile: ApplicationProfile | null = null;
let cardLaunchMode: "auto" | "manual" = "auto";
let realtimeStop: (() => Promise<void>) | null = null;
let assistUploadWarnings: string[] = [];
let confirmationWatchTimer: ReturnType<typeof setInterval> | null = null;
let loadingHydrationTimer: ReturnType<typeof setInterval> | null = null;
let urlWatchTimer: ReturnType<typeof setInterval> | null = null;
let extensionContextTeardownDone = false;

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
  return isChromeExtensionContextValid();
}

function stopUrlWatch(): void {
  if (urlWatchTimer) {
    clearInterval(urlWatchTimer);
    urlWatchTimer = null;
  }
}

function stopAllExtensionTimers(): void {
  stopStatusPolling();
  stopConfirmationWatch();
  stopLoadingHydrationWatch();
  stopUrlWatch();
  if (updateTimer) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }
}

function teardownStaleExtensionContext(): void {
  if (extensionContextTeardownDone) return;
  extensionContextTeardownDone = true;
  stopAllExtensionTimers();
  void stopExtensionJobRealtime();
  realtimeStop = null;
  removeCard();
}

function guardExtensionContext(): boolean {
  if (isContextValid()) return true;
  teardownStaleExtensionContext();
  return false;
}

function sendMessage<T>(message: Record<string, unknown>): Promise<T | undefined> {
  if (!isContextValid()) {
    teardownStaleExtensionContext();
    return Promise.resolve(undefined);
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError?.message) {
        if (isExtensionContextInvalidatedMessage(lastError.message)) {
          teardownStaleExtensionContext();
        }
        resolve(undefined);
        return;
      }
      resolve(response as T);
    });
  });
}

function swallowContextInvalidation(error: unknown): void {
  if (isExtensionContextInvalidatedError(error)) {
    teardownStaleExtensionContext();
  }
}

function shouldUseOneClickApply(
  meta: ScrapedJobMetadata,
  config: ExtensionRuntimeConfig | null,
): boolean {
  if (config?.autoApplyEnabled === false) return false;
  if (!config?.autoApplyUserSwitch) return false;
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

function resolveExtensionJourneyDisplay(): JourneyDisplay {
  if (savedStatus.canReapply) {
    return {
      stage: 0,
      label: "Re-apply",
      applyButtonState: "reapply",
      showResumeCard: false,
      showAssistCard: false,
    };
  }

  if (pipelineBusy) {
    return {
      stage: 1,
      label: pipelineBusyLabel ?? "Optimizing resume…",
      applyButtonState: "disabled",
      showResumeCard: false,
      showAssistCard: false,
    };
  }

  const status = savedStatus.saved
    ? ((savedStatus.status as JobTrackerStatus | undefined) ?? null)
    : null;
  return resolveJourneyDisplay(status, Boolean(saveError));
}

function getPrimaryCtaLabel(): string {
  return resolveExtensionJourneyDisplay().label;
}

function statusLabel(saved: boolean, status?: string, presentation: CardPresentation = "job"): string {
  if (presentation === "no_job") return "Not detected";
  if (presentation === "loading") return "Reading…";
  if (presentation === "manual_capture") return "Add details";
  return resolveExtensionJourneyDisplay().label;
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
    .card-notice {
      margin: 0;
      font-size: 13px;
      line-height: 1.45;
      color: #6B7280;
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

function resolveCardContent(
  config: ExtensionRuntimeConfig,
  launch: "auto" | "manual",
): { presentation: CardPresentation; metadata: ScrapedJobMetadata } {
  cardLaunchMode = launch;
  return resolveCardContentShared({
    doc: document,
    url: location.href,
    config,
    launch,
    interceptedMetadata,
  });
}

function defaultManualCaptureDraft(): ManualCaptureDraft {
  return {
    jobUrl: location.href,
    description: currentMetadata?.description ?? "",
    title: currentMetadata?.title ?? "",
    company: currentMetadata?.company ?? "",
  };
}

function readManualCaptureDraftFromDom(root: ParentNode): ManualCaptureDraft {
  const urlInput = root.querySelector("[data-capture-url]") as HTMLInputElement | null;
  const descriptionInput = root.querySelector("[data-capture-description]") as HTMLTextAreaElement | null;
  const titleInput = root.querySelector("[data-capture-title]") as HTMLInputElement | null;
  const companyInput = root.querySelector("[data-capture-company]") as HTMLInputElement | null;
  return {
    jobUrl: urlInput?.value.trim() || manualCaptureDraft?.jobUrl || location.href,
    description: descriptionInput?.value ?? manualCaptureDraft?.description ?? "",
    title: titleInput?.value ?? manualCaptureDraft?.title ?? "",
    company: companyInput?.value ?? manualCaptureDraft?.company ?? "",
  };
}

function getCaptureContext(): {
  url: string;
  title: string;
  company: string | null;
  location: string | null;
  salaryText: string | null;
  description: string | null;
  platform: string | null;
  confidence: number;
} {
  if (cardPresentation === "manual_capture" && manualCaptureDraft) {
    const identity = resolveJobIdentity({
      url: manualCaptureDraft.jobUrl,
      title: manualCaptureDraft.title,
      company: manualCaptureDraft.company,
      description: manualCaptureDraft.description,
    });
    return {
      url: manualCaptureDraft.jobUrl,
      title: identity.title,
      company: identity.company,
      location: currentMetadata?.location ?? null,
      salaryText: currentMetadata?.salaryText ?? null,
      description: manualCaptureDraft.description,
      platform: currentMetadata?.platform ?? "generic",
      confidence: currentMetadata?.confidence ?? 0,
    };
  }

  const meta = currentMetadata;
  const url = location.href;
  const identity = resolveJobIdentity({
    url,
    title: meta?.title,
    company: meta?.company,
    description: meta?.description,
  });

  return {
    url,
    title: identity.title,
    company: identity.company,
    location: meta?.location ?? null,
    salaryText: meta?.salaryText ?? null,
    description: meta?.description ?? null,
    platform: meta?.platform ?? "generic",
    confidence: meta?.confidence ?? 0,
  };
}

function isApplyEnabled(): boolean {
  if (savedStatus.canReapply) {
    const capture = getCaptureContext();
    return canApplyCapture({ url: capture.url, description: capture.description });
  }
  if (savedStatus.saved) return false;
  if (pipelineBusy) return false;
  if (cardPresentation === "loading") return false;
  const capture = getCaptureContext();
  return canApplyCapture({ url: capture.url, description: capture.description });
}

async function syncRealtimeSubscription(): Promise<void> {
  if (!savedStatus.saved || !savedStatus.id) {
    if (realtimeStop) {
      await realtimeStop();
      realtimeStop = null;
    }
    return;
  }

  const config = runtimeConfig ?? (await ensureRuntimeConfig());
  const stop = await startExtensionJobRealtime({
    apiBaseUrl: config.apiBaseUrl,
    getAuthToken: async () => {
      const res = await sendMessage<{ token: string | null }>({ action: EXTENSION_MESSAGE.GET_AUTH });
      return res.token;
    },
    onSync: () => {
      void refreshSavedStatus()
        .then(() => {
          if (cardHost) renderCard(cardHost.shadow);
        })
        .catch(() => undefined);
    },
  });
  realtimeStop = stop;
}

function stopLoadingHydrationWatch(): void {
  if (loadingHydrationTimer) {
    clearInterval(loadingHydrationTimer);
    loadingHydrationTimer = null;
  }
}

function startLoadingHydrationWatch(): void {
  stopLoadingHydrationWatch();
  if (cardPresentation !== "loading") return;

  const started = Date.now();
  loadingHydrationTimer = setInterval(() => {
    if (!guardExtensionContext()) return;
    if (cardPresentation !== "loading") {
      stopLoadingHydrationWatch();
      return;
    }
    if (Date.now() - started > 12_000) {
      stopLoadingHydrationWatch();
      if (hasStrongJobUrlSignal(location.href)) {
        cardPresentation = "manual_capture";
        currentMetadata = buildManualCaptureMetadata();
        manualCaptureDraft = defaultManualCaptureDraft();
        if (cardHost) renderCard(cardHost.shadow);
      }
      return;
    }
    void updateCard().catch(swallowContextInvalidation);
  }, 800);
}

function stopConfirmationWatch(): void {
  if (confirmationWatchTimer) {
    clearInterval(confirmationWatchTimer);
    confirmationWatchTimer = null;
  }
}

function startConfirmationWatch(): void {
  stopConfirmationWatch();
  if (!savedStatus.id || savedStatus.status !== "READY_TO_APPLY") return;

  confirmationWatchTimer = setInterval(() => {
    if (!guardExtensionContext()) return;
    if (!savedStatus.id || savedStatus.status !== "READY_TO_APPLY") {
      stopConfirmationWatch();
      return;
    }
    maybeMarkAppliedFromConfirmation();
  }, 3000);
}

function maybeMarkAppliedFromConfirmation(): void {
  if (savedStatus.status !== "READY_TO_APPLY" || !savedStatus.id) return;
  const platform = currentMetadata?.platform ?? "generic";
  if (!detectApplicationConfirmation(platform)) return;
  void markCurrentJobApplied("extension_auto").catch(swallowContextInvalidation);
}

async function markCurrentJobApplied(
  source: "extension_auto" | "extension_manual",
): Promise<void> {
  if (!savedStatus.id) return;
  const res = await sendMessage<{ success: boolean; status?: string; error?: string }>({
    action: EXTENSION_MESSAGE.MARK_APPLIED,
    entryId: savedStatus.id,
    source,
  });
  if (res?.success) {
    savedStatus = { ...savedStatus, status: res.status ?? "APPLIED" };
    pendingPipelinePhase = null;
    stopConfirmationWatch();
    if (cardHost) renderCard(cardHost.shadow);
  } else if (res?.error) {
    saveError = res.error;
    if (cardHost) renderCard(cardHost.shadow);
  }
}

function handleAssistOpenOnLoad(): void {
  if (!hasAssistOpenParam(location.href)) return;
  const cleaned = stripAssistOpenParam(location.href);
  if (cleaned !== location.href) {
    history.replaceState(history.state, "", cleaned);
  }
  cardCollapsed = false;
  pinnedUrl = cleaned;
}

function renderExpandedCard(root: ShadowRoot): void {
  const meta = currentMetadata;
  if (!meta) return;

  if (cardPresentation === "manual_capture" && !manualCaptureDraft) {
    manualCaptureDraft = defaultManualCaptureDraft();
  }

  const journey = resolveExtensionJourneyDisplay();
  const showAssistLayout = profileSetupScreen === 0 && journey.showAssistCard;
  const showResumeCardLayout = profileSetupScreen === 0 && journey.showResumeCard;
  const showAppliedLayout =
    journey.applyButtonState === "completed" && !savedStatus.canReapply;
  const capture = getCaptureContext();
  const applyEnabled = isApplyEnabled();
  const applyHint = applyCaptureBlockReason({ url: capture.url, description: capture.description });
  const profileLabel = selectedProfileLabel();
  const assistSuggestions = showAssistLayout
    ? buildAssistFieldSuggestions(document, location.href, {
        uploadWarnings: assistUploadWarnings,
      })
    : [];

  let bodyMarkup = "";
  if (profileSetupScreen === 1) {
    bodyMarkup = renderProfileSetupScreen1(profileSetupScreen1Draft, escapeHtml);
  } else if (profileSetupScreen === 2) {
    bodyMarkup = renderProfileSetupScreen2(profileSetupScreen2Draft, escapeHtml);
  } else if (cardPresentation === "no_job") {
    bodyMarkup = `
      <h2 class="title">${escapeHtml(meta.title)}</h2>
      <p class="card-notice">${escapeHtml(NO_JOB_DETECTED_MESSAGE)}</p>
    `;
  } else if (cardPresentation === "loading") {
    bodyMarkup = renderLoadingBody(escapeHtml);
  } else if (cardPresentation === "manual_capture" && manualCaptureDraft) {
    bodyMarkup = renderManualCaptureBody(manualCaptureDraft, escapeHtml);
  } else if (showAppliedLayout) {
    bodyMarkup = `
      <p class="applied-badge">Application completed</p>
      <p class="card-subtitle">This role is in your tracker as applied.</p>
    `;
  } else if (!showAssistLayout) {
    bodyMarkup = `
      <h2 class="title">${escapeHtml(capture.title)}</h2>
      ${capture.company ? `<p class="meta">${escapeHtml(capture.company)}</p>` : ""}
      ${capture.location ? `<p class="meta">${escapeHtml(capture.location)}</p>` : ""}
      ${capture.salaryText ? `<p class="salary">${escapeHtml(capture.salaryText)}</p>` : ""}
    `;
  }

  const badgeClass = savedStatus.saved ? "badge saved" : "badge";
  const ctaClass = savedStatus.saved ? "cta cta-saved" : "cta cta-primary";
  const ctaLabel = getPrimaryCtaLabel();
  const ctaDisabled = applyEnabled && !pipelineBusy ? "" : " disabled";
  const uiMode = getPipelineUiMode(runtimeConfig);
  const manualStep = getManualPipelineStep();
  const showUpdateResume = uiMode === "manual" && savedStatus.saved && manualStep === 2;
  const nudgeVariant = savedStatus.saved ? "captured" : "capture";
  const showPrimaryCta =
    profileSetupScreen === 0 &&
    !showAssistLayout &&
    !showAppliedLayout &&
    cardPresentation !== "no_job";
  const ctaIcon = savedStatus.saved
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`;

  root.innerHTML = `
    <style>${cardStyles()}${glossyShellStyles()}${stageNudgeStyles()}${manualCaptureStyles()}${profileSetupStyles()}</style>
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
                <span class="${badgeClass}">${statusLabel(savedStatus.saved, savedStatus.status, cardPresentation)}</span>
                ${renderProfilePickerMarkup()}
                ${renderSettingsMenuMarkup()}
                <button type="button" class="header-btn" data-minimize="1" aria-label="Minimize">×</button>
              </div>
            </div>
            ${
              showAssistLayout
                ? `<div class="body"><p class="card-subtitle" style="font-weight:700;color:#0E7490;">${escapeHtml(capture.title)}</p>${capture.company ? `<p class="meta">${escapeHtml(capture.company)}</p>` : ""}</div>`
                : `<div class="body">${bodyMarkup}
              ${
                showPrimaryCta
                  ? `<div class="actions">
                <button type="button" class="${ctaClass}" data-save="1"${ctaDisabled}>${ctaIcon}<span>${ctaLabel}</span></button>
                ${
                  showUpdateResume
                    ? `<button type="button" class="cta cta-primary" data-update-resume="1"><span>Update resume</span></button>`
                    : ""
                }
                ${!applyEnabled && applyHint ? `<p class="save-error">${escapeHtml(applyHint)}</p>` : ""}
                ${saveError ? `<p class="save-error" role="alert">${escapeHtml(saveError)}</p>` : ""}
              </div>`
                  : showAppliedLayout
                    ? `<div class="actions"><button type="button" class="cta cta-saved" data-save="1">${ctaIcon}<span>${ctaLabel}</span></button></div>${saveError ? `<p class="save-error" role="alert">${escapeHtml(saveError)}</p>` : ""}`
                    : saveError
                      ? `<p class="save-error" role="alert">${escapeHtml(saveError)}</p>`
                      : ""
              }
            </div>`
            }
          </div>
          ${showResumeCardLayout ? renderResumeReadyCardMarkup(profileLabel, escapeHtml) : ""}
          ${showAssistLayout ? renderAssistCardMarkup(assistSuggestions, escapeHtml) : ""}
          ${!showAssistLayout && !showResumeCardLayout && !showAppliedLayout && profileSetupScreen === 0 ? renderStageNudgeMarkup(nudgeVariant, { mode: uiMode, manualStep }) : ""}
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

  root.querySelector("[data-review-resume]")?.addEventListener("click", () => {
    void openJobTrackerDashboard({ review: true });
  });

  root.querySelector("[data-mark-applied]")?.addEventListener("click", () => {
    void markCurrentJobApplied("extension_manual");
  });

  root.querySelector("[data-profile-continue]")?.addEventListener("click", () => {
    void onProfileSetupContinue(root);
  });
  root.querySelector("[data-profile-finish]")?.addEventListener("click", () => {
    void onProfileSetupFinish(root, false);
  });
  root.querySelector("[data-profile-skip-all]")?.addEventListener("click", () => {
    void onProfileSetupFinish(root, true);
  });

  if (cardPresentation === "manual_capture") {
    for (const selector of [
      "[data-capture-url]",
      "[data-capture-description]",
      "[data-capture-title]",
      "[data-capture-company]",
    ]) {
      root.querySelector(selector)?.addEventListener("input", () => {
        manualCaptureDraft = readManualCaptureDraftFromDom(root);
        if (cardHost) renderCard(cardHost.shadow);
      });
    }
  }

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
  const res = await sendMessage<{
    saved: boolean;
    status?: string;
    id?: string;
    canReapply?: boolean;
  }>({
    action: EXTENSION_MESSAGE.JOB_STATUS,
    url: location.href,
  });
  if (!res) return;
  savedStatus = {
    saved: Boolean(res.saved),
    status: res.status,
    id: typeof res.id === "string" ? res.id : undefined,
    canReapply: Boolean(res.canReapply),
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
    if (!guardExtensionContext()) return;
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
      .catch(swallowContextInvalidation);
  }, intervalMs);
}

async function fetchServerLookupMap(): Promise<ServerLookupMap> {
  try {
    const res = await sendMessage<{ success: boolean; answers?: ServerLookupMap; error?: string }>({
      action: EXTENSION_MESSAGE.GET_APPLICATION_ANSWERS,
      platform: "workday",
      tenantHost: location.hostname,
    });
    if (res?.success && res.answers && typeof res.answers === "object") {
      return res.answers;
    }
  } catch {
    // Auth missing or API unreachable — resume/vault fill still works.
  }
  return {};
}

async function postFieldCapture(payload: FieldCapturePayload, jobEntryId?: string): Promise<void> {
  const res = await sendMessage<{ success: boolean; upserted?: number; error?: string }>({
    action: EXTENSION_MESSAGE.CAPTURE_APPLICATION_ANSWERS,
    payload,
    ...(jobEntryId ? { jobEntryId } : {}),
  });
  if (!res?.success) {
    console.warn("EasySubmit: field capture failed", res?.error ?? "unknown error");
  }
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
    // Fetch tailored resume fields for this job
    const fillRes = await sendMessage<{
      success: boolean;
      fillData?: WorkdayFillData;
      applicationProfile?: ApplicationProfile | null;
      error?: string;
    }>({
      action: EXTENSION_MESSAGE.GET_FILL_DATA,
      entryId,
    });
    const fillData: WorkdayFillData = fillRes?.fillData ?? {
      firstName: "", lastName: "", email: "", phone: "",
    };
    const applicationProfile = fillRes?.applicationProfile ?? cachedApplicationProfile;

    pipelineBusyLabel = "Filling application…";
    if (cardHost) renderCard(cardHost.shadow);

    const serverMap = await fetchServerLookupMap();
    const result = await runWorkdayAutofill(
      document,
      location.href,
      fillData,
      serverMap,
      currentMetadata,
      {
        applicationProfile,
        fetchDocument: async (kind) => {
          const action =
            kind === "resume"
              ? EXTENSION_MESSAGE.GET_RESUME_PDF
              : EXTENSION_MESSAGE.GET_COVER_LETTER_PDF;
          const res = await sendMessage<{
            success: boolean;
            bytes?: number[];
            filename?: string;
            error?: string;
          }>({
            action,
            entryId,
          });
          if (!res?.success || !res.bytes?.length) return null;
          return {
            bytes: new Uint8Array(res.bytes),
            filename: res.filename ?? `${kind}.pdf`,
          };
        },
      },
    );
    if (!result.ok) {
      saveError = result.error;
      assistUploadWarnings = [];
      if (!result.manualFinish) return;
      // manualFinish: still mark READY_TO_APPLY so user can submit
    } else {
      assistUploadWarnings = result.failedFileUploads;
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
      stub: false,
      note: result.ok ? result.note : "Manual finish required.",
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
    if (isExtensionContextInvalidatedError(error)) {
      teardownStaleExtensionContext();
      return;
    }
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
    pendingPipelinePhase === "autofill" &&
    savedStatus.status === "READY_TO_APPLY" &&
    currentMetadata &&
    shouldUseOneClickApply(currentMetadata, runtimeConfig);

  if (!shouldAutofill || !entryId) return;
  if (savedStatus.status === "APPLIED") {
    await chrome.storage.local.remove(STORAGE_KEYS.pendingApplyJobId);
    return;
  }

  void runAutofillPhase(entryId);
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
      snapshot.status === "READY_TO_APPLY" ||
      snapshot.status === "APPLIED",
  });

  if (
    result.snapshot.status === "READY_TO_APPLY" &&
    pendingPipelinePhase === "autofill"
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
    path: interceptedMetadata ? "api-intercept" : detectedDirect ? "detectJobPage" : "buildFallbackJobMetadata",
    enrichments: metaWithEnrichments.enrichmentsApplied ?? [],
  };
  // Prefer API-intercepted data — richer and more reliable than DOM scrape
  currentMetadata = interceptedMetadata ?? detected.metadata;
}

async function refreshRuntimeConfig(): Promise<ExtensionRuntimeConfig> {
  const res = await sendMessage<{ success: boolean; config?: ExtensionRuntimeConfig }>({
    action: EXTENSION_MESSAGE.GET_CONFIG,
  });
  if (!res) {
    return runtimeConfig ?? mergeExtensionRuntimeConfig(undefined);
  }
  runtimeConfig = mergeExtensionRuntimeConfig(res.config);
  connectedAccountEmail = runtimeConfig.connectedUser?.email ?? null;
  cachedApplicationProfile = runtimeConfig.applicationProfile ?? null;
  const synced = syncProfileSetupDraftsFromProfile(cachedApplicationProfile);
  profileSetupScreen1Draft = synced.screen1;
  profileSetupScreen2Draft = synced.screen2;
  return runtimeConfig;
}

function needsApplicationProfileSetup(): boolean {
  return !isApplicationProfileSetupComplete(cachedApplicationProfile);
}

async function patchApplicationProfile(
  patch: Partial<ApplicationProfile>,
): Promise<{ success: boolean; error?: string }> {
  const res = await sendMessage<{
    success: boolean;
    applicationProfile?: ApplicationProfile | null;
    error?: string;
  }>({
    action: EXTENSION_MESSAGE.UPDATE_USER_PREFS,
    applicationProfile: patch,
  });

  if (res?.success) {
    cachedApplicationProfile = res.applicationProfile ?? cachedApplicationProfile;
    if (runtimeConfig) {
      runtimeConfig = { ...runtimeConfig, applicationProfile: cachedApplicationProfile };
    }
    return { success: true };
  }

  return { success: false, error: res?.error ?? "Could not save application profile." };
}

async function onProfileSetupContinue(root: ShadowRoot): Promise<void> {
  profileSetupScreen1Draft = readProfileSetupScreen1FromDom(root);
  const patchResult = await patchApplicationProfile(
    applicationProfilePatchFromScreen1(profileSetupScreen1Draft),
  );
  if (!patchResult.success) {
    saveError = patchResult.error ?? "Could not save application profile.";
    if (cardHost) renderCard(cardHost.shadow);
    return;
  }

  profileSetupScreen = 2;
  saveError = null;
  if (cardHost) renderCard(cardHost.shadow);
}

async function onProfileSetupFinish(root: ShadowRoot, skipAll: boolean): Promise<void> {
  if (!skipAll) {
    profileSetupScreen2Draft = readProfileSetupScreen2FromDom(root);
  }
  const patchResult = await patchApplicationProfile(
    applicationProfilePatchFromScreen2(profileSetupScreen2Draft, skipAll),
  );
  if (!patchResult.success) {
    saveError = patchResult.error ?? "Could not save application profile.";
    if (cardHost) renderCard(cardHost.shadow);
    return;
  }

  profileSetupScreen = 0;
  saveError = null;
  if (cardHost) renderCard(cardHost.shadow);
}

async function startApplyPipeline(): Promise<void> {
  if (pipelineBusy) return;

  if (cardPresentation === "manual_capture" && cardHost) {
    manualCaptureDraft = readManualCaptureDraftFromDom(cardHost.shadow);
  }

  const capture = getCaptureContext();

  const tokenRes = await sendMessage<{ token: string | null }>({ action: EXTENSION_MESSAGE.GET_AUTH });
  if (!tokenRes?.token) {
    if (tokenRes) {
      await sendMessage({ action: EXTENSION_MESSAGE.OPEN_LOGIN });
    }
    return;
  }

  const config = runtimeConfig ?? (await ensureRuntimeConfig());
  if (cardPresentation !== "manual_capture") {
    await refreshMetadataBeforeSave(config);
  }

  const captureDiagnostics = buildCaptureDiagnostics({
    url: capture.url,
    title: capture.title,
    company: capture.company,
    location: capture.location,
    salaryText: capture.salaryText,
    description: capture.description,
    platform: capture.platform,
    metadata: { confidence: capture.confidence },
    adapter: capture.platform,
    scrapePath: lastScrapeContext?.path ?? null,
    enrichmentsApplied: lastScrapeContext?.enrichments ?? [],
  });
  logCaptureDiagnostics(captureDiagnostics, { phase: "extension-save" });

  const payload = {
    url: capture.url,
    title: capture.title,
    company: capture.company,
    location: capture.location,
    salaryText: capture.salaryText,
    description: capture.description?.slice(0, 48_000) ?? null,
    platform: capture.platform,
    sourceProfileId: selectedProfileId,
    metadata: {
      confidence: capture.confidence,
      scrapePath: lastScrapeContext?.path ?? null,
      enrichmentsApplied: lastScrapeContext?.enrichments ?? [],
    },
  };

  pipelineBusy = true;
  pipelineBusyLabel = "Optimizing resume…";
  saveError = null;
  startStatusPolling();
  if (cardHost) renderCard(cardHost.shadow);

  try {
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
      action: EXTENSION_MESSAGE.RUN_PIPELINE,
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
      await refreshSavedStatus().catch(() => undefined);
      await syncRealtimeSubscription();
      startConfirmationWatch();
      if (cardHost) renderCard(cardHost.shadow);

      if (res?.success && res?.pendingPhase === "autofill" && savedStatus.id) {
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
    if (isExtensionContextInvalidatedError(error)) {
      teardownStaleExtensionContext();
      return;
    }
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

async function onPrimaryClick(): Promise<void> {
  if (!currentMetadata || pipelineBusy) return;
  if (cardPresentation === "no_job") return;

  if (savedStatus.saved) {
    await openJobTrackerDashboard({ review: true });
    return;
  }

  if (!isApplyEnabled()) return;

  await ensureRuntimeConfig();

  if (needsApplicationProfileSetup() && profileSetupScreen === 0) {
    profileSetupScreen = 1;
    cardCollapsed = false;
    if (cardHost) renderCard(cardHost.shadow);
  }

  await startApplyPipeline();
}

async function onSaveClick(): Promise<void> {
  await onPrimaryClick();
}

async function ensureRuntimeConfig(): Promise<ExtensionRuntimeConfig> {
  if (runtimeConfig) return runtimeConfig;
  return refreshRuntimeConfig();
}

async function forceShowCard(): Promise<{
  success: boolean;
  error?: string;
  title?: string;
  jobDetected?: boolean;
}> {
  if (!isContextValid() || window.top !== window.self) {
    return { success: false, error: "Cannot show the card in this frame." };
  }

  if (isEasySubmitAppPage()) {
    return {
      success: false,
      error: "The job card is hidden on the EasySubmit dashboard. Use Job Tracker in the app.",
    };
  }

  const config = await ensureRuntimeConfig();
  if (!isExtensionGlobalSwitchOn(config)) {
    return { success: false, error: "Extension is disabled platform-wide." };
  }

  try {
    stopDrag();
    cardCollapsed = false;
    pinnedUrl = location.href;
    const { presentation, metadata } = resolveCardContent(config, "manual");
    cardPresentation = presentation;

    await mountCard("body", metadata, { useDefaultPosition: true });
    return {
      success: true,
      title: presentation === "job" ? metadata.title : undefined,
      jobDetected: presentation === "job" || presentation === "manual_capture" || presentation === "loading",
    };
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
  await syncRealtimeSubscription().catch(() => undefined);
  if (savedStatus.status === "READY_TO_APPLY") {
    startConfirmationWatch();
  }
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
  if (cardPresentation === "loading") {
    startLoadingHydrationWatch();
  } else {
    stopLoadingHydrationWatch();
  }
}

function removeCard(): void {
  stopDrag();
  stopAllExtensionTimers();
  closeProfilePickerMenu();
  closeSettingsMenu();
  profilePickerDelegationReady = false;
  settingsMenuDelegationReady = false;
  void stopExtensionJobRealtime();
  realtimeStop = null;
  cardHost?.host.remove();
  cardHost = null;
  currentMetadata = null;
  cardPresentation = "job";
  manualCaptureDraft = null;
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
    if (!isExtensionGlobalSwitchOn(config)) {
      removeCard();
      return;
    }

    const onJobPage = isJobPage(document, location.href);

    if (pinnedUrl === location.href) {
      const { presentation, metadata } = resolveCardContent(config, "manual");
      cardPresentation = presentation;
      if (cardHost && currentMetadata?.title === metadata.title && cardPresentation === presentation) {
        currentMetadata = metadata;
        setCardVisible(true);
        if (cardHost) renderCard(cardHost.shadow);
        return;
      }
      await mountCard("body", metadata, { useDefaultPosition: true });
      return;
    }

    pinnedUrl = null;

    if (!onJobPage) {
      removeCard();
      return;
    }

    const { presentation, metadata } = resolveCardContent(config, "auto");
    if (presentation === "no_job") {
      removeCard();
      return;
    }
    cardPresentation = presentation;
    await mountCard("body", metadata);
  } catch (error) {
    console.warn("EasySubmit: job card update failed", error);
    if (!runtimeConfig) {
      runtimeConfig = DEFAULT_RUNTIME_CONFIG;
      void updateCard();
    }
  }
}

function scheduleUpdate(delayMs = 350): void {
  if (!isContextValid()) return;
  if (updateTimer) clearTimeout(updateTimer);
  const delay = pinnedUrl === location.href ? Math.max(delayMs, 2000) : delayMs;
  updateTimer = setTimeout(() => {
    void updateCard().catch(swallowContextInvalidation);
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

function interceptedToMetadata(data: InterceptedJobData): ScrapedJobMetadata {
  const jsonLdFields =
    data.qualifications || data.responsibilities
      ? {
          qualifications: data.qualifications ?? undefined,
          responsibilities: data.responsibilities ?? undefined,
        }
      : undefined;
  return {
    title: data.title ?? "",
    company: data.company ?? null,
    location: data.location ?? null,
    salaryText: null,
    description: data.description ?? null,
    platform: data.platform,
    confidence: 95,
    ...(jsonLdFields ? { jsonLdFields } : {}),
  };
}

function bootJobPageObservers(): void {
  handleAssistOpenOnLoad();
  injectApiInterceptScript();

  window.addEventListener("unhandledrejection", (event) => {
    if (isExtensionContextInvalidatedError(event.reason)) {
      event.preventDefault();
      teardownStaleExtensionContext();
    }
  });

  setupFieldCaptureBridge({
    getJobEntryId: () => savedStatus.id,
    onCapture: (payload: FieldCapturePayload, jobEntryId?: string) => {
      void postFieldCapture(payload, jobEntryId ?? savedStatus.id).catch(() => undefined);
    },
  });

  onApiIntercept((data) => {
    if (!data.title) return;
    interceptedMetadata = interceptedToMetadata(data);
    // If card is already showing, upgrade it with the richer API data immediately
    if (currentMetadata && cardHost) {
      currentMetadata = interceptedMetadata;
      renderCard(cardHost.shadow);
    }
  });

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
  stopUrlWatch();
  urlWatchTimer = setInterval(() => {
    if (!guardExtensionContext()) return;
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      pinnedUrl = null;
      runtimeConfig = null;
      interceptedMetadata = null;
      maybeMarkAppliedFromConfirmation();
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
    const bootWhenGloballyEnabled = (): void => {
      void refreshRuntimeConfig()
        .then((config) => {
          if (!isExtensionGlobalSwitchOn(config)) return;
          bootJobPageObservers();
        })
        .catch(() => undefined);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootWhenGloballyEnabled);
    } else {
      bootWhenGloballyEnabled();
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
