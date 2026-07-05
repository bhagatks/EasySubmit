import { setupBridgeRelay } from "./bridge-relay";
import { resolveJobTrackerPlatform } from "@shared/ats-platform-detection";
import { maybeAutoConnectExtensionFromDashboard } from "@shared/extension/dashboard-auto-connect";
import { buildExtensionBridgePath } from "@shared/extension/connect-account-url";
import { EXTENSION_MESSAGE, STORAGE_KEYS, EXTENSION_ENHANCE_TIMEOUT_MS } from "@shared/extension/constants";
import { detectJobPage } from "@shared/extension/detect-job-page";
import { buildFallbackJobMetadata } from "@shared/extension/force-metadata";
import { isJobPage } from "@shared/extension/is-job-page";
import { isGenericNavigationJobTitle, scrapeDescription } from "@shared/extension/scrape-helpers";
import { mergeExtensionRuntimeConfig, EXTENSION_RUNTIME_DEFAULTS } from "@shared/extension/runtime-config-merge";
import {
  JOB_CARD_COLLAPSED_SIZE,
  JOB_CARD_WIDTH,
  clampCardPanelWidth,
  clampCardPanelHeight,
  defaultCardPanelBodyMaxHeight,
  clampFixedCardPosition,
  getCollapsedFixedCardPosition,
  getDefaultFixedCardPosition,
  syncCardPositionForHostWidth,
  type FixedCardPosition,
} from "@shared/extension/card-position";
import type {
  ExtensionResumeProfilesResponse,
  ExtensionRuntimeConfig,
  ScrapedJobMetadata,
} from "@shared/extension/types";
import { glossyShellStyles, type ManualPipelineStep } from "@shared/extension/stage-nudge";
import {
  buildCaptureDiagnostics,
  logCaptureDiagnostics,
} from "@shared/extension/capture-diagnostics";
import { pollJobStatusUntil } from "@shared/extension/pipeline-status-poll";
import {
  pipelineDebugDashboardHref,
  isWebPipelineDebugAvailable,
} from "@shared/extension/pipeline-debug-web";
import type { PipelineDebugStepStatus } from "@shared/extension/pipeline-debug-types";
import { isApplyPipelineStepAnalyticsEnabledClient } from "@shared/extension/apply-pipeline-step-analytics-gate";
import { runWorkdayAutofill, type WorkdayFillData } from "@shared/extension/workday-autofill";
import { setupFieldCaptureBridge } from "@shared/extension/field-capture-bridge";
import type { FieldCapturePayload } from "@shared/extension/field-descriptor";
import type { ServerLookupMap } from "@shared/extension/field-resolution";
import { injectApiInterceptScript, onApiIntercept, type InterceptedJobData } from "@shared/extension/api-intercept";
import { isGreenhouseEmbeddedJobUrl, isGreenhouseBoardJobUrl } from "@shared/extension/greenhouse-helpers";
import { preferGreenhouseBoardApiDescription } from "@shared/extension/greenhouse-board-fetch";
import { isEasySubmitManagedAppPage } from "@shared/extension/easysubmit-app-page";
import { isExtensionGlobalSwitchOn } from "@shared/extension/extension-global-switch";
import type { ApplicationProfile } from "@/lib/profile/application-profile";
import {
  isApplicationProfileSetupComplete,
  applicationProfilePatchFromScreen1,
  applicationProfilePatchFromScreen2,
  applicationProfilePatchFromScreen3,
  syncProfileSetupDraftsFromProfile,
  validateProfileSetupScreen1,
  type ProfileSetupScreen1ValidationIssue,
  type ApplicationProfileScreen3Input,
} from "@/lib/profile/application-profile-setup";
import { BRAND, renderExtensionCardBrandMarkup } from "@shared/brand";
import type { JobTrackerStatus } from "@/lib/generated/prisma/client";
import { APPLY_PIPELINE_USER_LINES, resolveExtensionUserMessage } from "@shared/extension/apply-pipeline-user-messages";
import { brandExtensionTokens } from "@shared/brand-colors";
import { extensionButtonStyles } from "@shared/brand-buttons";
import { SETTINGS_AI_AUTO_HREF } from "@/lib/dashboard/settings-ai-links";
import { prepareExtensionEmbedPreview } from "@/lib/extension/extension-preview-html";
import { downloadBytes } from "@/lib/job-tracker/export/download-client";
import {
  exposeEasySubmitAnimationGlobals,
  stopEasySubmitAnimation,
  triggerEasySubmitAnimation,
  type EasySubmitAnimationController,
} from "@shared/extension/easysubmit-brand-canvas-animation";
import { ENHANCE_PROGRESS_CAPTION, wrapContentWithBrandProgressOverlay } from "@shared/extension/enhance-progress-overlay";
import {
  failApplyPipelineLoader,
  isApplyPipelineLoaderRunning,
  startApplyPipelineLoader,
  stopApplyPipelineLoader,
  succeedApplyPipelineLoader,
} from "@shared/extension/apply-pipeline-loader";
import {
  DOCUMENT_PREVIEW_AI_SETTINGS_LABEL,
  DOCUMENT_PREVIEW_FIX_KEY_LABEL,
  formatDocumentPreviewErrorMessage,
  resolveEnhanceFallbackSettingsPath,
  resolveEnhanceFallbackWarning,
} from "@shared/extension/document-preview-alert";
import {
  isEnhanceTimeoutError,
  raceWithEnhanceTimeout,
} from "@/src/lib/ai/engine/enhance-timeout";
import { createEnhanceTraceId } from "@/src/lib/ai/engine/enhance-logger";
import {
  AnalyticsEvents,
  captureAnalyticsEvent,
  trackEnhanceClicked,
  trackEnhanceCompleted,
  trackResumeJourneyStep,
  trackApplyPipelineStep,
  trackScreenOverlay,
  trackUiInteraction,
} from "@shared/analytics";
import {
  escapeHintAttr,
  floatingHintStyles,
  FLOATING_HINT_BUTTON_CLASS,
} from "@shared/extension/floating-hint-styles";
import {
  resolveExtensionAiHealthBanner,
  shouldHidePipelineErrorInBody,
  isExtensionApplyBlockedByAiHealth,
  getExtensionAiHealthBlockMessage,
} from "@shared/extension/ai-health-banner";
import {
  resolveExtensionReconnectBanner,
  shouldHideSaveErrorForReconnectBanner,
} from "@shared/extension/reconnect-banner";
import {
  getExtensionForceUpgradeBlockMessage,
  isExtensionForceUpgradeRequired,
  resolveExtensionForceUpgradeBanner,
} from "@shared/extension/extension-force-upgrade";
import {
  buildLoadingJobMetadata,
  buildManualCaptureMetadata,
  type CardPresentation,
} from "@shared/extension/card-presentation";
import { presentationToTabStatus, tabStatusLabel, type ExtensionTabStatusPayload } from "@shared/extension/tab-status";
import { canApplyCapture, applyCaptureBlockReason, canManualCaptureSave, manualCaptureBlockReason } from "@shared/extension/apply-gate";
import {
  applyJobDetailDraftToMetadata,
  buildJobDetailDraft,
  jobDetailDraftsEqual,
  jobDetailDraftToFieldsPayload,
  normalizeJobDetailDraft,
  type JobDetailDraft,
} from "@shared/extension/job-detail-edit";
import {
  coverDetailDraftsEqual,
  normalizeCoverDetailDraft,
  type CoverDetailDraft,
} from "@shared/extension/cover-detail-edit";
import {
  normalizeResumeDetailDraft,
  resumeDetailDraftsEqual,
  type ResumeDetailDraft,
} from "@shared/extension/resume-detail-edit";
import { resolveJobIdentity } from "@shared/extension/job-identity";
import { detectApplicationConfirmation, shouldWatchForApplicationConfirmation } from "@shared/extension/confirmation-detect";
import { hasAssistOpenParam, stripAssistOpenParam } from "@shared/extension/assist-open-url";
import { parseCompanyFromJobHost } from "@shared/extension/job-url-parse";
import {
  classifyJourneySyncTransition,
  extensionJourneySyncPollIntervalMs,
  resolveExtensionJourneyDisplay,
  resolveExtensionSaveError,
  shouldResetExtensionAfterSync,
  shouldRunExtensionJourneySyncPoll,
  snapshotFromServerStatus,
  type JourneySnapshot,
} from "@shared/extension/journey-sync";
import { journeySyncDebug, journeySyncLog } from "@shared/extension/journey-sync-log";
import { canonicalizeJobUrl } from "@shared/extension/job-url";
import { resolveCardContent as resolveCardContentShared } from "./resolve-card-content";
import type { ExtensionCardView } from "@shared/extension/card-layout";
import { buildJobDetailFields, isExpandableCardView } from "@shared/extension/card-layout";
import {
  manualCaptureStyles,
  loadingBodyStyles,
  renderLoadingBody,
  renderManualCaptureBody,
  renderManualCaptureActions,
  renderNoJobBody,
  renderSummaryCardBody,
  renderJobDetailBody,
  readJobDetailDraftFromDom,
  renderCoverPreviewBody,
  renderResumePreviewBody,
  readCoverDetailDraftFromDom,
  readResumeDetailDraftFromDom,
  updateDetailToolbarDirtyState,
  updateJobDetailDescriptionHint,
  renderPanelResizeGripMarkup,
  panelResizeStyles,
  singleCardLayoutStyles,
  renderProfileSetupScreen1,
  renderProfileSetupScreen2,
  renderProfileSetupScreen3,
  bindProfileSalaryRangeSlider,
  bindProfileSetupActionButton,
  readProfileSetupScreen1FromDom,
  readProfileSetupScreen2FromDom,
  readProfileSetupScreen3FromDom,
  defaultProfileSetupScreen1Draft,
  defaultProfileSetupScreen2Draft,
  defaultProfileSetupScreen3Draft,
  profileSetupStyles,
  type ManualCaptureDraft,
  type ProfileSetupScreen1Draft,
  type ProfileSetupScreen2Draft,
  type ProfileSetupScreen3Draft,
} from "./card-ui";
import {
  isJobStatusRealtimeActive,
  startJobStatusRealtime,
  stopJobStatusRealtime,
} from "./job-realtime";
import {
  isChromeExtensionContextValid,
  isExtensionContextInvalidatedError,
  isExtensionContextInvalidatedMessage,
} from "@shared/extension/extension-context";

type EasySubmitContentWindow = Window & {
  __easysubmitCleanup?: () => void;
  __easysubmitTeardownDone?: boolean;
  __easysubmitHandleMessage?: (
    message: Record<string, unknown>,
    sendResponse: (response?: unknown) => void,
  ) => boolean | void;
  __easysubmitMessageHooked?: boolean;
  __easysubmitObserversBooted?: boolean;
  __easysubmitDomObserversBooted?: boolean;
};

const contentWindow = window as EasySubmitContentWindow;
contentWindow.__easysubmitCleanup?.();
contentWindow.__easysubmitTeardownDone = false;

function bootContentScript(): void {
const HOST_ID = "easysubmit-job-card-host";
const EXTENSION_ICON_HD = "icons/icon-128.png";

function extensionIconUrl(size: "48" | "128" = "128"): string {
  return chrome.runtime.getURL(size === "128" ? EXTENSION_ICON_HD : "icons/icon-48.png");
}
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
let interceptedMetadataSource: "page-intercept" | "greenhouse-board-api" | null = null;
let greenhouseEmbeddedFetchKey: string | null = null;
let greenhouseEmbeddedFetchPromise: Promise<void> | null = null;
let lastScrapeContext: { path: string; enrichments: string[] } | null = null;
let savedStatus: {
  saved: boolean;
  status?: string;
  id?: string;
  canReapply?: boolean;
  issueMessage?: string | null;
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
let journeySyncTimer: ReturnType<typeof setInterval> | null = null;
let lastJourneySnapshot: JourneySnapshot | null = null;
let autofillRunForEntryId: string | null = null;
let manualCaptureDraft: ManualCaptureDraft | null = null;
let keywordGapData: { topMissing: string[]; coveragePercent: number | null } | null = null;
let profileSetupScreen: 0 | 1 | 2 | 3 = 0;
let profileSetupScreen1Draft: ProfileSetupScreen1Draft = defaultProfileSetupScreen1Draft();
let profileSetupScreen2Draft: ProfileSetupScreen2Draft = defaultProfileSetupScreen2Draft();
let profileSetupScreen3Draft: ProfileSetupScreen3Draft = defaultProfileSetupScreen3Draft();
let profileSetupScreen1ValidationIssues: ProfileSetupScreen1ValidationIssue[] = [];
let profileSetupContinueBusy = false;
let profileSetupSaveError: string | null = null;
let pendingApplyAfterProfileSetup = false;
let cachedApplicationProfile: ApplicationProfile | null = null;
let cardLaunchMode: "auto" | "manual" = "auto";
let assistUploadWarnings: string[] = [];
let confirmationWatchTimer: ReturnType<typeof setInterval> | null = null;
let loadingHydrationTimer: ReturnType<typeof setInterval> | null = null;
let urlWatchTimer: ReturnType<typeof setInterval> | null = null;
let domContentObserver: MutationObserver | null = null;
let tabReturnedAt = 0;
const TAB_RETURN_GRACE_MS = 2000;

type ResumeProfileOption = { id: string; label: string; isDefault: boolean };
let resumeProfiles: ResumeProfileOption[] = [];
let selectedProfileId: string | null = null;
let defaultProfileId: string | null = null;
let resumeProfilesHeaderFetchPending = false;
let profilePickerOpen = false;
let settingsMenuOpen = false;
let headerRefreshBusy = false;
let cardView: ExtensionCardView = "summary";
let cardPanelWidth = JOB_CARD_WIDTH;
let cardPanelBodyMaxHeight: number | null = null;
let panelResizeActive = false;
let jobDetailEditing = false;
let jobDetailBaseline: JobDetailDraft | null = null;
let jobDetailDraft: JobDetailDraft | null = null;
let jobDetailDirty = false;
let jobDetailSaving = false;
let coverDetailEditing = false;
let coverDetailEditLoading = false;
let coverDetailBaseline: CoverDetailDraft | null = null;
let coverDetailDraft: CoverDetailDraft | null = null;
let coverDetailDirty = false;
let coverDetailSaving = false;
let resumeDetailEditing = false;
let resumeDetailEditLoading = false;
let resumeDetailBaseline: ResumeDetailDraft | null = null;
let resumeDetailDraft: ResumeDetailDraft | null = null;
let resumeDetailDirty = false;
let resumeDetailSaving = false;
let documentDownloadBusy: "pdf" | "doc" | null = null;
let documentEnhanceBusy = false;
let documentEnhanceByokOffer: "resume" | "cover" | null = null;
let documentEnhanceFallbackFix: { path: string; label: string } | null = null;

type DocumentEnhanceRun = {
  id: number;
  cancelled: boolean;
  kind: "resume" | "cover";
};

let documentEnhanceRun: DocumentEnhanceRun | null = null;
let documentEnhanceRunSeq = 0;
let enhanceAnimationController: EasySubmitAnimationController | null = null;
let enhanceAnimationCanvas: HTMLCanvasElement | null = null;
let enhanceAnimationUntil: Promise<void> | null = null;
let resolveEnhanceAnimationUntil: (() => void) | null = null;
let applyPipelineSessionId: string | null = null;
let pipelineDebugWindow: Window | null = null;

function openWebPipelineDebugPanel(entryId?: string | null): void {
  if (!isWebPipelineDebugAvailable()) return;
  const trimmedEntryId = entryId?.trim();
  if (!trimmedEntryId) return;

  const config = runtimeConfig ?? EXTENSION_RUNTIME_DEFAULTS;
  const href = pipelineDebugDashboardHref(config.apiBaseUrl, trimmedEntryId);

  // Named target reuses one dashboard tab; noopener breaks reuse (returns null → second tab).
  const opened = window.open(href, "easysubmit-pipeline-debug");
  if (opened) {
    pipelineDebugWindow = opened;
    opened.focus();
    return;
  }
  if (pipelineDebugWindow && !pipelineDebugWindow.closed) {
    pipelineDebugWindow.location.href = href;
    pipelineDebugWindow.focus();
  }
}

function trackClientApplyPipelineStep(
  stepId: string,
  update: {
    status: PipelineDebugStepStatus;
    detail?: string;
    meta?: Record<string, unknown>;
  },
  entryId?: string | null,
): void {
  if (update.status === "pending") return;
  if (entryId && stepId !== "capture_validate") return;
  if (
    !isApplyPipelineStepAnalyticsEnabledClient(
      runtimeConfig?.applyPipelineStepAnalytics,
    )
  ) {
    return;
  }

  trackApplyPipelineStep({
    stepId,
    status: update.status,
    applySessionId: applyPipelineSessionId,
    entryId: entryId ?? undefined,
    detail: update.detail ?? null,
    meta: update.meta ?? null,
    applyPipelineStepAnalytics: runtimeConfig?.applyPipelineStepAnalytics,
  });
}

function patchLocalApplyPipelineStep(
  stepId: string,
  update: {
    status: PipelineDebugStepStatus;
    detail?: string;
    meta?: Record<string, unknown>;
  },
  entryId?: string | null,
): void {
  trackClientApplyPipelineStep(stepId, update, entryId);
}

function resetEnhanceAnimationUntil(): void {
  enhanceAnimationUntil = null;
  resolveEnhanceAnimationUntil = null;
}

function beginEnhanceAnimationUntil(): Promise<void> {
  resetEnhanceAnimationUntil();
  enhanceAnimationUntil = new Promise<void>((resolve) => {
    resolveEnhanceAnimationUntil = resolve;
  });
  return enhanceAnimationUntil;
}

function releaseEnhanceAnimationUntil(): void {
  resolveEnhanceAnimationUntil?.();
  resetEnhanceAnimationUntil();
}

function extensionHasPipelineFailure(): boolean {
  return resolveExtensionUserMessage({
    saved: savedStatus.saved,
    status: (savedStatus.status as JobTrackerStatus | undefined) ?? null,
    pipelineBusy: false,
    pipelineBusyLabel: null,
    saveError,
    issueMessage: savedStatus.issueMessage,
  }).kind === "error";
}

/** Job info + resume optimization in flight — EasySubmit button hidden, loader shown. */
function isEasySubmitPipelineInFlight(): boolean {
  if (pipelineBusy) return true;
  if (!savedStatus.saved || savedStatus.canReapply) return false;
  if (savedStatus.status !== "CAPTURED") return false;
  return !extensionHasPipelineFailure();
}

function pipelineProgressCaption(): string {
  const label = pipelineBusyLabel?.trim();
  if (label) {
    if (label.toLowerCase().includes("optimiz")) return APPLY_PIPELINE_USER_LINES.optimizingResume;
    if (label.toLowerCase().includes("captur") || label.toLowerCase().includes("saving")) {
      return APPLY_PIPELINE_USER_LINES.jobCapturing;
    }
    return label.replace(/…/g, "").trim();
  }
  return APPLY_PIPELINE_USER_LINES.optimizingResume;
}

/**
 * Reconcile the independent apply-pipeline loader with pipeline state.
 * Forward-only: start while in flight, dismiss on terminal success/failure.
 */
function syncApplyPipelineLoader(root: ShadowRoot): void {
  const slot = root.querySelector("[data-apply-loader-slot]") as HTMLElement | null;

  if (isEasySubmitPipelineInFlight()) {
    if (slot) startApplyPipelineLoader({ slot });
    return;
  }

  if (!isApplyPipelineLoaderRunning()) return;

  if (extensionHasPipelineFailure()) {
    failApplyPipelineLoader();
    return;
  }

  succeedApplyPipelineLoader();
}

function syncEnhanceBrandAnimation(root: ShadowRoot): void {
  if (!documentEnhanceBusy) {
    stopEasySubmitAnimation();
    enhanceAnimationController = null;
    enhanceAnimationCanvas = null;
    return;
  }

  const canvas = root.querySelector("#brand-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;

  const subtext = ENHANCE_PROGRESS_CAPTION;
  const subtextEl = root.querySelector("#status-subtext") as HTMLElement | null;
  if (subtextEl) subtextEl.textContent = subtext;

  if (enhanceAnimationController && enhanceAnimationCanvas === canvas) return;

  stopEasySubmitAnimation();
  enhanceAnimationController = triggerEasySubmitAnimation({
    root,
    subtext,
    until: enhanceAnimationUntil ?? undefined,
  });
  enhanceAnimationCanvas = canvas;
}
let previewHtmlCache: Partial<Record<"resume" | "cover", string>> = {};
let previewLoadState: "idle" | "loading" | "error" = "idle";
let previewError: string | null = null;

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
  console.log("[EasySubmit] lifecycle:stop-all-timers");
  stopStatusPolling();
  stopJourneySyncPoll();
  stopConfirmationWatch();
  stopLoadingHydrationWatch();
  stopUrlWatch();
  if (updateTimer) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }
}

function teardownStaleExtensionContext(): void {
  if (contentWindow.__easysubmitTeardownDone) return;
  contentWindow.__easysubmitTeardownDone = true;
  console.log("[EasySubmit] lifecycle:teardown — stale context, cleaning up", { url: location.href });
  stopAllExtensionTimers();
  stopApplyPipelineLoader();
  void stopJobStatusRealtime();
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
        console.warn("[EasySubmit] msg:error", { error: lastError.message, action: message.action });
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
  _meta: ScrapedJobMetadata,
  _config: ExtensionRuntimeConfig | null,
): boolean {
  // Auto-apply (Workday autofill) is paused indefinitely.
  return false;
}

function getPipelineUiMode(_config: ExtensionRuntimeConfig | null): "auto" | "manual" {
  return "manual";
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

function resolveExtensionJourneyDisplayLocal() {
  return resolveExtensionJourneyDisplay({
    saved: savedStatus.saved,
    status: savedStatus.status,
    canReapply: savedStatus.canReapply,
    pipelineBusy,
    pipelineBusyLabel,
    saveError,
    issueMessage: savedStatus.issueMessage,
  });
}

function getExtensionStatusPresentation(): {
  line: string | null;
  kind: "idle" | "progress" | "success" | "warning" | "error";
} {
  const message = resolveExtensionUserMessage({
    saved: savedStatus.saved,
    status: (savedStatus.status as JobTrackerStatus | undefined) ?? null,
    pipelineBusy,
    pipelineBusyLabel,
    saveError,
    issueMessage: savedStatus.issueMessage,
  });
  return { line: message.line, kind: message.kind };
}

function getPrimaryCtaLabel(): string {
  if (cardPresentation === "manual_capture" && !savedStatus.saved) {
    return "Save to tracker";
  }
  return BRAND.applyCta;
}

function getJourneyStatusLabel(): string | null {
  return getExtensionStatusPresentation().line;
}

function showExtensionApplyActions(): boolean {
  return (
    profileSetupScreen === 0 &&
    cardPresentation === "job" &&
    cardView === "summary"
  );
}

function resolveExtensionApplyCtaState(applyEnabled: boolean): {
  showEasySubmitCta: boolean;
  showAutoSuggestCta: boolean;
  easySubmitDisabled: boolean;
  autoSuggestDisabled: boolean;
} {
  const journey = resolveExtensionJourneyDisplayLocal();
  const hasError = journey.stage === "error";
  const inFlight = isEasySubmitPipelineInFlight();
  const { saved, status, canReapply } = savedStatus;

  const autoSuggestReady =
    saved && (status === "READY_TO_APPLY" || canReapply) && !hasError && !inFlight;

  const showAutoSuggestCta =
    saved &&
    !hasError &&
    !inFlight &&
    (status === "RESUME_READY" || status === "READY_TO_APPLY" || Boolean(canReapply));

  const showEasySubmitCta =
    !inFlight &&
    !showAutoSuggestCta &&
    (!saved || hasError || (status === "CAPTURED" && extensionHasPipelineFailure()));

  return {
    showEasySubmitCta,
    showAutoSuggestCta,
    easySubmitDisabled: !applyEnabled || inFlight,
    autoSuggestDisabled: !autoSuggestReady,
  };
}

function resetCoverDetailEditState(): void {
  coverDetailEditing = false;
  coverDetailEditLoading = false;
  coverDetailBaseline = null;
  coverDetailDraft = null;
  coverDetailDirty = false;
  coverDetailSaving = false;
  documentDownloadBusy = null;
  documentEnhanceBusy = false;
}

function resetResumeDetailEditState(): void {
  resumeDetailEditing = false;
  resumeDetailEditLoading = false;
  resumeDetailBaseline = null;
  resumeDetailDraft = null;
  resumeDetailDirty = false;
  resumeDetailSaving = false;
  documentDownloadBusy = null;
  documentEnhanceBusy = false;
}

function resetJobDetailEditState(): void {
  jobDetailEditing = false;
  jobDetailBaseline = null;
  jobDetailDraft = null;
  jobDetailDirty = false;
  jobDetailSaving = false;
}

function initJobDetailDraft(): void {
  const capture = getCaptureContext();
  const meta = currentMetadata;
  jobDetailBaseline = buildJobDetailDraft({
    title: capture.title,
    company: capture.company,
    location: capture.location,
    salaryText: capture.salaryText,
    description: capture.description,
    platform: capture.platform,
    jsonLdFields: meta?.jsonLdFields,
  });
  jobDetailDraft = { ...jobDetailBaseline };
  jobDetailDirty = false;
  jobDetailEditing = false;
}

function syncJobDetailDraftFromDom(root: ShadowRoot): void {
  if (!jobDetailBaseline || !jobDetailDraft) return;
  jobDetailDraft = readJobDetailDraftFromDom(root, jobDetailDraft);
  jobDetailDirty = !jobDetailDraftsEqual(jobDetailDraft, jobDetailBaseline);
  updateDetailToolbarDirtyState(root, {
    saveSelector: "[data-job-detail-save]",
    dirty: jobDetailDirty,
    saving: jobDetailSaving,
  });
  updateJobDetailDescriptionHint(root, jobDetailDraft.description.trim().length);
}

function syncCoverDetailDraftFromDom(root: ShadowRoot): void {
  if (!coverDetailBaseline || !coverDetailDraft) return;
  coverDetailDraft = readCoverDetailDraftFromDom(root, coverDetailDraft);
  coverDetailDirty = !coverDetailDraftsEqual(coverDetailDraft, coverDetailBaseline);
  updateDetailToolbarDirtyState(root, {
    saveSelector: "[data-cover-detail-save]",
    dirty: coverDetailDirty,
    saving: coverDetailSaving,
  });
}

function syncResumeDetailDraftFromDom(root: ShadowRoot): void {
  if (!resumeDetailBaseline || !resumeDetailDraft) return;
  resumeDetailDraft = readResumeDetailDraftFromDom(root, resumeDetailDraft);
  resumeDetailDirty = !resumeDetailDraftsEqual(resumeDetailDraft, resumeDetailBaseline);
  updateDetailToolbarDirtyState(root, {
    saveSelector: "[data-resume-detail-save]",
    dirty: resumeDetailDirty,
    saving: resumeDetailSaving,
  });
}

async function saveJobDetailEdits(root: ShadowRoot): Promise<void> {
  if (!jobDetailBaseline || jobDetailSaving) return;

  const draft = readJobDetailDraftFromDom(root, jobDetailDraft ?? jobDetailBaseline);
  jobDetailDraft = draft;

  const capture = getCaptureContext();
  const normalized = normalizeJobDetailDraft(draft);
  if (normalized.title.length < 2) {
    saveError = "Title is required.";
    if (cardHost) renderCard(cardHost.shadow);
    return;
  }
  if (!canApplyCapture({ url: capture.url, description: draft.description })) {
    saveError = applyCaptureBlockReason({ url: capture.url, description: draft.description });
    if (cardHost) renderCard(cardHost.shadow);
    return;
  }

  jobDetailSaving = true;
  saveError = null;
  if (cardHost) renderCard(cardHost.shadow);

  try {
    if (currentMetadata) {
      currentMetadata = applyJobDetailDraftToMetadata(currentMetadata, draft);
    }

    if (savedStatus.saved && savedStatus.id) {
      const res = await sendMessage<{ success: boolean; error?: string }>({
        action: EXTENSION_MESSAGE.UPDATE_JOB_FIELDS,
        entryId: savedStatus.id,
        payload: jobDetailDraftToFieldsPayload(draft),
      });
      if (!res?.success) {
        throw new Error(res?.error ?? "Could not save job details.");
      }
      await refreshSavedStatus();
    }

    const savedDraft = normalizeJobDetailDraft(draft);
    jobDetailBaseline = { ...savedDraft };
    jobDetailDraft = { ...savedDraft };
    jobDetailDirty = false;
    jobDetailEditing = false;
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      teardownStaleExtensionContext();
      return;
    }
    saveError = error instanceof Error ? error.message : "Could not save job details.";
  } finally {
    jobDetailSaving = false;
    if (cardHost) renderCard(cardHost.shadow);
  }
}

async function fetchCoverDetailDraft(): Promise<boolean> {
  if (!savedStatus.id) {
    saveError = "Save this job first to edit the cover letter.";
    return false;
  }

  coverDetailEditLoading = true;
  saveError = null;
  if (cardHost) renderCard(cardHost.shadow);

  try {
    const res = await sendMessage<{ success: boolean; body?: string; error?: string }>({
      action: EXTENSION_MESSAGE.GET_COVER_LETTER_BODY,
      entryId: savedStatus.id,
    });
    if (!res?.success || typeof res.body !== "string") {
      throw new Error(res?.error ?? "Could not load cover letter.");
    }
    const draft = normalizeCoverDetailDraft({ body: res.body });
    coverDetailBaseline = { ...draft };
    coverDetailDraft = { ...draft };
    coverDetailDirty = false;
    return true;
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      teardownStaleExtensionContext();
      return false;
    }
    saveError = error instanceof Error ? error.message : "Could not load cover letter.";
    return false;
  } finally {
    coverDetailEditLoading = false;
    if (cardHost) renderCard(cardHost.shadow);
  }
}

async function fetchResumeDetailDraft(): Promise<boolean> {
  if (!savedStatus.id) {
    saveError = "Save this job first to edit the resume.";
    return false;
  }

  resumeDetailEditLoading = true;
  saveError = null;
  if (cardHost) renderCard(cardHost.shadow);

  try {
    const res = await sendMessage<{ success: boolean; draft?: ResumeDetailDraft; error?: string }>({
      action: EXTENSION_MESSAGE.GET_RESUME_FORM,
      entryId: savedStatus.id,
    });
    if (!res?.success || !res.draft) {
      throw new Error(res?.error ?? "Could not load resume fields.");
    }
    const draft = normalizeResumeDetailDraft(res.draft);
    resumeDetailBaseline = { ...draft };
    resumeDetailDraft = { ...draft };
    resumeDetailDirty = false;
    return true;
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      teardownStaleExtensionContext();
      return false;
    }
    saveError = error instanceof Error ? error.message : "Could not load resume fields.";
    return false;
  } finally {
    resumeDetailEditLoading = false;
    if (cardHost) renderCard(cardHost.shadow);
  }
}

async function saveCoverDetailEdits(root: ShadowRoot): Promise<void> {
  if (!coverDetailBaseline || coverDetailSaving) return;

  const draft = readCoverDetailDraftFromDom(root, coverDetailDraft ?? coverDetailBaseline);
  coverDetailDraft = draft;

  if (!savedStatus.id) {
    saveError = "Save this job first to edit the cover letter.";
    if (cardHost) renderCard(cardHost.shadow);
    return;
  }

  coverDetailSaving = true;
  saveError = null;
  if (cardHost) renderCard(cardHost.shadow);

  try {
    const normalized = normalizeCoverDetailDraft(draft);
    const res = await sendMessage<{ success: boolean; error?: string }>({
      action: EXTENSION_MESSAGE.SAVE_COVER_LETTER,
      entryId: savedStatus.id,
      body: normalized.body,
    });
    if (!res?.success) {
      throw new Error(res?.error ?? "Could not save cover letter.");
    }

    coverDetailBaseline = { ...normalized };
    coverDetailDraft = { ...normalized };
    coverDetailDirty = false;
    coverDetailEditing = false;
    await refreshDocumentPreview("cover", { silent: true });
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      teardownStaleExtensionContext();
      return;
    }
    saveError = error instanceof Error ? error.message : "Could not save cover letter.";
  } finally {
    coverDetailSaving = false;
    if (cardHost) renderCard(cardHost.shadow);
  }
}

async function saveResumeDetailEdits(root: ShadowRoot): Promise<void> {
  if (!resumeDetailBaseline || resumeDetailSaving) return;

  const draft = readResumeDetailDraftFromDom(root, resumeDetailDraft ?? resumeDetailBaseline);
  resumeDetailDraft = draft;

  const normalized = normalizeResumeDetailDraft(draft);
  if (!normalized.targetTitle) {
    saveError = "Target title is required.";
    if (cardHost) renderCard(cardHost.shadow);
    return;
  }

  if (!savedStatus.id) {
    saveError = "Save this job first to edit the resume.";
    if (cardHost) renderCard(cardHost.shadow);
    return;
  }

  resumeDetailSaving = true;
  saveError = null;
  if (cardHost) renderCard(cardHost.shadow);

  try {
    const res = await sendMessage<{ success: boolean; error?: string }>({
      action: EXTENSION_MESSAGE.SAVE_RESUME_FORM,
      entryId: savedStatus.id,
      payload: normalized,
    });
    if (!res?.success) {
      throw new Error(res?.error ?? "Could not save resume.");
    }

    resumeDetailBaseline = { ...normalized };
    resumeDetailDraft = { ...normalized };
    resumeDetailDirty = false;
    resumeDetailEditing = false;
    await refreshDocumentPreview("resume", { silent: true });
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      teardownStaleExtensionContext();
      return;
    }
    saveError = error instanceof Error ? error.message : "Could not save resume.";
  } finally {
    resumeDetailSaving = false;
    if (cardHost) renderCard(cardHost.shadow);
  }
}

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function downloadDocumentPreview(
  kind: "resume" | "cover",
  format: "pdf" | "doc",
): Promise<void> {
  if (!savedStatus.id || documentDownloadBusy) return;

  documentDownloadBusy = format;
  saveError = null;
  if (cardHost) renderCard(cardHost.shadow);

  const action =
    kind === "resume"
      ? format === "pdf"
        ? EXTENSION_MESSAGE.GET_RESUME_PDF
        : EXTENSION_MESSAGE.GET_RESUME_DOCX
      : format === "pdf"
        ? EXTENSION_MESSAGE.GET_COVER_LETTER_PDF
        : EXTENSION_MESSAGE.GET_COVER_LETTER_DOCX;

  try {
    const res = await sendMessage<{
      success: boolean;
      bytes?: number[];
      filename?: string;
      error?: string;
    }>({
      action,
      entryId: savedStatus.id,
    });

    if (!res?.success || !res.bytes?.length) {
      saveError = formatDocumentPreviewErrorMessage(
        res?.error ?? "Could not download this document.",
      );
      return;
    }

    downloadBytes({
      bytes: new Uint8Array(res.bytes),
      filename: res.filename ?? `${kind}.${format === "pdf" ? "pdf" : "docx"}`,
      mimeType: format === "pdf" ? "application/pdf" : DOCX_MIME,
    });
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      teardownStaleExtensionContext();
      return;
    }
    saveError = formatDocumentPreviewErrorMessage(
      error instanceof Error ? error.message : "Could not download this document.",
    );
  } finally {
    documentDownloadBusy = null;
    if (cardHost) renderCard(cardHost.shadow);
  }
}

function isDocumentEnhanceRunCancelled(run: DocumentEnhanceRun): boolean {
  return run.cancelled || documentEnhanceRun?.id !== run.id;
}

function cancelDocumentEnhance(): void {
  if (!documentEnhanceRun || !documentEnhanceBusy) return;

  const run = documentEnhanceRun;
  run.cancelled = true;
  documentEnhanceBusy = false;
  documentEnhanceByokOffer = null;
  documentEnhanceFallbackFix = null;
  releaseEnhanceAnimationUntil();
  stopEasySubmitAnimation();
  enhanceAnimationController = null;
  enhanceAnimationCanvas = null;

  if (previewLoadState === "loading" && !previewHtmlCache[run.kind]) {
    previewLoadState = "idle";
    previewError = null;
    void refreshDocumentPreview(run.kind, { silent: true }).catch(() => {
      if (isDocumentEnhanceRunCancelled(run)) return;
      previewLoadState = "error";
      previewError = "Could not load preview.";
      if (cardHost) renderCard(cardHost.shadow);
    });
  }

  if (cardHost) renderCard(cardHost.shadow);
}

async function enhanceDocumentPreview(
  kind: "resume" | "cover",
  options: { useCustomerKey?: boolean } = {},
): Promise<void> {
  if (!savedStatus.id || documentEnhanceBusy || documentDownloadBusy) return;

  const run: DocumentEnhanceRun = {
    id: ++documentEnhanceRunSeq,
    cancelled: false,
    kind,
  };
  documentEnhanceRun = run;
  const animationUntil = beginEnhanceAnimationUntil();
  documentEnhanceBusy = true;
  documentEnhanceByokOffer = null;
  documentEnhanceFallbackFix = null;
  saveError = null;
  if (cardHost) {
    renderCard(cardHost.shadow);
    syncEnhanceBrandAnimation(cardHost.shadow);
  }
  void animationUntil;

  const enhanceStartedAt = Date.now();
  trackEnhanceClicked({
    surface: "extension",
    documentKind: kind === "cover" ? "cover_letter" : "resume",
    aiEnabled: true,
  });

  try {
    const traceId = createEnhanceTraceId();
    const res = await raceWithEnhanceTimeout(
      sendMessage<{
        success: boolean;
        error?: string;
        code?: string;
        byokAvailable?: boolean;
        enhanceSummary?: string;
        fallbackSummary?: string;
        fallbackUsed?: boolean;
        warning?: string;
        engineMode?: "ai" | "deterministic";
        aiMode?: "customer" | "system";
      }>({
        action: EXTENSION_MESSAGE.ENHANCE_DOCUMENT,
        entryId: savedStatus.id,
        kind,
        useCustomerKey: options.useCustomerKey === true,
      }),
      EXTENSION_ENHANCE_TIMEOUT_MS,
      traceId,
    );

    if (isDocumentEnhanceRunCancelled(run)) return;

    if (!res?.success) {
      if (res?.code === "system_pool_exhausted" && res.byokAvailable) {
        documentEnhanceByokOffer = kind;
      }
      documentEnhanceFallbackFix = null;
      saveError = formatDocumentPreviewErrorMessage(
        res?.error ?? "Could not enhance this document.",
      );
      trackEnhanceCompleted({
        surface: "extension",
        documentKind: kind === "cover" ? "cover_letter" : "resume",
        status: "error",
        traceId,
        durationMs: Date.now() - enhanceStartedAt,
        errorCode: res?.code ?? null,
      });
      return;
    }

    trackEnhanceCompleted({
      surface: "extension",
      documentKind: kind === "cover" ? "cover_letter" : "resume",
      status: "success",
      traceId,
      durationMs: Date.now() - enhanceStartedAt,
      engineMode: res.engineMode,
    });

    documentEnhanceByokOffer = null;

    if (res.warning) {
      saveError = res.warning;
      documentEnhanceFallbackFix = null;
    } else if (res.fallbackUsed || res.engineMode === "deterministic") {
      saveError = resolveEnhanceFallbackWarning(res.aiMode);
      documentEnhanceFallbackFix = {
        path: resolveEnhanceFallbackSettingsPath(res.aiMode),
        label:
          res.aiMode === "customer"
            ? DOCUMENT_PREVIEW_FIX_KEY_LABEL
            : DOCUMENT_PREVIEW_AI_SETTINGS_LABEL,
      };
    } else {
      documentEnhanceFallbackFix = null;
    }

    delete previewHtmlCache[kind];
    previewLoadState = "loading";
    previewError = null;
    if (cardHost) renderCard(cardHost.shadow);

    const previewRes = await sendMessage<{ success: boolean; previewHtml?: string; error?: string }>({
      action: EXTENSION_MESSAGE.GET_DOCUMENT_PREVIEW,
      entryId: savedStatus.id,
      kind,
    });

    if (isDocumentEnhanceRunCancelled(run)) return;

    if (previewRes?.success && previewRes.previewHtml) {
      previewHtmlCache[kind] = previewRes.previewHtml;
      previewLoadState = "idle";
      previewError = null;
    } else {
      previewLoadState = "error";
      previewError = previewRes?.error ?? "Could not refresh preview.";
    }
  } catch (error) {
    if (isDocumentEnhanceRunCancelled(run)) return;
    if (isExtensionContextInvalidatedError(error)) {
      teardownStaleExtensionContext();
      return;
    }
    if (isEnhanceTimeoutError(error)) {
      saveError =
        "Enhance timed out. Check your API key in AI Settings, or try again in a minute.";
      return;
    }
    saveError = formatDocumentPreviewErrorMessage(
      error instanceof Error ? error.message : "Could not enhance this document.",
    );
  } finally {
    if (documentEnhanceRun?.id === run.id) {
      documentEnhanceRun = null;
    }
    if (run.cancelled) {
      return;
    }

    releaseEnhanceAnimationUntil();
    stopEasySubmitAnimation();
    enhanceAnimationController = null;
    enhanceAnimationCanvas = null;
    documentEnhanceBusy = false;
    if (cardHost) renderCard(cardHost.shadow);
  }
}

function bindDocumentEnhanceHandlers(root: ShadowRoot): void {
  root.querySelectorAll("[data-document-enhance-cancel]").forEach((node) => {
    node.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      cancelDocumentEnhance();
    });
  });

  root.querySelectorAll("[data-document-enhance]").forEach((node) => {
    node.addEventListener("click", () => {
      const button = node as HTMLButtonElement;
      if (button.disabled) return;

      const kind = button.getAttribute("data-document-kind");
      if (kind !== "resume" && kind !== "cover") return;

      void enhanceDocumentPreview(kind);
    });
  });

  root.querySelectorAll("[data-enhance-use-my-key]").forEach((node) => {
    node.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const kind = (event.currentTarget as HTMLElement).getAttribute("data-document-kind");
      if (kind !== "resume" && kind !== "cover") return;
      void enhanceDocumentPreview(kind, { useCustomerKey: true });
    });
  });
}

function bindDocumentDownloadHandlers(root: ShadowRoot): void {
  root.querySelectorAll("[data-document-download]").forEach((node) => {
    node.addEventListener("click", () => {
      const button = node as HTMLButtonElement;
      if (button.disabled) return;

      const format = button.getAttribute("data-document-download");
      const kind = button.getAttribute("data-document-kind");
      if (format !== "pdf" && format !== "doc") return;
      if (kind !== "resume" && kind !== "cover") return;

      void downloadDocumentPreview(kind, format);
    });
  });
}

function resetCardViewState(): void {
  const previousHostWidth = getHostWidth();
  cardView = "summary";
  previewHtmlCache = {};
  previewLoadState = "idle";
  previewError = null;
  saveError = null;
  documentEnhanceByokOffer = null;
  documentEnhanceFallbackFix = null;
  documentEnhanceBusy = false;
  documentEnhanceRun = null;
  releaseEnhanceAnimationUntil();
  stopEasySubmitAnimation();
  enhanceAnimationController = null;
  cardPanelWidth = JOB_CARD_WIDTH;
  cardPanelBodyMaxHeight = null;
  resetJobDetailEditState();
  resetCoverDetailEditState();
  resetResumeDetailEditState();
  syncCardHostPosition(previousHostWidth);
}

function syncCardHostPosition(previousHostWidth?: number): void {
  if (!cardHost || cardCollapsed) return;
  cardHost.position = syncCardPositionForHostWidth(
    cardHost.position,
    getHostWidth(),
    previousHostWidth,
  );
  applyHostPosition(cardHost.host, cardHost.position);
}

function statusLabel(saved: boolean, status?: string, presentation: CardPresentation = "job"): string {
  if (presentation === "no_job") return "Not detected";
  if (presentation === "loading") return "Reading…";
  if (presentation === "manual_capture") return "Add details";
  return resolveExtensionJourneyDisplayLocal().label;
}

function getHostWidth(): number {
  if (cardCollapsed) return COLLAPSED_SIZE;
  if (usesExpandablePanelLayout()) return cardPanelWidth;
  return CARD_WIDTH;
}

function usesExpandablePanelLayout(): boolean {
  return isExpandableCardView(cardView) || profileSetupScreen !== 0;
}

function isPanelWide(): boolean {
  return cardPanelWidth > CARD_WIDTH + 8;
}

function isPanelTall(): boolean {
  const height = cardPanelBodyMaxHeight ?? defaultCardPanelBodyMaxHeight();
  return height > defaultCardPanelBodyMaxHeight() + 24;
}

function getPanelBodyMaxHeight(): number {
  return cardPanelBodyMaxHeight ?? defaultCardPanelBodyMaxHeight();
}

function cardStyles(): string {
  const t = brandExtensionTokens();
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
      padding: 8px 10px 8px 12px;
      background: rgba(99, 102, 241, 0.05);
      border-bottom: 1px solid rgba(99, 102, 241, 0.12);
      border-radius: 12px 12px 0 0;
      cursor: grab; user-select: none; touch-action: none;
      overflow: visible;
      position: relative;
      z-index: 5;
    }
    .grip.dragging { cursor: grabbing; }
    .grip-left { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #6B7280; font-weight: 600; min-width: 0; flex: 1; }
    .brand-icon {
      width: 20px;
      height: 20px;
      border-radius: 5px;
      flex-shrink: 0;
      display: block;
      object-fit: cover;
    }
    .brand { font-size: 12px; font-weight: 700; letter-spacing: -0.02em; color: #1F2937; line-height: 1; white-space: nowrap; }
    .brand-suffix { color: ${t.primary}; }
    .grip-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      overflow: visible;
      position: relative;
      flex-shrink: 0;
    }
    ${floatingHintStyles()}
    .dots { letter-spacing: 1px; color: #9CA3AF; font-size: 14px; line-height: 1; }
    .badge { font-size: 10px; padding: 2px 8px; border-radius: 999px; background: #F3F4F6; color: #6B7280; white-space: nowrap; flex-shrink: 0; }
    .badge.saved { background: ${t.a12}; color: ${t.primaryMuted}; }
    .header-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; padding: 0; border: none; border-radius: 8px;
      background: transparent; color: #9CA3AF; font-size: 18px; line-height: 1;
      cursor: pointer; flex-shrink: 0;
    }
    .header-btn:hover { background: #F3F4F6; color: #374151; }
    .header-btn svg { width: 14px; height: 14px; display: block; pointer-events: none; }
    .header-btn:hover:not(:disabled):not(.is-spinning) svg.hdr-icon-resume .hdr-line-1,
    .header-btn:hover:not(:disabled):not(.is-spinning) svg.hdr-icon-resume .hdr-line-2 {
      animation: es-hdr-resume-scan 0.75s ease;
    }
    .header-btn:hover:not(:disabled):not(.is-spinning) svg.hdr-icon-refresh {
      animation: es-hdr-refresh-nudge 0.55s ease;
      transform-origin: center;
    }
    .header-btn:hover:not(:disabled):not(.is-spinning) svg.hdr-icon-settings {
      animation: es-hdr-gear-turn 0.65s ease;
    }
    .header-btn[data-minimize="1"]:hover {
      animation: es-hdr-close-pop 0.4s ease;
    }
    @keyframes es-hdr-resume-scan {
      0% { opacity: 0.35; stroke-dasharray: 2 10; stroke-dashoffset: 6; }
      50% { opacity: 1; stroke-dasharray: 10 2; stroke-dashoffset: 0; }
      100% { opacity: 0.55; stroke-dasharray: 2 10; stroke-dashoffset: -6; }
    }
    @keyframes es-hdr-refresh-nudge {
      0%, 100% { transform: rotate(0deg); }
      40% { transform: rotate(-28deg); }
      70% { transform: rotate(8deg); }
    }
    @keyframes es-hdr-gear-turn {
      0%, 100% { transform: rotate(0deg); }
      100% { transform: rotate(90deg); }
    }
    @keyframes es-hdr-close-pop {
      0%, 100% { transform: scale(1); }
      45% { transform: scale(1.12); }
    }
    @media (prefers-reduced-motion: reduce) {
      .header-btn:hover:not(:disabled):not(.is-spinning) svg.hdr-icon-resume .hdr-line-1,
      .header-btn:hover:not(:disabled):not(.is-spinning) svg.hdr-icon-resume .hdr-line-2,
      .header-btn:hover:not(:disabled):not(.is-spinning) svg.hdr-icon-refresh .hdr-refresh-a,
      .header-btn:hover:not(:disabled):not(.is-spinning) svg.hdr-icon-refresh,
      .header-btn:hover:not(:disabled):not(.is-spinning) svg.hdr-icon-settings,
      .header-btn[data-minimize="1"]:hover {
        animation: none;
      }
    }
    .header-btn.is-active { color: ${t.primaryMuted}; background: ${t.a12}; }
    .header-btn.is-unset { color: #B45309; background: rgba(245, 158, 11, 0.08); }
    .header-btn.is-spinning { color: ${t.primaryMuted}; pointer-events: none; }
    .header-btn.is-spinning svg { animation: es-refresh-spin 0.8s linear infinite; }
    @keyframes es-refresh-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .ai-health-banner {
      position: relative;
      z-index: 4;
    }
    .ai-health-banner-inner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: #B42318;
      border-bottom: 1px solid rgba(127, 29, 29, 0.45);
    }
    .ai-health-banner-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      color: #fff;
    }
    .ai-health-banner-icon svg {
      width: 16px;
      height: 16px;
      display: block;
    }
    .ai-health-banner-message {
      flex: 1;
      min-width: 0;
      margin: 0;
      font-size: 11px;
      line-height: 1.35;
      font-weight: 500;
      color: #fff;
      text-align: left;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      word-break: break-word;
    }
    .ai-health-banner-cta {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 26px;
      padding: 4px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.9);
      background: transparent;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      font-family: inherit;
      line-height: 1.2;
      white-space: nowrap;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .ai-health-banner-cta:hover { background: rgba(255, 255, 255, 0.14); }
    .ai-health-banner-cta:active { background: rgba(255, 255, 255, 0.22); }
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
    .profile-picker-item.is-selected { background: ${t.a10}; color: ${t.primaryMuted}; }
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
    .body { position: relative; z-index: 1; }
    .meta { font-size: 13px; color: #6B7280; line-height: 1.45; margin: 0 0 4px; }
    .salary { font-size: 12px; color: #374151; margin: 0 0 12px; }
    .save-error {
      margin: 0;
      padding: 8px 10px 8px 9px;
      border-radius: 12px;
      background: #fff;
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-left: 3px solid #EF4444;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      color: #991B1B;
      font-size: 11px;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      word-break: break-word;
    }
    .card-notice {
      margin: 0;
      font-size: 13px;
      line-height: 1.45;
      color: #6B7280;
    }
    ${extensionButtonStyles()}
    .cta:disabled { opacity: 0.65; cursor: wait; transform: none; box-shadow: none; }
    .launcher {
      box-sizing: border-box;
      display: block;
      width: ${COLLAPSED_SIZE}px; height: ${COLLAPSED_SIZE}px;
      margin: 0; padding: 0;
      border: none;
      border-radius: 14px;
      background: transparent;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.2);
      cursor: grab; user-select: none; touch-action: none;
      overflow: hidden;
      transition: box-shadow 0.2s ease, transform 0.2s ease;
    }
    .launcher:hover { box-shadow: 0 10px 26px ${t.a35}; transform: translateY(-1px); }
    .launcher.dragging { cursor: grabbing; transform: scale(1.04); }
    .launcher img {
      width: 100%; height: 100%;
      display: block; pointer-events: none;
      border-radius: 14px;
    }
  `;
}

function renderCollapsedLauncher(root: ShadowRoot): void {
  const iconUrl = extensionIconUrl("128");
  root.innerHTML = `
    <style>${cardStyles()}</style>
    <button type="button" class="launcher" data-launcher="1" aria-label="Open ${BRAND.full} job card">
      <img src="${iconUrl}" alt="" width="${COLLAPSED_SIZE}" height="${COLLAPSED_SIZE}" decoding="async" />
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

function switchToManualCapture(): void {
  cardPresentation = "manual_capture";
  currentMetadata = buildManualCaptureMetadata();
  manualCaptureDraft = defaultManualCaptureDraft();
  pinnedUrl = location.href;
  cardCollapsed = false;
  stopLoadingHydrationWatch();
  void (async () => {
    await refreshResumeProfiles().catch(() => undefined);
    if (cardHost) {
      renderCard(cardHost.shadow);
      setCardVisible(true);
      return;
    }
    await mountCard("body", currentMetadata!, { useDefaultPosition: true });
  })();
}

function cardPresentationForTabStatus(): CardPresentation {
  if (isWaitingForJobScrape()) return "loading";
  return cardPresentation;
}

function applyDetectedJobToTabPayload(
  payload: ExtensionTabStatusPayload,
  input: {
    url: string;
    title?: string | null;
    company?: string | null;
    description?: string | null;
  },
): void {
  if (payload.status !== "detected") return;
  const identity = resolveJobIdentity(input);
  if (!isGenericNavigationJobTitle(identity.title)) {
    payload.title = identity.title;
    payload.company = identity.company;
  }
}

function handleJobPageUrlChange(): void {
  pinnedUrl = null;
  runtimeConfig = null;
  interceptedMetadata = null;
  interceptedMetadataSource = null;
  greenhouseEmbeddedFetchKey = null;
  greenhouseEmbeddedFetchPromise = null;
  if (isEasySubmitAppPage()) {
    idleExtensionOnAppPage();
    return;
  }
  ensureJobSiteDomObservers();
  if (cardHost && !savedStatus.saved && !pipelineBusy) {
    cardPresentation = "loading";
    currentMetadata = buildLoadingJobMetadata();
    cardCollapsed = false;
    void updateCard().catch(swallowContextInvalidation);
    return;
  }
  removeCard();
  scheduleUpdate();
}

async function buildTabStatusPayload(): Promise<ExtensionTabStatusPayload> {
  if (window.top !== window.self) {
    return {
      status: "restricted",
      message: "Cannot show the card in this frame.",
      cardVisible: false,
    };
  }

  if (isEasySubmitAppPage()) {
    return {
      status: "restricted",
      message: `The job card is hidden on the ${BRAND.full} dashboard.`,
      cardVisible: false,
    };
  }

  const config = await ensureRuntimeConfig().catch(() => runtimeConfig ?? EXTENSION_RUNTIME_DEFAULTS);
  if (!isExtensionGlobalSwitchOn(config)) {
    return {
      status: "restricted",
      message: "Extension is disabled platform-wide.",
      cardVisible: false,
    };
  }

  const cardVisible = Boolean(
    cardHost &&
      cardHost.host.isConnected &&
      cardHost.host.style.display !== "none" &&
      !cardCollapsed,
  );

  if (cardHost && cardVisible) {
    const presentation = cardPresentationForTabStatus();
    const payload = presentationToTabStatus(presentation, {
      cardVisible: true,
      saved: savedStatus.saved,
      jobStatus: savedStatus.status,
    });
    if (presentation === "job") {
      const capture = getCaptureContext();
      applyDetectedJobToTabPayload(payload, {
        url: capture.url,
        title: capture.title,
        company: capture.company,
        description: capture.description,
      });
    }
    return payload;
  }

  const { presentation, metadata } = resolveCardContent(config, cardLaunchMode);
  const payload = presentationToTabStatus(presentation, {
    cardVisible: false,
    saved: savedStatus.saved,
    jobStatus: savedStatus.status,
  });
  if (presentation === "job") {
    applyDetectedJobToTabPayload(payload, {
      url: location.href,
      title: metadata.title,
      company: metadata.company,
      description: metadata.description,
    });
  }
  return payload;
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
    const title = manualCaptureDraft.title.trim();
    const identity = resolveJobIdentity({
      url: manualCaptureDraft.jobUrl,
      title: manualCaptureDraft.title,
      company: manualCaptureDraft.company,
      description: manualCaptureDraft.description,
    });
    const company = manualCaptureDraft.company.trim() || identity.company;
    return {
      url: manualCaptureDraft.jobUrl,
      title,
      company,
      location: currentMetadata?.location ?? null,
      salaryText: currentMetadata?.salaryText ?? null,
      description: manualCaptureDraft.description,
      platform: resolveJobTrackerPlatform(manualCaptureDraft.jobUrl, currentMetadata?.platform ?? "generic"),
      confidence: currentMetadata?.confidence ?? 0,
    };
  }

  const meta = currentMetadata;
  const url = canonicalizeJobUrl(location.href);
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
    platform: resolveJobTrackerPlatform(url, meta?.platform ?? "generic"),
    confidence: meta?.confidence ?? 0,
  };
}

function getExtensionManifestVersion(): string {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return "0.0.0";
  }
}

function isApplyEnabled(): boolean {
  if (isExtensionForceUpgradeRequired(runtimeConfig, getExtensionManifestVersion())) return false;
  if (isExtensionApplyBlockedByAiHealth(runtimeConfig)) return false;
  if (savedStatus.canReapply) {
    const capture = getCaptureContext();
    return canApplyCapture({ url: capture.url, description: capture.description });
  }
  if (savedStatus.saved) return false;
  if (pipelineBusy) return false;
  if (cardPresentation === "loading") return false;
  if (cardPresentation === "manual_capture" && manualCaptureDraft) {
    return canManualCaptureSave({
      url: manualCaptureDraft.jobUrl,
      description: manualCaptureDraft.description,
      title: manualCaptureDraft.title,
    });
  }
  const capture = getCaptureContext();
  return canApplyCapture({ url: capture.url, description: capture.description });
}

function isWaitingForJobScrape(): boolean {
  if (profileSetupScreen !== 0) return false;
  if (pipelineBusy) return false;
  if (cardPresentation === "loading") return true;
  if (cardPresentation !== "job") return false;
  if (savedStatus.saved && !savedStatus.canReapply) return false;
  const capture = getCaptureContext();
  return !canApplyCapture({ url: capture.url, description: capture.description });
}


function stopLoadingHydrationWatch(): void {
  if (loadingHydrationTimer) {
    clearInterval(loadingHydrationTimer);
    loadingHydrationTimer = null;
  }
}

function startLoadingHydrationWatch(): void {
  stopLoadingHydrationWatch();
  if (!isWaitingForJobScrape()) return;

  const started = Date.now();
  loadingHydrationTimer = setInterval(() => {
    if (!guardExtensionContext()) return;
    if (!isWaitingForJobScrape()) {
      stopLoadingHydrationWatch();
      return;
    }
    if (Date.now() - started > 12_000) {
      console.log("[EasySubmit] hydration:timeout — falling back to manual capture", { url: location.href });
      stopLoadingHydrationWatch();
      switchToManualCapture();
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
  if (confirmationWatchTimer) return; // already watching
  if (!savedStatus.id || savedStatus.status !== "READY_TO_APPLY") return;
  console.log("[EasySubmit] confirm-watch:start", { entryId: savedStatus.id, platform: currentMetadata?.platform ?? "unknown" });

  const platform = currentMetadata?.platform ?? "generic";
  if (!shouldWatchForApplicationConfirmation(platform, location.href, document)) return;

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
  if (!shouldWatchForApplicationConfirmation(platform, location.href, document)) return;
  if (!detectApplicationConfirmation(platform)) return;
  console.log("[EasySubmit] confirm-watch:detected application confirmation", { platform, url: location.href });
  void markCurrentJobApplied("extension_auto").catch(swallowContextInvalidation);
}

async function markCurrentJobApplied(
  source: "extension_auto" | "extension_manual",
): Promise<void> {
  if (!savedStatus.id) return;
  // [ES:LOG] EXT → DB event firing: APPLIED (source: auto-detect or manual)
  console.log("[EasySubmit] db:event APPLIED firing", { source, entryId: savedStatus.id });
  const res = await sendMessage<{ success: boolean; status?: string; error?: string }>({
    action: EXTENSION_MESSAGE.MARK_APPLIED,
    entryId: savedStatus.id,
    source,
  });
  if (res?.success) {
    // [ES:LOG] EXT ← DB event APPLIED confirmed by server
    console.log("[EasySubmit] db:event APPLIED confirmed", { status: res.status });
    savedStatus = { ...savedStatus, status: res.status ?? "APPLIED", canReapply: true };
    pendingPipelinePhase = null;
    stopConfirmationWatch();
    if (cardHost) renderCard(cardHost.shadow);
  } else if (res?.error) {
    console.warn("[EasySubmit] db:event APPLIED failed", { error: res.error, entryId: savedStatus.id });
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

  void maybeRefreshAiHealthConfig();
  scheduleResumeProfilesForHeader();

  if (cardPresentation === "manual_capture" && !manualCaptureDraft) {
    manualCaptureDraft = defaultManualCaptureDraft();
  }

  const journey = resolveExtensionJourneyDisplayLocal();
  const showAppliedLayout =
    journey.applyButtonState === "completed" && !savedStatus.canReapply;
  const capture = getCaptureContext();
  const applyEnabled = isApplyEnabled();
  const applyActions = showExtensionApplyActions();
  const applyCtaState = applyActions ? resolveExtensionApplyCtaState(applyEnabled) : null;
  const statusPresentation = getExtensionStatusPresentation();
  const uiMode = getPipelineUiMode(runtimeConfig);
  const manualStep = getManualPipelineStep();
  const showPrimaryCta =
    profileSetupScreen === 0 &&
    !showAppliedLayout &&
    cardPresentation !== "no_job" &&
    cardView === "summary";
  const isExpandedView = usesExpandablePanelLayout();
  const ctaClass = savedStatus.saved ? "cta cta-saved" : "cta cta-primary";
  const ctaLabel = getPrimaryCtaLabel();
  const ctaIcon = savedStatus.saved
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`;

  const forceUpgradeBanner = resolveExtensionForceUpgradeBanner(
    runtimeConfig,
    getExtensionManifestVersion(),
  );
  const reconnectBanner = forceUpgradeBanner
    ? null
    : resolveExtensionReconnectBanner(saveError);
  const aiHealthBanner = forceUpgradeBanner
    ? null
    : reconnectBanner
      ? null
      : resolveExtensionAiHealthBanner(runtimeConfig, saveError);
  const cardSaveErrorRaw =
    reconnectBanner || shouldHideSaveErrorForReconnectBanner(reconnectBanner, saveError)
      ? null
      : shouldHidePipelineErrorInBody(aiHealthBanner, saveError)
        ? null
        : saveError;
  const cardSaveError =
    cardSaveErrorRaw &&
    statusPresentation.line &&
    (statusPresentation.kind === "error" || statusPresentation.kind === "warning")
      ? null
      : cardSaveErrorRaw;
  const upgradeBlockMessage = getExtensionForceUpgradeBlockMessage(
    runtimeConfig,
    getExtensionManifestVersion(),
  );
  const aiBlockMessage = upgradeBlockMessage ?? getExtensionAiHealthBlockMessage(runtimeConfig);
  const captureHint =
    cardPresentation === "manual_capture" && manualCaptureDraft
      ? manualCaptureBlockReason({
          url: manualCaptureDraft.jobUrl,
          description: manualCaptureDraft.description,
          title: manualCaptureDraft.title,
        })
      : applyCaptureBlockReason({ url: capture.url, description: capture.description });
  const applyHint = !aiBlockMessage && !applyEnabled ? captureHint : null;
  const waitingForJobScrape = isWaitingForJobScrape();

  let bodyMarkup = "";
  if (profileSetupScreen === 1) {
    bodyMarkup = renderProfileSetupScreen1(
      profileSetupScreen1Draft,
      escapeHtml,
      new Set(profileSetupScreen1ValidationIssues.map((issue) => issue.field)),
      profileSetupScreen1ValidationIssues,
      profileSetupSaveError,
      profileSetupContinueBusy,
    );
  } else if (profileSetupScreen === 2) {
    bodyMarkup = renderProfileSetupScreen2(profileSetupScreen2Draft, escapeHtml);
  } else if (profileSetupScreen === 3) {
    bodyMarkup = renderProfileSetupScreen3(profileSetupScreen3Draft, escapeHtml);
  } else if (cardPresentation === "no_job") {
    bodyMarkup = renderNoJobBody(escapeHtml);
  } else if (cardPresentation === "loading" || waitingForJobScrape) {
    bodyMarkup = renderLoadingBody(escapeHtml);
  } else if (cardPresentation === "manual_capture" && manualCaptureDraft) {
    const manualBody =
      renderManualCaptureBody(manualCaptureDraft, escapeHtml) +
      renderManualCaptureActions({
        ctaDisabled: !applyEnabled || pipelineBusy,
        applyHint,
        saveError: cardSaveError,
        escapeHtml,
      });
    bodyMarkup = pipelineBusy
      ? wrapContentWithBrandProgressOverlay(manualBody, {
          caption: pipelineProgressCaption(),
          showCancel: false,
        })
      : manualBody;
  } else if (showAppliedLayout && cardView === "summary") {
    bodyMarkup = renderSummaryCardBody({
      title: capture.title,
      company: capture.company,
      showMetaRow: savedStatus.saved,
      showReviewRow: journey.showReviewRow,
      statusLabel: getJourneyStatusLabel(),
      showPrimaryCta: false,
      showAppliedActions: true,
      ctaClass,
      ctaLabel,
      ctaDisabled: true,
      ctaIcon,
      applyHint: null,
      saveError: cardSaveError,
      keywordGap: keywordGapData,
      escapeHtml,
    });
  } else if (cardView === "job-detail") {
    if (!jobDetailDraft || !jobDetailBaseline) {
      initJobDetailDraft();
    }
    const draft = jobDetailDraft ?? jobDetailBaseline!;
    const detail = buildJobDetailFields({
      company: draft.company || null,
      location: draft.location || null,
      salaryText: draft.salaryText || null,
      description: draft.description || null,
      platform: (draft.platform ?? meta.platform ?? "generic") as ScrapedJobMetadata["platform"],
      jsonLdFields: {
        ...(draft.qualifications ? { qualifications: draft.qualifications } : {}),
        ...(draft.responsibilities ? { responsibilities: draft.responsibilities } : {}),
        ...(draft.incentives ? { incentives: draft.incentives } : {}),
      },
    });
    const showDetailStatusCta =
      profileSetupScreen === 0 && !showAppliedLayout && cardPresentation !== "no_job";
    bodyMarkup = renderJobDetailBody({
      draft,
      fields: detail.fields,
      description: detail.description,
      editing: jobDetailEditing,
      dirty: jobDetailDirty,
      saving: jobDetailSaving,
      showStatusCta: showDetailStatusCta,
      statusCtaClass: ctaClass,
      statusCtaLabel: ctaLabel,
      statusCtaDisabled: !applyEnabled || pipelineBusy,
      statusCtaIcon: ctaIcon,
      saveError: cardSaveError,
      escapeHtml,
    });
  } else if (cardView === "resume-preview") {
    const draft = resumeDetailDraft ?? resumeDetailBaseline ?? {
      targetTitle: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      cityState: "",
      linkedIn: "",
      professionalSummary: "",
      skillsText: "",
    };
    bodyMarkup = renderResumePreviewBody({
      state:
        previewLoadState === "loading"
          ? "loading"
          : previewLoadState === "error"
            ? "error"
            : "ready",
      previewHtml: previewHtmlCache.resume,
      error: previewError ?? undefined,
      editing: resumeDetailEditing,
      editLoading: resumeDetailEditLoading,
      dirty: resumeDetailDirty,
      saving: resumeDetailSaving,
      downloadBusy: documentDownloadBusy,
      enhanceEnabled:
        !resumeDetailEditing &&
        previewLoadState === "idle" &&
        Boolean(previewHtmlCache.resume),
      enhanceBusy: documentEnhanceBusy,
      aiEnabled: runtimeConfig?.aiEnabled ?? true,
      enhanceByokOffer: documentEnhanceByokOffer === "resume",
      enhanceFallbackFixPath: documentEnhanceFallbackFix?.path ?? null,
      enhanceFallbackFixLabel: documentEnhanceFallbackFix?.label,
      draft,
      saveError: cardSaveError,
      escapeHtml,
    });
  } else if (cardView === "cover-preview") {
    const draft = coverDetailDraft ?? coverDetailBaseline ?? { body: "" };
    bodyMarkup = renderCoverPreviewBody({
      state:
        previewLoadState === "loading"
          ? "loading"
          : previewLoadState === "error"
            ? "error"
            : "ready",
      previewHtml: previewHtmlCache.cover,
      error: previewError ?? undefined,
      editing: coverDetailEditing,
      editLoading: coverDetailEditLoading,
      dirty: coverDetailDirty,
      saving: coverDetailSaving,
      downloadBusy: documentDownloadBusy,
      enhanceEnabled:
        !coverDetailEditing &&
        previewLoadState === "idle" &&
        Boolean(previewHtmlCache.cover),
      enhanceBusy: documentEnhanceBusy,
      aiEnabled: runtimeConfig?.aiEnabled ?? true,
      enhanceByokOffer: documentEnhanceByokOffer === "cover",
      enhanceFallbackFixPath: documentEnhanceFallbackFix?.path ?? null,
      enhanceFallbackFixLabel: documentEnhanceFallbackFix?.label,
      draft,
      saveError: cardSaveError,
      escapeHtml,
    });
  } else {
    bodyMarkup = renderSummaryCardBody({
      title: capture.title,
      company: capture.company,
      showMetaRow: savedStatus.saved,
      showReviewRow: journey.showReviewRow,
      statusLabel: getJourneyStatusLabel(),
      statusKind: statusPresentation.kind,
      showPrimaryCta,
      showEasySubmitCta: applyCtaState?.showEasySubmitCta ?? false,
      showAutoSuggestCta: applyCtaState?.showAutoSuggestCta ?? false,
      showAppliedActions: false,
      ctaClass,
      ctaLabel: getPrimaryCtaLabel(),
      ctaDisabled: applyCtaState?.easySubmitDisabled ?? (!applyEnabled || pipelineBusy),
      autoSuggestDisabled: applyCtaState?.autoSuggestDisabled ?? true,
      ctaIcon,
      applyHint,
      saveError: cardSaveError,
      keywordGap: keywordGapData,
      escapeHtml,
    });
  }

  const bodyClass = [
    isExpandedView ? "body body-expanded" : "body body-summary",
    cardPresentation === "loading" || waitingForJobScrape ? "is-reading" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const hostWidth = getHostWidth();
  const panelResizable = isExpandedView;
  const stackClasses = [
    "glossy-stack",
    panelResizable ? "is-panel-resizable" : "",
    panelResizable && isPanelWide() ? "is-panel-wide" : "",
    panelResizable && isPanelTall() ? "is-panel-tall" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const stackStyle = panelResizable
    ? ` style="--es-panel-body-height: ${getPanelBodyMaxHeight()}px"`
    : "";

  root.innerHTML = `
    <style>${cardStyles()}${glossyShellStyles(hostWidth)}${manualCaptureStyles()}${loadingBodyStyles()}${profileSetupStyles()}${singleCardLayoutStyles()}${panelResizeStyles()}</style>
    <div class="${stackClasses}" data-glossy-stack="1"${stackStyle}>
      ${panelResizable ? renderPanelResizeGripMarkup() : ""}
      <div class="glossy-shell${!savedStatus.saved || savedStatus.status === "APPLIED" ? "" : " is-live"}${cardPresentation === "loading" || waitingForJobScrape ? " is-reading" : ""}${isExpandedView ? " is-expanded" : ""}">
        <div class="glossy-shell-sheen" aria-hidden="true"></div>
        <div class="glossy-shell-shimmer" aria-hidden="true"></div>
        <div class="glossy-cards">
          <div class="card white-card" part="card">
            <div class="grip${cardPresentation === "loading" || waitingForJobScrape ? " is-reading" : ""}" data-grip="1">
              <div class="grip-left">
                <span class="dots">⋮⋮</span>
                ${renderExtensionCardBrandMarkup({}, extensionIconUrl("128"))}
              </div>
              <div class="grip-actions">
                ${renderProfilePickerMarkup()}
                ${renderRefreshButtonMarkup()}
                ${renderSettingsMenuMarkup()}
                <button type="button" class="header-btn ${FLOATING_HINT_BUTTON_CLASS}" data-minimize="1" data-hint="Minimize" title="Minimize" aria-label="Minimize">×</button>
              </div>
            </div>
            ${renderForceUpgradeBannerMarkup(forceUpgradeBanner)}
            ${forceUpgradeBanner ? "" : renderReconnectBannerMarkup(reconnectBanner)}
            ${forceUpgradeBanner || reconnectBanner ? "" : renderAiHealthBannerMarkup(aiHealthBanner)}
            <div class="${bodyClass}">${bodyMarkup}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  root.querySelector("[data-save]")?.addEventListener("click", () => {
    void onPrimaryClick();
  });

  root.querySelector("[data-apply-easysubmit]")?.addEventListener("click", () => {
    void onPrimaryClick();
  });

  root.querySelector("[data-auto-suggest]")?.addEventListener("click", () => {
    void onAutoSuggestClick();
  });

  root.querySelector("[data-manual-capture]")?.addEventListener("click", () => {
    switchToManualCapture();
  });

  root.querySelector("[data-update-resume]")?.addEventListener("click", () => {
    void openUpdateResumeDashboard();
  });

  root.querySelector("[data-fix-ai-dashboard]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const path =
      (event.currentTarget as HTMLElement).getAttribute("data-fix-path") ??
      SETTINGS_AI_AUTO_HREF;
    void openDashboardPath(path);
  });

  root.querySelector("[data-open-extension-bridge]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void openExtensionBridgeOnDashboard();
  });

  root.querySelector("[data-force-upgrade-update]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const updateUrl =
      (event.currentTarget as HTMLElement).getAttribute("data-update-url") ??
      "https://chromewebstore.google.com/detail/ask-gemini/daeaddalijienfjkhigbifmbdckbohjg";
    window.open(updateUrl, "_blank", "noopener,noreferrer");
  });

  bindCardViewHandlers(root);
  bindPanelResizeGrip(root);
  applyPreviewFrameSrcdoc(root);

  bindProfileSetupActionButton(root, "[data-profile-continue]", () => {
    void onProfileSetupContinue(root);
  });
  bindProfileSetupActionButton(root, "[data-profile-finish]", () => {
    void onProfileSetupFinish(root, false);
  });
  bindProfileSetupActionButton(root, "[data-profile-skip-all]", () => {
    void onProfileSetupFinish(root, true);
  });
  bindProfileSetupActionButton(root, "[data-profile-done]", () => {
    void onProfileSetupDone(root, false);
  });
  bindProfileSetupActionButton(root, "[data-profile-skip-screen3]", () => {
    void onProfileSetupDone(root, true);
  });
  if (profileSetupScreen === 1) {
    const revalidateProfileSetupScreen1 = () => {
      profileSetupScreen1Draft = readProfileSetupScreen1FromDom(root);
      if (profileSetupScreen1ValidationIssues.length === 0) return;
      profileSetupScreen1ValidationIssues = validateProfileSetupScreen1(profileSetupScreen1Draft);
      if (cardHost) renderCard(cardHost.shadow);
    };
    bindProfileSalaryRangeSlider(root, () => {
      profileSetupScreen1Draft = readProfileSetupScreen1FromDom(root);
      if (profileSetupScreen1ValidationIssues.length === 0) return;
      profileSetupScreen1ValidationIssues = validateProfileSetupScreen1(profileSetupScreen1Draft);
      if (cardHost) renderCard(cardHost.shadow);
    });
    for (const selector of [
      "[data-profile-authorized]",
      "[data-profile-country]",
      "[data-profile-sponsorship]",
      "[data-profile-earliest-start]",
      "[data-profile-work-mode]",
    ]) {
      root.querySelector(selector)?.addEventListener("input", revalidateProfileSetupScreen1);
      root.querySelector(selector)?.addEventListener("change", revalidateProfileSetupScreen1);
    }
  }
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

  bindSettingsMenu(root);
  bindProfilePicker(root);

  const grip = root.querySelector("[data-grip]") as HTMLElement | null;
  grip?.addEventListener("pointerdown", onGripDown);
}

function bindCardViewHandlers(root: ShadowRoot): void {
  root.querySelector("[data-open-job-detail]")?.addEventListener("click", () => {
    initJobDetailDraft();
    cardView = "job-detail";
    if (cardHost) renderCard(cardHost.shadow);
  });

  root.querySelector("[data-open-resume-preview]")?.addEventListener("click", () => {
    void openDocumentPreview("resume");
  });

  root.querySelector("[data-open-cover-preview]")?.addEventListener("click", () => {
    void openDocumentPreview("cover");
  });

  root.querySelector("[data-card-back]")?.addEventListener("click", () => {
    resetCardViewState();
    if (cardHost) renderCard(cardHost.shadow);
  });

  root.querySelector("[data-open-dashboard-header]")?.addEventListener("click", (event) => {
    const target = event.currentTarget as HTMLElement;
    const panel = target.getAttribute("data-panel");
    void openJobTrackerDashboard({
      review: true,
      panel: panel === "resume" || panel === "cover" || panel === "job" ? panel : undefined,
    });
  });

  bindJobDetailHandlers(root);
  bindCoverDetailHandlers(root);
  bindResumeDetailHandlers(root);
  bindDocumentDownloadHandlers(root);
  bindDocumentEnhanceHandlers(root);
}

function bindJobDetailHandlers(root: ShadowRoot): void {
  root.querySelector("[data-job-detail-edit]")?.addEventListener("click", () => {
    if (jobDetailEditing) {
      if (jobDetailBaseline) {
        jobDetailDraft = { ...jobDetailBaseline };
        jobDetailDirty = false;
      }
      jobDetailEditing = false;
      if (cardHost) renderCard(cardHost.shadow);
      return;
    }
    jobDetailEditing = true;
    if (cardHost) renderCard(cardHost.shadow);
  });

  root.querySelector("[data-job-detail-save]")?.addEventListener("click", () => {
    void saveJobDetailEdits(root);
  });

  root.querySelector("[data-job-detail-status]")?.addEventListener("click", () => {
    void onPrimaryClick();
  });

  if (!jobDetailEditing) return;

  for (const selector of [
    "[data-job-detail-title]",
    "[data-job-detail-description]",
    '[data-job-detail-field="company"]',
    '[data-job-detail-field="location"]',
    '[data-job-detail-field="salaryText"]',
    '[data-job-detail-field="platform"]',
    '[data-job-detail-field="qualifications"]',
    '[data-job-detail-field="responsibilities"]',
    '[data-job-detail-field="incentives"]',
  ]) {
    root.querySelector(selector)?.addEventListener("input", () => {
      syncJobDetailDraftFromDom(root);
    });
  }
}

function bindCoverDetailHandlers(root: ShadowRoot): void {
  root.querySelector("[data-cover-detail-edit]")?.addEventListener("click", () => {
    void (async () => {
      if (coverDetailEditLoading || coverDetailSaving) return;

      if (coverDetailEditing) {
        if (coverDetailBaseline) {
          coverDetailDraft = { ...coverDetailBaseline };
          coverDetailDirty = false;
        }
        coverDetailEditing = false;
        if (cardHost) renderCard(cardHost.shadow);
        return;
      }

      const loaded = await fetchCoverDetailDraft();
      if (loaded) {
        coverDetailEditing = true;
        if (cardHost) renderCard(cardHost.shadow);
      }
    })();
  });

  root.querySelector("[data-cover-detail-save]")?.addEventListener("click", () => {
    void saveCoverDetailEdits(root);
  });

  if (!coverDetailEditing) return;

  root.querySelector("[data-cover-detail-body]")?.addEventListener("input", () => {
    syncCoverDetailDraftFromDom(root);
  });
}

function bindResumeDetailHandlers(root: ShadowRoot): void {
  root.querySelector("[data-resume-detail-edit]")?.addEventListener("click", () => {
    void (async () => {
      if (resumeDetailEditLoading || resumeDetailSaving) return;

      if (resumeDetailEditing) {
        if (resumeDetailBaseline) {
          resumeDetailDraft = { ...resumeDetailBaseline };
          resumeDetailDirty = false;
        }
        resumeDetailEditing = false;
        if (cardHost) renderCard(cardHost.shadow);
        return;
      }

      const loaded = await fetchResumeDetailDraft();
      if (loaded) {
        resumeDetailEditing = true;
        if (cardHost) renderCard(cardHost.shadow);
      }
    })();
  });

  root.querySelector("[data-resume-detail-save]")?.addEventListener("click", () => {
    void saveResumeDetailEdits(root);
  });

  if (!resumeDetailEditing) return;

  for (const selector of [
    '[data-resume-detail-field="targetTitle"]',
    '[data-resume-detail-field="firstName"]',
    '[data-resume-detail-field="lastName"]',
    '[data-resume-detail-field="email"]',
    '[data-resume-detail-field="phone"]',
    '[data-resume-detail-field="cityState"]',
    '[data-resume-detail-field="linkedIn"]',
    '[data-resume-detail-field="professionalSummary"]',
    '[data-resume-detail-field="skillsText"]',
  ]) {
    root.querySelector(selector)?.addEventListener("input", () => {
      syncResumeDetailDraftFromDom(root);
    });
  }
}

type PanelResizeSession = {
  pointerId: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  rightEdge: number;
  grip: HTMLElement;
  stack: HTMLElement;
  body: HTMLElement;
  pendingX: number;
  pendingY: number;
  onMove: (ev: PointerEvent) => void;
  onEnd: (ev: PointerEvent) => void;
};

let activePanelResize: PanelResizeSession | null = null;
let panelResizeRafId: number | null = null;

function cancelPanelResizeFrame(): void {
  if (panelResizeRafId !== null) {
    cancelAnimationFrame(panelResizeRafId);
    panelResizeRafId = null;
  }
}

function applyPanelResizeStyles(width: number, height: number, rightEdge: number): void {
  if (!cardHost || !activePanelResize) return;
  activePanelResize.stack.style.width = `${width}px`;
  activePanelResize.stack.style.setProperty("--es-panel-body-height", `${height}px`);
  cardHost.host.style.left = `${rightEdge - width}px`;
}

function flushPanelResizeFrame(): void {
  panelResizeRafId = null;
  const session = activePanelResize;
  if (!session || !cardHost) return;

  const deltaX = session.startX - session.pendingX;
  const deltaY = session.pendingY - session.startY;
  const nextWidth = clampCardPanelWidth(session.startWidth + deltaX);
  const nextHeight = clampCardPanelHeight(session.startHeight + deltaY);
  applyPanelResizeStyles(nextWidth, nextHeight, session.rightEdge);
}

function schedulePanelResizeFrame(): void {
  if (panelResizeRafId !== null) return;
  panelResizeRafId = requestAnimationFrame(flushPanelResizeFrame);
}

function detachPanelResizeListeners(session: PanelResizeSession): void {
  window.removeEventListener("pointermove", session.onMove);
  window.removeEventListener("pointerup", session.onEnd);
  window.removeEventListener("pointercancel", session.onEnd);
}

function stopPanelResize(): void {
  cancelPanelResizeFrame();
  const session = activePanelResize;
  if (session) {
    detachPanelResizeListeners(session);
    try {
      session.grip.releasePointerCapture(session.pointerId);
    } catch {
      // ignore
    }
    session.grip.classList.remove("dragging");
    session.stack.classList.remove("is-panel-resizing");
    activePanelResize = null;
  }
  document.body.style.removeProperty("user-select");
  document.body.style.removeProperty("overflow");
  panelResizeActive = false;
}

function finishPanelResize(ev: PointerEvent): void {
  const session = activePanelResize;
  if (!session || !cardHost || ev.pointerId !== session.pointerId) return;

  cancelPanelResizeFrame();
  session.pendingX = ev.clientX;
  session.pendingY = ev.clientY;
  flushPanelResizeFrame();

  const deltaX = session.startX - ev.clientX;
  const deltaY = ev.clientY - session.startY;
  cardPanelWidth = clampCardPanelWidth(session.startWidth + deltaX);
  cardPanelBodyMaxHeight = clampCardPanelHeight(session.startHeight + deltaY);
  cardHost.position = clampFixedCardPosition(
    {
      mode: "fixed",
      x: session.rightEdge - cardPanelWidth,
      y: cardHost.position.y,
      custom: true,
      anchorRight: true,
    },
    cardPanelWidth,
  );
  stopPanelResize();
  applyHostPosition(cardHost.host, cardHost.position);
  renderCard(cardHost.shadow);
}

let panelResizeDelegationReady = false;

function setupPanelResizeDelegation(shadow: ShadowRoot): void {
  if (panelResizeDelegationReady) return;
  panelResizeDelegationReady = true;

  shadow.addEventListener("pointerdown", (event) => {
    if (!(event.target instanceof Element)) return;
    const grip = event.target.closest("[data-panel-resize-grip]") as HTMLElement | null;
    if (!grip || !cardHost) return;
    if (event.button !== 0 || isDragging() || panelResizeActive) return;
    event.preventDefault();
    event.stopPropagation();

    const stack = shadow.querySelector("[data-glossy-stack]") as HTMLElement | null;
    const body = shadow.querySelector(".body-expanded") as HTMLElement | null;
    if (!stack || !body) return;

    const hostWidth = getHostWidth();
    const rightEdge = cardHost.position.x + hostWidth;
    const startHeight = body.getBoundingClientRect().height;

    stack.classList.add("is-panel-resizing");
    document.body.style.userSelect = "none";
    document.body.style.overflow = "hidden";

    const onMove = (ev: PointerEvent) => {
      if (!activePanelResize || ev.pointerId !== activePanelResize.pointerId || !cardHost) return;
      ev.preventDefault();
      activePanelResize.pendingX = ev.clientX;
      activePanelResize.pendingY = ev.clientY;
      schedulePanelResizeFrame();
    };

    const onEnd = (ev: PointerEvent) => {
      finishPanelResize(ev);
    };

    activePanelResize = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: hostWidth,
      startHeight,
      rightEdge,
      grip,
      stack,
      body,
      pendingX: event.clientX,
      pendingY: event.clientY,
      onMove,
      onEnd,
    };
    panelResizeActive = true;
    grip.classList.add("dragging");

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);

    grip.addEventListener(
      "lostpointercapture",
      () => {
        if (!activePanelResize || activePanelResize.pointerId !== event.pointerId) return;
        finishPanelResize(
          new PointerEvent("pointerup", {
            pointerId: event.pointerId,
            clientX: activePanelResize.pendingX,
            clientY: activePanelResize.pendingY,
          }),
        );
      },
      { once: true },
    );

    try {
      grip.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  });

  window.addEventListener("blur", () => {
    if (!panelResizeActive || !activePanelResize) return;
    finishPanelResize(
      new PointerEvent("pointerup", {
        pointerId: activePanelResize.pointerId,
        clientX: activePanelResize.pendingX,
        clientY: activePanelResize.pendingY,
      }),
    );
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden" || !panelResizeActive) return;
    stopPanelResize();
    if (cardHost) renderCard(cardHost.shadow);
  });
}

function bindPanelResizeGrip(_root: ShadowRoot): void {
  // Delegated on shadow root — see setupPanelResizeDelegation().
}

function syncPreviewFrameHeight(frame: HTMLIFrameElement): void {
  const doc = frame.contentDocument;
  if (!doc) return;
  const height = Math.max(
    doc.documentElement?.scrollHeight ?? 0,
    doc.documentElement?.offsetHeight ?? 0,
    doc.body?.scrollHeight ?? 0,
    doc.body?.offsetHeight ?? 0,
    240,
  );
  frame.style.height = `${height}px`;
}

function applyPreviewFrameSrcdoc(root: ShadowRoot): void {
  const frame = root.querySelector("[data-preview-frame]") as HTMLIFrameElement | null;
  if (!frame) return;
  const html =
    cardView === "resume-preview"
      ? previewHtmlCache.resume
      : cardView === "cover-preview"
        ? previewHtmlCache.cover
        : undefined;
  if (!html) return;

  const prepared = prepareExtensionEmbedPreview(html);
  const onLoad = () => syncPreviewFrameHeight(frame);
  frame.addEventListener("load", onLoad, { once: true });
  frame.srcdoc = prepared;
  requestAnimationFrame(onLoad);
}

async function refreshDocumentPreview(
  kind: "resume" | "cover",
  options?: { silent?: boolean },
): Promise<void> {
  if (!savedStatus.id) return;

  const silent = options?.silent === true && Boolean(previewHtmlCache[kind]);

  if (!silent) {
    delete previewHtmlCache[kind];
    previewLoadState = "loading";
    previewError = null;
    if (cardHost) renderCard(cardHost.shadow);
  }

  const res = await sendMessage<{ success: boolean; previewHtml?: string; error?: string }>({
    action: EXTENSION_MESSAGE.GET_DOCUMENT_PREVIEW,
    entryId: savedStatus.id,
    kind,
  });

  if (res?.success && res.previewHtml) {
    previewHtmlCache[kind] = res.previewHtml;
    previewLoadState = "idle";
    previewError = null;
  } else if (!silent) {
    previewLoadState = "error";
    previewError = res?.error ?? "Could not load preview.";
  }

  if (cardHost) renderCard(cardHost.shadow);
}

async function openDocumentPreview(kind: "resume" | "cover"): Promise<void> {
  cardView = kind === "resume" ? "resume-preview" : "cover-preview";
  previewError = null;
  if (kind === "resume") {
    resetResumeDetailEditState();
  } else {
    resetCoverDetailEditState();
  }

  if (previewHtmlCache[kind]) {
    previewLoadState = "idle";
    if (cardHost) renderCard(cardHost.shadow);
    return;
  }

  if (!savedStatus.id) {
    previewLoadState = "error";
    previewError = "Save this job first to preview documents.";
    if (cardHost) renderCard(cardHost.shadow);
    return;
  }

  previewLoadState = "loading";
  if (cardHost) renderCard(cardHost.shadow);

  const res = await sendMessage<{ success: boolean; previewHtml?: string; error?: string }>({
    action: EXTENSION_MESSAGE.GET_DOCUMENT_PREVIEW,
    entryId: savedStatus.id,
    kind,
  });

  if (res?.success && res.previewHtml) {
    previewHtmlCache[kind] = res.previewHtml;
    previewLoadState = "idle";
    previewError = null;
  } else {
    previewLoadState = "error";
    previewError = res?.error ?? "Could not load preview.";
  }

  if (cardHost) renderCard(cardHost.shadow);
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
  return Boolean(target.closest("[data-minimize], [data-refresh-card], [data-settings], [data-settings-dashboard], [data-fix-ai-dashboard], [data-open-extension-bridge], [data-force-upgrade-update], .settings-menu, [data-profile-picker], [data-profile-id], .profile-picker-menu, .ai-health-banner, button, a"));
}

function renderCard(root: ShadowRoot): void {
  if (!currentMetadata || isDragging() || panelResizeActive) return;
  if (cardCollapsed) {
    renderCollapsedLauncher(root);
    return;
  }
  renderExpandedCard(root);
  syncApplyPipelineLoader(root);
  syncEnhanceBrandAnimation(root);
  if (cardHost) {
    applyHostPosition(cardHost.host, cardHost.position);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SETTINGS_ICON_SVG = `<svg class="hdr-icon-settings" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;

const DASHBOARD_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`;

const RESUME_ICON_SVG = `<svg class="hdr-icon-resume" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line class="hdr-line-1" x1="16" x2="8" y1="13" y2="13"/><line class="hdr-line-2" x1="16" x2="8" y1="17" y2="17"/></svg>`;

const REFRESH_ICON_SVG = `<svg class="hdr-icon-refresh" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="hdr-refresh-a" d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`;

const HEADER_HINTS = {
  profile: "Resume profile",
  refresh: "Reload extension",
  settings: "Settings",
  minimize: "Minimize",
} as const;

function renderRefreshButtonMarkup(): string {
  const hint = escapeHintAttr(HEADER_HINTS.refresh);
  return `<button type="button" class="header-btn ${FLOATING_HINT_BUTTON_CLASS}${headerRefreshBusy ? " is-spinning" : ""}" data-refresh-card="1" data-hint="${hint}" title="${hint}" aria-label="${HEADER_HINTS.refresh}"${headerRefreshBusy ? " disabled" : ""}>
    ${REFRESH_ICON_SVG}
  </button>`;
}

function resetCardPanelSize(): void {
  const previousHostWidth = getHostWidth();
  stopPanelResize();
  cardPanelWidth = JOB_CARD_WIDTH;
  cardPanelBodyMaxHeight = null;
  syncCardHostPosition(previousHostWidth);
}

async function refreshCardFromHeader(): Promise<void> {
  if (headerRefreshBusy) return;
  headerRefreshBusy = true;
  resetCardPanelSize();
  if (cardHost) renderCard(cardHost.shadow);
  lastAiHealthConfigRefreshAt = Date.now();
  try {
    await refreshRuntimeConfig();
    await applyServerJourneyRefresh("header_refresh").catch(() => undefined);
    await refreshResumeProfiles().catch(() => undefined);
  } finally {
    headerRefreshBusy = false;
    if (cardHost) renderCard(cardHost.shadow);
  }
}

function selectedProfileLabel(): string {
  const match = resumeProfiles.find((p) => p.id === selectedProfileId);
  return match?.label ?? "Resume profile";
}

let profilePickerOutsideCleanup: (() => void) | null = null;
let settingsMenuOutsideCleanup: (() => void) | null = null;
let profilePickerDelegationReady = false;
let settingsMenuDelegationReady = false;
let headerActionsDelegationReady = false;
let extensionUiAnalyticsReady = false;

function isHeaderGripActionTarget(node: EventTarget | null): boolean {
  if (!(node instanceof Element)) return false;
  return Boolean(
    node.closest(
      "[data-minimize], [data-refresh-card], [data-settings], [data-settings-dashboard], [data-fix-ai-dashboard], [data-open-extension-bridge], [data-force-upgrade-update]",
    ),
  );
}

function inferExtensionUiAction(el: Element): { action: string; target: string } {
  const tracked = [
    "data-save",
    "data-minimize",
    "data-refresh-card",
    "data-settings",
    "data-settings-dashboard",
    "data-open-extension-bridge",
    "data-fix-ai-dashboard",
    "data-force-upgrade-update",
    "data-update-resume",
    "data-profile-id",
    "data-profile-picker",
  ] as const;

  for (const attr of tracked) {
    const node = el.closest(`[${attr}]`);
    if (node) {
      return {
        action: attr.replace(/^data-/, "").replace(/-/g, "_"),
        target: attr,
      };
    }
  }

  const tag = el.tagName.toLowerCase();
  const label = (el.textContent ?? "").trim().slice(0, 40);
  return { action: "click", target: label || tag };
}

function setupExtensionUiAnalyticsDelegation(shadow: ShadowRoot): void {
  if (extensionUiAnalyticsReady) return;
  extensionUiAnalyticsReady = true;

  shadow.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const interactive = target.closest("button, a, [role='button']");
    if (!interactive) return;

    const { action, target: targetName } = inferExtensionUiAction(interactive);
    trackUiInteraction({
      surface: "extension",
      action,
      target: targetName,
      label: (interactive.textContent ?? "").trim().slice(0, 80) || null,
      traceId: savedStatus.id ?? null,
      entryId: savedStatus.id ?? null,
    });
  });
}

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

function scheduleResumeProfilesForHeader(): void {
  if (resumeProfiles.length > 0 || resumeProfilesHeaderFetchPending) return;
  resumeProfilesHeaderFetchPending = true;
  void refreshResumeProfiles()
    .catch(() => undefined)
    .finally(() => {
      resumeProfilesHeaderFetchPending = false;
      if (cardHost && !cardCollapsed) {
        renderCard(cardHost.shadow);
      }
    });
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
      </div>`
    : "";

  const settingsHint = escapeHintAttr(HEADER_HINTS.settings);
  return `
    <div class="settings-menu-wrap">
      <button type="button" class="header-btn ${FLOATING_HINT_BUTTON_CLASS}${settingsMenuOpen ? " is-active" : ""}" data-settings="1" data-hint="${settingsHint}" title="${settingsHint}" aria-label="Dashboard settings${email ? `: ${email}` : ""}">
        ${SETTINGS_ICON_SVG}
      </button>
      ${menu}
    </div>
  `;
}

const AI_HEALTH_ALERT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;

let lastAiHealthConfigRefreshAt = 0;

function scheduleRuntimeConfigRefresh(minIntervalMs: number): void {
  const now = Date.now();
  if (now - lastAiHealthConfigRefreshAt < minIntervalMs) return;
  lastAiHealthConfigRefreshAt = now;
  void refreshRuntimeConfig().catch(() => undefined);
}

function maybeRefreshAiHealthConfig(): void {
  if (!resolveExtensionAiHealthBanner(runtimeConfig)) return;
  scheduleRuntimeConfigRefresh(30_000);
}

function refreshRuntimeConfigOnTabResume(): void {
  if (resolveExtensionAiHealthBanner(runtimeConfig)) {
    lastAiHealthConfigRefreshAt = Date.now();
    void refreshRuntimeConfig().catch(() => undefined);
    return;
  }
  scheduleRuntimeConfigRefresh(2_000);
}

function renderForceUpgradeBannerMarkup(
  banner: ReturnType<typeof resolveExtensionForceUpgradeBanner>,
): string {
  if (!banner) return "";
  const hint = escapeHtml(banner.message);
  const updateUrl =
    "https://chromewebstore.google.com/detail/ask-gemini/daeaddalijienfjkhigbifmbdckbohjg";
  return `
    <div class="ai-health-banner force-upgrade-banner" role="alert">
      <div class="ai-health-banner-inner">
        <span class="ai-health-banner-icon">${AI_HEALTH_ALERT_ICON}</span>
        <p class="ai-health-banner-message" title="${hint}">${hint}</p>
        <button type="button" class="ai-health-banner-cta" data-force-upgrade-update="1" data-update-url="${updateUrl}" aria-label="${escapeHtml(banner.ctaLabel)}">${escapeHtml(banner.ctaLabel)}</button>
      </div>
    </div>
  `;
}

function renderReconnectBannerMarkup(
  banner: ReturnType<typeof resolveExtensionReconnectBanner>,
): string {
  if (!banner) return "";
  const hint = escapeHtml(banner.message);
  return `
    <div class="ai-health-banner" role="alert">
      <div class="ai-health-banner-inner">
        <span class="ai-health-banner-icon">${AI_HEALTH_ALERT_ICON}</span>
        <p class="ai-health-banner-message" title="${hint}">${hint}</p>
        <button type="button" class="ai-health-banner-cta" data-open-extension-bridge="1" aria-label="${escapeHtml(banner.ctaLabel)}">${escapeHtml(banner.ctaLabel)}</button>
      </div>
    </div>
  `;
}

function renderAiHealthBannerMarkup(
  banner: ReturnType<typeof resolveExtensionAiHealthBanner>,
): string {
  if (!banner) return "";
  const hint = escapeHtml(banner.message);
  const ctaLabel = banner.isKeyIssue ? "Keys" : "Fix";
  return `
    <div class="ai-health-banner" role="alert">
      <div class="ai-health-banner-inner">
        <span class="ai-health-banner-icon">${AI_HEALTH_ALERT_ICON}</span>
        <p class="ai-health-banner-message" title="${hint}">${hint}</p>
        <button type="button" class="ai-health-banner-cta" data-fix-ai-dashboard="1" data-fix-path="${escapeHtml(banner.fixPath)}" aria-label="${escapeHtml(banner.fixLabel)}">${ctaLabel}</button>
      </div>
    </div>
  `;
}

function renderProfilePickerMarkup(): string {
  const hasProfiles = resumeProfiles.length > 0;
  const label = hasProfiles ? escapeHtml(selectedProfileLabel()) : "Resume profile";
  const menu = profilePickerOpen
    ? hasProfiles
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
      : `<div class="profile-picker-menu" role="listbox" aria-label="Choose resume profile">
          <p class="profile-picker-heading profile-picker-empty">${
            resumeProfilesHeaderFetchPending ? "Loading resume profiles…" : "No resume profiles yet"
          }</p>
        </div>`
    : "";

  const profileHint = escapeHintAttr(HEADER_HINTS.profile);
  const stateClass = selectedProfileId && hasProfiles
    ? " is-active"
    : hasProfiles
      ? " is-unset"
      : resumeProfilesHeaderFetchPending
        ? ""
        : " is-unset";
  return `
    <div class="profile-picker-wrap">
      <button type="button" class="header-btn ${FLOATING_HINT_BUTTON_CLASS}${stateClass}" data-profile-picker="1" data-hint="${profileHint}" title="${profileHint}" aria-label="Resume profile${hasProfiles ? `: ${label}` : ""}">
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
      if (isHeaderGripActionTarget(event.target)) return;
      const path = event.composedPath();
      const inside = path.some(
        (node) =>
          node instanceof Element &&
          Boolean(
            node.closest?.(
              "[data-settings], [data-settings-dashboard], [data-minimize], [data-refresh-card], .settings-menu",
            ),
          ),
      );
      if (inside) return;
      closeSettingsMenu();
      if (cardHost) renderCard(cardHost.shadow);
    };
    window.addEventListener("click", closeOnOutside);
    settingsMenuOutsideCleanup = () => {
      window.removeEventListener("click", closeOnOutside);
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
      if (isHeaderGripActionTarget(event.target)) return;
      const path = event.composedPath();
      const insideMenuOrPicker = path.some(
        (node) =>
          node instanceof Element &&
          Boolean(
            node.closest?.(
              "[data-profile-picker], [data-profile-id], [data-minimize], [data-refresh-card], .profile-picker-menu",
            ),
          ),
      );
      if (insideMenuOrPicker) return;
      closeProfilePickerMenu();
      if (cardHost) renderCard(cardHost.shadow);
    };
    window.addEventListener("click", closeOnOutside);
    profilePickerOutsideCleanup = () => {
      window.removeEventListener("click", closeOnOutside);
    };
  }, 0);
}

async function toggleProfilePicker(): Promise<void> {
  if (profilePickerOpen) {
    closeProfilePickerMenu();
    if (cardHost) renderCard(cardHost.shadow);
    return;
  }

  openProfilePickerMenu();
  if (cardHost) renderCard(cardHost.shadow);
  await refreshResumeProfiles().catch(() => undefined);
  if (profilePickerOpen && cardHost) renderCard(cardHost.shadow);
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

function setupHeaderActionsDelegation(shadow: ShadowRoot): void {
  if (headerActionsDelegationReady) return;
  headerActionsDelegationReady = true;

  shadow.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest("[data-minimize]")) {
      event.stopPropagation();
      event.preventDefault();
      minimizeCard();
      return;
    }

    if (target.closest("[data-refresh-card]")) {
      event.stopPropagation();
      event.preventDefault();
      void refreshCardFromHeader();
    }
  });
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
  // Position is session-only; a full page refresh restores the default upper-right anchor.
}

function minimizeCard(): void {
  if (!cardHost) return;
  closeProfilePickerMenu();
  closeSettingsMenu();
  resetCardViewState();
  stopDrag();
  stopPanelResize();
  cardCollapsed = true;
  cardHost.position = getCollapsedFixedCardPosition(window.innerWidth, cardHost.position.y);
  applyHostPosition(cardHost.host, cardHost.position);
  renderCard(cardHost.shadow);
  const capture = getCaptureContext();
  captureAnalyticsEvent(AnalyticsEvents.EXTENSION_CARD_COLLAPSED, {
    platform: capture.platform ?? "unknown",
  });
}

function expandCard(): void {
  if (!cardHost) return;
  stopDrag();
  stopPanelResize();
  const previousHostWidth = getHostWidth();
  cardCollapsed = false;
  syncCardHostPosition(previousHostWidth);
  renderCard(cardHost.shadow);
  const capture = getCaptureContext();
  captureAnalyticsEvent(AnalyticsEvents.EXTENSION_CARD_OPENED, {
    platform: capture.platform ?? "unknown",
    host: location.hostname,
  });
}

function onViewportChange(): void {
  if (!cardHost || isDragging() || panelResizeActive) return;
  if (cardCollapsed) {
    cardHost.position = getCollapsedFixedCardPosition(window.innerWidth, cardHost.position.y);
    applyHostPosition(cardHost.host, cardHost.position);
    return;
  }
  syncCardHostPosition();
}

function onGripDown(e: PointerEvent): void {
  if (!cardHost || e.button !== 0 || isDragging()) return;
  if (isInteractiveGripTarget(e.target)) return;
  e.preventDefault();
  e.stopPropagation();
  bindDragTarget(e, e.currentTarget as HTMLElement, getHostWidth());
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
      cardHost.position = clampFixedCardPosition(
        { mode: "fixed", x, y, custom: true, anchorRight: false },
        hostWidth,
      );
      applyHostPosition(cardHost.host, cardHost.position);
    },
    onEnd: (ev: PointerEvent) => {
      if (!activeDrag || ev.pointerId !== activeDrag.pointerId) return;
      target.classList.remove("dragging");
      stopDrag();
      if (cardHost) {
        cardHost.position = { ...cardHost.position, custom: true, anchorRight: false };
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

function resetExtensionJourneyToStage0(reason: string): void {
  console.log("[EasySubmit] journey:reset to stage 0", { reason, prev: savedStatus.status, url: location.href });
  journeySyncLog("extension", "journey_reset_stage_0", {
    reason,
    url: location.href,
    canonicalUrl: canonicalizeJobUrl(location.href),
    previous: lastJourneySnapshot,
  });

  savedStatus = { saved: false };
  lastJourneySnapshot = snapshotFromServerStatus({ saved: false });
  saveError = null;
  pipelineBusy = false;
  pipelineBusyLabel = null;
  stopApplyPipelineLoader();
  pendingPipelinePhase = null;
  autofillRunForEntryId = null;
  keywordGapData = null;
  resetCardViewState();
  stopStatusPolling();
  stopJourneySyncPoll();
  stopConfirmationWatch();
  void stopJobStatusRealtime();
  void chrome.storage.local.remove(STORAGE_KEYS.pendingApplyJobId);
  if (cardHost) renderCard(cardHost.shadow);
}

function stopJourneySyncPoll(): void {
  if (journeySyncTimer) {
    console.log("[EasySubmit] poll:journey-sync stop", { status: savedStatus.status });
    clearInterval(journeySyncTimer);
    journeySyncTimer = null;
  }
}

function startJourneySyncPoll(): void {
  stopJourneySyncPoll();
  const snapshot = snapshotFromServerStatus(savedStatus);
  if (!shouldRunExtensionJourneySyncPoll(snapshot)) return;

  const intervalMs = extensionJourneySyncPollIntervalMs(savedStatus.status);
  journeySyncDebug("extension", "journey_sync_poll_start", {
    intervalMs,
    entryId: savedStatus.id,
    status: savedStatus.status,
  });

  journeySyncTimer = setInterval(() => {
    if (!guardExtensionContext()) return;
    void applyServerJourneyRefresh("poll").catch(swallowContextInvalidation);
  }, intervalMs);
}

async function applyServerJourneyRefresh(reason: string): Promise<void> {
  if (isEasySubmitAppPage()) return;

  const before = snapshotFromServerStatus(savedStatus);
  const sync = await refreshSavedStatus();
  const after = snapshotFromServerStatus(savedStatus);
  const transition = classifyJourneySyncTransition(before, after);

  journeySyncLog("extension", "journey_sync", {
    reason,
    transition,
    pageUrl: location.href,
    lookupUrl: canonicalizeJobUrl(location.href),
    before,
    after,
  });
  // [ES:LOG] EXT ← journey sync result (poll or realtime trigger)
  console.log("[EasySubmit] journey:sync", { reason, transition, before: before.status, after: after.status });

  lastJourneySnapshot = after;

  if (shouldResetExtensionAfterSync(transition)) {
    console.log("[EasySubmit] journey:sync — resetting to stage 0 after sync", { transition, reason });
    resetExtensionJourneyToStage0(reason);
    return;
  }

  const previousSaveError = saveError;
  saveError = resolveExtensionSaveError({
    clientSaveError: saveError,
    serverIssueMessage: sync?.issueMessage,
    saved: after.saved,
    syncSucceeded: sync !== null,
    status: after.status,
  });

  if (transition !== "unchanged" || previousSaveError !== saveError) {
    void refreshRuntimeConfig().catch(() => undefined);
    if (cardHost) renderCard(cardHost.shadow);
  }

  if (after.status === "READY_TO_APPLY" && before.status !== "READY_TO_APPLY") {
    trackResumeJourneyStep({
      journey: "apply_ready",
      pipelineStep: "85_post_pipeline_state",
      surface: "extension_pipeline",
      traceId: after.id ?? undefined,
      aiUsed: false,
      aiCallStatus: "none",
      status: saveError ? "error" : "success",
      jobStatus: after.status,
      errorCode: saveError ? "pipeline_error" : null,
    });
  }

  if (shouldRunExtensionJourneySyncPoll(after)) {
    if (!journeySyncTimer) {
      startJourneySyncPoll();
    }
  } else {
    console.log("[EasySubmit] poll:journey-sync — terminal state, stopping poll", { status: after.status });
    stopJourneySyncPoll();
  }

  if (after.saved) {
    if ((after.status === "CAPTURED" || after.status === "RESUME_READY") && after.id) {
      console.log("[EasySubmit] journey:sync pipeline in-flight detected", { status: after.status, reason, hasRealtime: isJobStatusRealtimeActive() });
      if (!journeySyncTimer) startJourneySyncPoll();
      if (!isJobStatusRealtimeActive()) {
        console.log("[EasySubmit] realtime:starting job subscription from sync (previous session)", { jobId: after.id });
        void startJobStatusRealtimeForJob(after.id).catch(() => undefined);
      }
    }
    if (after.status === "READY_TO_APPLY") {
      startConfirmationWatch();
      if (after.id && !keywordGapData) {
        void fetchKeywordGap(after.id);
      }
    } else {
      stopConfirmationWatch();
    }
  }
}

async function fetchKeywordGap(entryId: string): Promise<void> {
  try {
    const res = await sendMessage<{ success: boolean; topMissing?: string[]; coveragePercent?: number | null }>({
      action: EXTENSION_MESSAGE.GET_KEYWORD_GAP,
      entryId,
    });
    if (res?.success && res.topMissing && res.topMissing.length > 0) {
      keywordGapData = { topMissing: res.topMissing, coveragePercent: res.coveragePercent ?? null };
      if (cardHost) renderCard(cardHost.shadow);
    }
  } catch {
    // Non-critical — card renders without gap data
  }
}

async function refreshSavedStatus(): Promise<{
  issueMessage: string | null | undefined;
} | null> {
  const lookupUrl = canonicalizeJobUrl(location.href);
  console.log("[EasySubmit] status:lookup", { lookupUrl, currentSaved: savedStatus.saved, currentStatus: savedStatus.status });
  const res = await sendMessage<{
    saved: boolean;
    status?: string;
    id?: string;
    canReapply?: boolean;
    issueMessage?: string | null;
  }>({
    action: EXTENSION_MESSAGE.JOB_STATUS,
    url: lookupUrl,
  });
  if (!res) {
    journeySyncWarn("extension", "job_status_unreachable", { lookupUrl, pageUrl: location.href });
    console.warn("[EasySubmit] status:lookup unreachable — background may be asleep", { lookupUrl });
    return null;
  }
  console.log("[EasySubmit] status:lookup result", { saved: res.saved, status: res.status, id: res.id, canReapply: res.canReapply, issueMessage: res.issueMessage ?? null });
  savedStatus = {
    saved: Boolean(res.saved),
    status: res.status,
    id: typeof res.id === "string" ? res.id : undefined,
    canReapply: Boolean(res.canReapply),
    issueMessage: res.issueMessage ?? null,
  };
  return { issueMessage: res.issueMessage };
}

function stopStatusPolling(): void {
  if (statusPollTimer) {
    clearInterval(statusPollTimer);
    statusPollTimer = null;
  }
}

function startStatusPolling(intervalMs = 2000): void {
  stopStatusPolling();
  console.log("[EasySubmit] poll:pipeline-status start", { intervalMs, status: savedStatus.status });
  statusPollTimer = setInterval(() => {
    if (!guardExtensionContext()) return;
    void applyServerJourneyRefresh("pipeline_poll")
      .then(() => {
        if (
          savedStatus.status === "READY_TO_APPLY" ||
          savedStatus.status === "APPLIED" ||
          (!pipelineBusy && pendingPipelinePhase !== "autofill")
        ) {
          console.log("[EasySubmit] poll:pipeline-status stop — terminal or idle", { status: savedStatus.status });
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
  if (requireApplicationProfileSetupBeforeApply()) return;
  if (savedStatus.status === "READY_TO_APPLY" || savedStatus.status === "APPLIED") {
    pendingPipelinePhase = null;
    await chrome.storage.local.remove(STORAGE_KEYS.pendingApplyJobId);
    return;
  }

  const capture = getCaptureContext();
  captureAnalyticsEvent(AnalyticsEvents.EXTENSION_AUTOFILL_STARTED, {
    platform: capture.platform ?? "unknown",
    entry_id: entryId,
  });
  const autofillStartedAt = Date.now();
  let autofillSucceeded = false;

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
    autofillSucceeded = true;
    pendingPipelinePhase = null;
    saveError = null;
    await chrome.storage.local.remove(STORAGE_KEYS.pendingApplyJobId);
    void applyServerJourneyRefresh("autofill_complete").catch(() => undefined);
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
    captureAnalyticsEvent(AnalyticsEvents.EXTENSION_AUTOFILL_COMPLETED, {
      platform: capture.platform ?? "unknown",
      entry_id: entryId,
      status: autofillSucceeded ? "success" : "error",
      duration_ms: Date.now() - autofillStartedAt,
    });
    pipelineBusy = false;
    pipelineBusyLabel = null;
    autofillRunForEntryId = null;
    stopStatusPolling();
    if (cardHost) renderCard(cardHost.shadow);
  }
}

async function maybeContinuePendingAutofill(): Promise<void> {
  if (needsApplicationProfileSetup()) return;

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

async function openDashboardPath(path: string): Promise<void> {
  await sendMessage({ action: EXTENSION_MESSAGE.OPEN_DASHBOARD, path });
}

async function openExtensionBridgeOnDashboard(): Promise<void> {
  await openDashboardPath(buildExtensionBridgePath(chrome.runtime.id));
}

async function openJobTrackerDashboard(options?: {
  review?: boolean;
  panel?: "job" | "resume" | "cover" | "apply";
}): Promise<void> {
  let path = "/dashboard/job-tracker";
  if (options?.review !== false && savedStatus.id) {
    const panel = options?.panel ?? defaultReviewPanelForStatus(savedStatus.status);
    path = `/dashboard/job-tracker?job=${encodeURIComponent(savedStatus.id)}&panel=${panel}`;
  }
  await openDashboardPath(path);
}

async function openUpdateResumeDashboard(): Promise<void> {
  const path = selectedProfileId
    ? `/dashboard/resume-profiles/${selectedProfileId}/edit`
    : "/dashboard/resume-profiles";
  await openDashboardPath(path);
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
  console.log("[EasySubmit] scrape:refresh-metadata start", { url: location.href, hasIntercepted: Boolean(interceptedMetadata) });
  await waitForJobDescriptionBeforeSave();
  await maybeFetchGreenhouseEmbeddedJob().catch(() => undefined);
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
    path: interceptedMetadata
      ? interceptedMetadataSource === "greenhouse-board-api"
        ? "greenhouse-board-api"
        : "api-intercept"
      : detectedDirect
        ? "detectJobPage"
        : "buildFallbackJobMetadata",
    enrichments: metaWithEnrichments.enrichmentsApplied ?? [],
  };
  // Prefer API-intercepted data — richer and more reliable than DOM scrape
  currentMetadata = interceptedMetadata ?? detected.metadata;
  console.log("[EasySubmit] scrape:refresh-metadata result", { path: lastScrapeContext?.path, title: currentMetadata?.title, platform: currentMetadata?.platform, confidence: currentMetadata?.confidence });
}

async function refreshRuntimeConfig(): Promise<ExtensionRuntimeConfig> {
  console.log("[EasySubmit] config:refresh — fetching runtime config from background");
  let res = await sendMessage<{ success: boolean; config?: ExtensionRuntimeConfig }>({
    action: EXTENSION_MESSAGE.GET_CONFIG,
  });
  if (!res) {
    // MV3 service worker may have just woken — wait briefly and retry once
    await new Promise((resolve) => setTimeout(resolve, 600));
    res = await sendMessage<{ success: boolean; config?: ExtensionRuntimeConfig }>({
      action: EXTENSION_MESSAGE.GET_CONFIG,
    });
  }
  if (!res) {
    console.log("[EasySubmit] config:refresh — background still waking, using cached or defaults");
    return runtimeConfig ?? mergeExtensionRuntimeConfig(undefined);
  }
  runtimeConfig = mergeExtensionRuntimeConfig(res.config);
  console.log("[AiHealth:extension]", "config.refresh", {
    hasAiHealthError: Boolean(runtimeConfig.aiHealthError),
    aiHealthError: runtimeConfig.aiHealthError ?? null,
    connectedUser: runtimeConfig.connectedUser?.email ?? null,
  });
  connectedAccountEmail = runtimeConfig.connectedUser?.email ?? null;
  cachedApplicationProfile = runtimeConfig.applicationProfile ?? null;
  if (profileSetupScreen === 0) {
    const synced = syncProfileSetupDraftsFromProfile(cachedApplicationProfile);
    profileSetupScreen1Draft = synced.screen1;
    profileSetupScreen2Draft = synced.screen2;
  }
  if (cardHost && !profileSetupContinueBusy) renderCard(cardHost.shadow);
  return runtimeConfig;
}

function needsApplicationProfileSetup(): boolean {
  return !isApplicationProfileSetupComplete(cachedApplicationProfile);
}

function openApplicationProfileSetupScreen(): void {
  if (profileSetupScreen !== 0) return;
  profileSetupScreen = 1;
  trackScreenOverlay("application_profile_screen_1", {
    route: location.href,
    flags: { entryId: savedStatus.id ?? null },
  });
  profileSetupScreen1ValidationIssues = [];
  const synced = syncProfileSetupDraftsFromProfile(cachedApplicationProfile);
  profileSetupScreen1Draft = synced.screen1;
  profileSetupScreen2Draft = synced.screen2;
}

/** Returns true when Apply must wait for mandatory profile setup (Screen 1). */
function requireApplicationProfileSetupBeforeApply(): boolean {
  if (!needsApplicationProfileSetup()) return false;
  pendingApplyAfterProfileSetup = true;
  openApplicationProfileSetupScreen();
  cardCollapsed = false;
  if (cardHost) renderCard(cardHost.shadow);
  return true;
}

async function resumeApplyFlowAfterProfileSetup(): Promise<void> {
  await ensureRuntimeConfig();
  if (isExtensionForceUpgradeRequired(runtimeConfig, getExtensionManifestVersion())) return;
  if (isExtensionApplyBlockedByAiHealth(runtimeConfig)) return;

  const stored = await chrome.storage.local.get(STORAGE_KEYS.pendingApplyJobId);
  const pendingId = stored[STORAGE_KEYS.pendingApplyJobId];
  const jobId =
    typeof pendingId === "string" && pendingId.trim() ? pendingId.trim() : null;

  if (jobId) {
    savedStatus = { ...savedStatus, id: jobId };
    pendingPipelinePhase = pendingPipelinePhase ?? "autofill";
    await applyServerJourneyRefresh("dashboard_start_apply").catch(() => undefined);
    if (savedStatus.status === "RESUME_READY") {
      void runAutofillPhase(jobId);
    } else if (savedStatus.saved) {
      void pollUntilResumeReady(jobId);
    } else {
      void runAutofillPhase(jobId);
    }
    return;
  }

  void startApplyPipeline();
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
  if (profileSetupContinueBusy) return;

  profileSetupScreen1Draft = readProfileSetupScreen1FromDom(root);
  const validationIssues = validateProfileSetupScreen1(profileSetupScreen1Draft);
  if (validationIssues.length > 0) {
    profileSetupScreen1ValidationIssues = validationIssues;
    profileSetupSaveError = null;
    if (cardHost) renderCard(cardHost.shadow);
    return;
  }

  profileSetupScreen1ValidationIssues = [];
  profileSetupContinueBusy = true;
  profileSetupSaveError = null;
  if (cardHost) renderCard(cardHost.shadow);

  const patchResult = await patchApplicationProfile(
    applicationProfilePatchFromScreen1(profileSetupScreen1Draft),
  );

  profileSetupContinueBusy = false;

  if (!patchResult.success) {
    profileSetupSaveError = patchResult.error ?? "Could not save application profile.";
    if (cardHost) renderCard(cardHost.shadow);
    return;
  }

  profileSetupScreen = 2;
  trackScreenOverlay("application_profile_screen_2", {
    route: location.href,
    flags: { entryId: savedStatus.id ?? null },
  });
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

  // Advance to Screen 3 instead of closing
  profileSetupScreen = 3;
  saveError = null;
  if (cardHost) renderCard(cardHost.shadow);
}

async function onProfileSetupDone(root: ShadowRoot, skipAll: boolean): Promise<void> {
  if (!skipAll) {
    profileSetupScreen3Draft = readProfileSetupScreen3FromDom(root);
  }
  const patch = applicationProfilePatchFromScreen3(
    profileSetupScreen3Draft,
    cachedApplicationProfile?.preferences ?? null,
  );
  const patchResult = await patchApplicationProfile(patch);
  if (!patchResult.success) {
    saveError = patchResult.error ?? "Could not save application profile.";
    if (cardHost) renderCard(cardHost.shadow);
    return;
  }

  profileSetupScreen = 0;
  saveError = null;
  if (cardHost) renderCard(cardHost.shadow);

  if (pendingApplyAfterProfileSetup) {
    pendingApplyAfterProfileSetup = false;
    void resumeApplyFlowAfterProfileSetup();
  }
}

const STATUS_ORDER: Record<string, number> = {
  CAPTURED: 1,
  RESUME_READY: 2,
  READY_TO_APPLY: 3,
  APPLIED: 4,
};

function isStatusForward(from: string | undefined, to: string): boolean {
  return (STATUS_ORDER[to] ?? 0) > (STATUS_ORDER[from ?? ""] ?? 0);
}

async function startJobStatusRealtimeForJob(jobId: string): Promise<void> {
  const config = runtimeConfig ?? (await ensureRuntimeConfig());
  void startJobStatusRealtime({
    jobId,
    apiBaseUrl: config.apiBaseUrl,
    sendMessage: (msg) => sendMessage(msg),
    getAuthToken: async () => {
      const t = await sendMessage<{ token: string | null }>({ action: EXTENSION_MESSAGE.GET_AUTH });
      return t?.token ?? null;
    },
    onSync: () => undefined,
    onStatus: (status) => {
      const prev = savedStatus.status;
      if (!isStatusForward(prev, status)) {
        console.log("[EasySubmit] realtime:status ignored — backward transition", { from: prev, to: status, jobId });
        return;
      }
      console.log("[EasySubmit] realtime:status received", { status, jobId, prev });
      savedStatus = { ...savedStatus, status };
      void applyServerJourneyRefresh("realtime_status").catch(() => undefined);
      if (cardHost) renderCard(cardHost.shadow);
      if (status === "READY_TO_APPLY" || status === "APPLIED") {
        console.log("[EasySubmit] realtime:stopping subscription — terminal status reached", { status });
        void stopJobStatusRealtime();
      }
    },
  });
}

async function startApplyPipeline(): Promise<void> {
  if (pipelineBusy) return;

  const config = runtimeConfig ?? (await ensureRuntimeConfig());
  if (isExtensionForceUpgradeRequired(config, getExtensionManifestVersion())) return;
  if (isExtensionApplyBlockedByAiHealth(config)) return;

  applyPipelineSessionId = crypto.randomUUID();
  patchLocalApplyPipelineStep("capture_validate", {
    status: "active",
    detail: "Validating scrape + apply gate…",
  });

  const captureForAnalytics = getCaptureContext();
  captureAnalyticsEvent(AnalyticsEvents.EXTENSION_APPLY_STARTED, {
    platform: captureForAnalytics.platform ?? "unknown",
  });

  if (cardPresentation === "manual_capture" && cardHost) {
    manualCaptureDraft = readManualCaptureDraftFromDom(cardHost.shadow);
    const blockReason = manualCaptureBlockReason({
      url: manualCaptureDraft.jobUrl,
      description: manualCaptureDraft.description,
      title: manualCaptureDraft.title,
    });
    if (blockReason) {
      saveError = blockReason;
      patchLocalApplyPipelineStep("capture_validate", {
        status: "error",
        detail: blockReason,
      });
      if (cardHost) renderCard(cardHost.shadow);
      return;
    }
  }

  const tokenRes = await sendMessage<{ token: string | null }>({ action: EXTENSION_MESSAGE.GET_AUTH });
  if (!tokenRes?.token) {
    saveError = "Link this extension from your EasySubmit dashboard, then try again.";
    patchLocalApplyPipelineStep("capture_validate", {
      status: "error",
      detail: saveError,
    });
    if (cardHost) renderCard(cardHost.shadow);
    return;
  }

  if (cardPresentation !== "manual_capture") {
    await refreshMetadataBeforeSave(config);
  }

  const capture = getCaptureContext();

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

  patchLocalApplyPipelineStep("capture_validate", {
    status: "done",
    detail: "Client validation passed",
    meta: {
      platform: capture.platform,
      title: capture.title,
      company: capture.company,
      descriptionChars: capture.description?.length ?? 0,
      sourceProfileId: selectedProfileId,
    },
  });
  patchLocalApplyPipelineStep("capture_save", {
    status: "active",
    detail: "Saving job…",
  });

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
      captureMode: cardPresentation === "manual_capture" ? "manual" : "auto",
    },
  };

  // [ES:LOG] EXT → pipeline start — user clicked "Apply with EasySubmit"
  console.log("[EasySubmit] pipeline:start", { url: capture.url, platform: capture.platform });
  pipelineBusy = true;
  pipelineBusyLabel = APPLY_PIPELINE_USER_LINES.jobCapturing;
  saveError = null;
  if (cardHost) renderCard(cardHost.shadow);

  try {
    // Stage 0→1: capture immediately, get id back
    const captureRes = await sendMessage<{ success: boolean; id?: string; status?: string; error?: string }>({
      action: EXTENSION_MESSAGE.CAPTURE_JOB,
      payload,
    });

    if (!captureRes?.success || !captureRes.id) {
      saveError =
        captureRes?.error ??
        "Could not save this job. Reconnect the extension from the dashboard, then try again.";
      patchLocalApplyPipelineStep(
        "capture_save",
        { status: "error", detail: saveError },
        captureRes?.id,
      );
      pipelineBusy = false;
      pipelineBusyLabel = null;
      if (cardHost) renderCard(cardHost.shadow);
      return;
    }

    // [ES:LOG] EXT → DB event fired: CAPTURED (job saved, pipeline starting)
    console.log("[EasySubmit] db:event CAPTURED", { jobId: captureRes.id, status: captureRes.status });
    captureAnalyticsEvent(AnalyticsEvents.EXTENSION_JOB_CAPTURED, {
      platform: capture.platform ?? "unknown",
      entry_id: captureRes.id,
      status: captureRes.status ?? "CAPTURED",
    });
    trackResumeJourneyStep({
      journey: "capture",
      pipelineStep: "40_apply_start",
      surface: "extension_pipeline",
      traceId: captureRes.id,
      aiUsed: false,
      aiCallStatus: "skipped",
      status: "success",
      jobStatus: captureRes.status ?? "CAPTURED",
    });
    const jobId = captureRes.id;
    openWebPipelineDebugPanel(jobId);
    patchLocalApplyPipelineStep(
      "capture_save",
      {
        status: "done",
        detail: `CAPTURED · ${jobId}`,
        meta: { entryId: jobId, status: captureRes.status },
      },
      jobId,
    );

    savedStatus = {
      saved: true,
      status: captureRes.status ?? "CAPTURED",
      id: jobId,
      canReapply: false,
    };
    pipelineBusy = false;
    pipelineBusyLabel = null;
    if (cardHost) renderCard(cardHost.shadow);

    // [ES:LOG] EXT — starting poll fallback immediately after capture (catches realtime failures)
    console.log("[EasySubmit] pipeline:poll fallback starting", { jobId });
    startJourneySyncPoll();

    // Subscribe to per-job Realtime — each DB status write pushes here instantly
    void startJobStatusRealtimeForJob(jobId);

    // Stage 1→2: fire tailor async — Realtime delivers each state change
    console.log("[EasySubmit] pipeline:tailor-async fired", { jobId, url: payload.url });
    void sendMessage({
      action: EXTENSION_MESSAGE.TAILOR_JOB_ASYNC,
      payload: { entryId: jobId },
    });
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      teardownStaleExtensionContext();
      return;
    }
    console.error("[EasySubmit] pipeline:error", error);
    saveError =
      error instanceof Error
        ? error.message
        : "Could not reach the extension background worker. Reload the extension and try again.";
    pipelineBusy = false;
    pipelineBusyLabel = null;
    if (cardHost) renderCard(cardHost.shadow);
  }
}

async function onAutoSuggestClick(): Promise<void> {
  if (!currentMetadata || pipelineBusy || !savedStatus.saved) return;
  await ensureRuntimeConfig();
  if (isExtensionForceUpgradeRequired(runtimeConfig, getExtensionManifestVersion())) return;
  if (isExtensionApplyBlockedByAiHealth(runtimeConfig)) return;
  if (requireApplicationProfileSetupBeforeApply()) return;

  if (savedStatus.canReapply) {
    await startApplyPipeline();
    return;
  }

  if (savedStatus.status === "READY_TO_APPLY") {
    await openJobTrackerDashboard({ review: true, panel: "apply" });
  }
}

async function onPrimaryClick(): Promise<void> {
  console.log("[EasySubmit] user:primary-click", { saved: savedStatus.saved, status: savedStatus.status, canReapply: savedStatus.canReapply, presentation: cardPresentation });
  if (!currentMetadata || pipelineBusy) return;
  if (cardPresentation === "no_job") return;

  await ensureRuntimeConfig();
  if (isExtensionForceUpgradeRequired(runtimeConfig, getExtensionManifestVersion())) return;
  if (isExtensionApplyBlockedByAiHealth(runtimeConfig)) return;

  if (requireApplicationProfileSetupBeforeApply()) return;

  if (savedStatus.saved) {
    if (savedStatus.canReapply) {
      await startApplyPipeline();
      return;
    }
    return;
  }

  if (!isApplyEnabled()) return;

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
      error: `The job card is hidden on the ${BRAND.full} dashboard. Use Job Tracker in the app.`,
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
  console.log("[EasySubmit] card:mount", { title: metadata.title, platform: metadata.platform, presentation: cardPresentation, url: location.href });
  await refreshRuntimeConfig().catch(() => ensureRuntimeConfig());

  const sameTitle = currentMetadata?.title === metadata.title;
  currentMetadata = metadata;
  await applyServerJourneyRefresh("mount_card").catch(() => undefined);
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
    trackScreenOverlay("extension_job_card", {
      route: location.href,
      params: { title: metadata.title, platform: metadata.platform ?? null },
    });
    setupExtensionUiAnalyticsDelegation(shadow);
    setupProfilePickerDelegation(shadow);
    setupSettingsMenuDelegation(shadow);
    setupHeaderActionsDelegation(shadow);
    setupPanelResizeDelegation(shadow);
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
  if (isWaitingForJobScrape()) {
    startLoadingHydrationWatch();
  } else {
    stopLoadingHydrationWatch();
  }
}

function removeCard(): void {
  console.log("[EasySubmit] card:remove", { hadCard: Boolean(cardHost), url: location.href });
  stopDrag();
  stopPanelResize();
  stopAllExtensionTimers();
  closeProfilePickerMenu();
  closeSettingsMenu();
  profilePickerDelegationReady = false;
  settingsMenuDelegationReady = false;
  headerActionsDelegationReady = false;
  extensionUiAnalyticsReady = false;
  panelResizeDelegationReady = false;
  void stopJobStatusRealtime();
  cardHost?.host.remove();
  cardHost = null;
  currentMetadata = null;
  cardPresentation = "job";
  manualCaptureDraft = null;
  cardCollapsed = false;
  cardPanelWidth = JOB_CARD_WIDTH;
  cardPanelBodyMaxHeight = null;
}

function idleExtensionOnAppPage(): void {
  stopJourneySyncPoll();
  stopStatusPolling();
  stopConfirmationWatch();
  stopLoadingHydrationWatch();
  void stopJobStatusRealtime();
  removeCard();
}

let updateTimer: ReturnType<typeof setTimeout> | null = null;

function isEasySubmitAppPage(): boolean {
  return isEasySubmitManagedAppPage(location.hostname, location.pathname);
}

async function updateCard(): Promise<void> {
  if (!isContextValid() || window.top !== window.self) return;
  if (isDragging()) return;
  console.log("[EasySubmit] card:update triggered", { url: location.href, isAppPage: isEasySubmitAppPage(), hasSaved: savedStatus.saved });

  if (isEasySubmitAppPage()) {
    idleExtensionOnAppPage();
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

    const inTabReturnGrace = cardHost && Date.now() - tabReturnedAt < TAB_RETURN_GRACE_MS;

    if (!onJobPage) {
      if (inTabReturnGrace) {
        // Page DOM may still be restoring after tab return — retry after grace window.
        scheduleUpdate(TAB_RETURN_GRACE_MS);
        return;
      }
      removeCard();
      return;
    }

    if (isGreenhouseEmbeddedJobUrl(location.href) || isGreenhouseBoardJobUrl(location.href)) {
      await maybeFetchGreenhouseEmbeddedJob().catch(() => undefined);
    }

    const { presentation, metadata } = resolveCardContent(config, "auto");
    if (presentation === "no_job") {
      if (inTabReturnGrace) {
        scheduleUpdate(TAB_RETURN_GRACE_MS);
        return;
      }
      cardPresentation = presentation;
      await mountCard("body", metadata);
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
  if (isEasySubmitAppPage()) {
    idleExtensionOnAppPage();
    return;
  }
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
    company: data.company?.trim() || parseCompanyFromJobHost(location.href) || null,
    location: data.location ?? null,
    salaryText: null,
    description: data.description ?? null,
    platform: data.platform,
    confidence: 95,
    ...(jsonLdFields ? { jsonLdFields } : {}),
  };
}

function isGreenhouseApiFetchUrl(url: string): boolean {
  return isGreenhouseEmbeddedJobUrl(url) || isGreenhouseBoardJobUrl(url);
}

function applyGreenhouseApiMetadata(data: InterceptedJobData): void {
  const apiMeta = interceptedToMetadata(data);
  const domDesc =
    interceptedMetadataSource === "page-intercept"
      ? interceptedMetadata?.description
      : scrapeDescription(document);
  const preferredDesc = preferGreenhouseBoardApiDescription(domDesc, apiMeta.description);

  if (
    !interceptedMetadata ||
    preferredDesc === apiMeta.description ||
    (apiMeta.description?.length ?? 0) >= (domDesc?.length ?? 0) + 400
  ) {
    interceptedMetadata = {
      ...apiMeta,
      description: preferredDesc ?? apiMeta.description,
      company: apiMeta.company || interceptedMetadata?.company || null,
      location: apiMeta.location ?? interceptedMetadata?.location ?? null,
      title: apiMeta.title || interceptedMetadata?.title || "",
    };
    interceptedMetadataSource = "greenhouse-board-api";
    return;
  }

  if (interceptedMetadata && preferredDesc) {
    interceptedMetadata = {
      ...interceptedMetadata,
      description: preferredDesc,
      title: interceptedMetadata.title || apiMeta.title,
      company: interceptedMetadata.company || apiMeta.company,
      platform: interceptedMetadata.platform || apiMeta.platform,
    };
  }
}

async function maybeFetchGreenhouseEmbeddedJob(): Promise<void> {
  const url = location.href;
  if (!isGreenhouseApiFetchUrl(url)) return;

  const fetchKey = url;
  if (greenhouseEmbeddedFetchKey === fetchKey && greenhouseEmbeddedFetchPromise) {
    await greenhouseEmbeddedFetchPromise;
    return;
  }

  greenhouseEmbeddedFetchKey = fetchKey;
  greenhouseEmbeddedFetchPromise = (async () => {
    console.log("[EasySubmit] greenhouse:api-fetch start", { url });
    try {
      const response = await sendMessage<{
        success: boolean;
        metadata?: InterceptedJobData;
        error?: string;
      }>({
        action: EXTENSION_MESSAGE.FETCH_GREENHOUSE_EMBEDDED,
        url,
      });
      if (response?.success && response.metadata?.title) {
        applyGreenhouseApiMetadata(response.metadata);
        console.log("[EasySubmit] greenhouse:api-fetch done", {
          title: response.metadata.title,
          descriptionLength: response.metadata.description?.length ?? 0,
        });
        return;
      }
      console.log("[EasySubmit] greenhouse:api-fetch fail", {
        error: response?.error ?? "empty_response",
      });
    } catch (error) {
      console.warn("[EasySubmit] greenhouse:api-fetch fail", error);
    } finally {
      if (interceptedMetadataSource !== "greenhouse-board-api") {
        greenhouseEmbeddedFetchKey = null;
        greenhouseEmbeddedFetchPromise = null;
      }
    }
  })();

  await greenhouseEmbeddedFetchPromise;
}

function bootJobPageObservers(): void {
  if (contentWindow.__easysubmitObserversBooted) return;
  contentWindow.__easysubmitObserversBooted = true;

  handleAssistOpenOnLoad();

  if (!isEasySubmitAppPage()) {
    injectApiInterceptScript();

    onApiIntercept((data) => {
      if (!data.title) return;
      console.log("[EasySubmit] intercept:job-data received", { title: data.title, company: data.company, platform: data.platform });
      const incoming = interceptedToMetadata(data);
      if (
        interceptedMetadataSource === "greenhouse-board-api" &&
        interceptedMetadata?.description
      ) {
        const preferred = preferGreenhouseBoardApiDescription(
          incoming.description,
          interceptedMetadata.description,
        );
        if (preferred === interceptedMetadata.description) {
          interceptedMetadata = {
            ...interceptedMetadata,
            title: interceptedMetadata.title || incoming.title,
            company: interceptedMetadata.company || incoming.company,
            location: interceptedMetadata.location ?? incoming.location,
            platform: interceptedMetadata.platform || incoming.platform,
          };
          if (cardHost) {
            void updateCard().catch(swallowContextInvalidation);
          } else {
            scheduleUpdate();
          }
          return;
        }
      }
      interceptedMetadata = incoming;
      interceptedMetadataSource = "page-intercept";
      if (cardHost) {
        void updateCard().catch(swallowContextInvalidation);
      } else {
        scheduleUpdate();
      }
    });
  }

  window.addEventListener("unhandledrejection", (event) => {
    if (isExtensionContextInvalidatedError(event.reason)) {
      event.preventDefault();
      teardownStaleExtensionContext();
    }
  });

  if (!isEasySubmitAppPage()) {
    setupFieldCaptureBridge({
      getJobEntryId: () => savedStatus.id,
      onCapture: (payload: FieldCapturePayload, jobEntryId?: string) => {
        void postFieldCapture(payload, jobEntryId ?? savedStatus.id).catch(() => undefined);
      },
    });
  }

  window.addEventListener("focus", () => {
    if (document.visibilityState !== "visible") return;
    if (isEasySubmitAppPage()) {
      idleExtensionOnAppPage();
      return;
    }
    console.log("[EasySubmit] lifecycle:tab-focus — syncing journey", { url: location.href, savedStatus: savedStatus.status ?? "unsaved" });
    if (!cardHost) scheduleUpdate();
    refreshRuntimeConfigOnTabResume();
    void applyServerJourneyRefresh("tab_focus").catch(swallowContextInvalidation);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    tabReturnedAt = Date.now();
    if (isEasySubmitAppPage()) {
      idleExtensionOnAppPage();
      return;
    }
    console.log("[EasySubmit] lifecycle:tab-visible — syncing journey", { url: location.href, savedStatus: savedStatus.status ?? "unsaved" });
    if (!cardHost) scheduleUpdate();
    refreshRuntimeConfigOnTabResume();
    void applyServerJourneyRefresh("tab_visible").catch(swallowContextInvalidation);
  });

  if (isEasySubmitAppPage()) {
    idleExtensionOnAppPage();
  } else {
    scheduleUpdate();
    ensureJobSiteDomObservers();
  }

  startUrlWatch();
}

function ensureJobSiteDomObservers(): void {
  if (contentWindow.__easysubmitDomObserversBooted) return;
  contentWindow.__easysubmitDomObserversBooted = true;

  const domObserver = new MutationObserver((mutations) => {
    if (isEasySubmitAppPage()) return;
    if (!mutationTouchesCardHost(mutations)) {
      scheduleUpdate();
    }
  });
  domContentObserver = domObserver;

  if (document.body) {
    domObserver.observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener("resize", onViewportChange);
  window.addEventListener("popstate", () => scheduleUpdate());
  window.addEventListener("hashchange", () => scheduleUpdate());
}

function startUrlWatch(): void {
  let lastUrl = location.href;
  stopUrlWatch();
  urlWatchTimer = setInterval(() => {
    if (!guardExtensionContext()) return;
    if (location.href !== lastUrl) {
      console.log("[EasySubmit] lifecycle:url-change", { from: lastUrl, to: location.href });
      lastUrl = location.href;
      handleJobPageUrlChange();
    }
  }, 800);
}

if (window.top === window.self) {
  const isBridgePage = window.location.pathname.startsWith("/extension/bridge");

  const isDashboardPage = window.location.pathname.startsWith("/dashboard") || window.location.pathname.startsWith("/extension");

  if (isDashboardPage) {
    try {
      window.localStorage.setItem(STORAGE_KEYS.extensionId, chrome.runtime.id);
    } catch {
      // ignore private mode / quota errors
    }
    if (!isBridgePage) {
      void maybeAutoConnectExtensionFromDashboard(chrome.runtime);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          void maybeAutoConnectExtensionFromDashboard(chrome.runtime);
        }
      });
    }
  }

  if (isBridgePage) {
    setupBridgeRelay();
    console.log("EasySubmit: bridge relay ready");
  } else {
    const bootWhenGloballyEnabled = (): void => {
      exposeEasySubmitAnimationGlobals();
      console.log("[EasySubmit] lifecycle:boot", { readyState: document.readyState, url: location.href });
      void refreshRuntimeConfig()
        .then((config) => {
          console.log("[EasySubmit] lifecycle:boot config", { globalEnabled: isExtensionGlobalSwitchOn(config), hasAiHealth: Boolean(config.aiHealthError) });
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

    // If the tab was loading in the background (MV3 service worker asleep),
    // the initial bootWhenGloballyEnabled() may have silently failed.
    // Re-attempt boot on tab focus so the card appears without a full refresh.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      if (!contentWindow.__easysubmitObserversBooted) {
        bootWhenGloballyEnabled();
      }
    });

    contentWindow.__easysubmitHandleMessage = (message, sendResponse) => {
      if (message?.action === EXTENSION_MESSAGE.FORCE_SHOW_CARD) {
        void forceShowCard().then(sendResponse);
        return true;
      }

      if (message?.action === EXTENSION_MESSAGE.GET_TAB_STATUS) {
        void buildTabStatusPayload().then(sendResponse);
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
            if (!shown.success) {
              sendResponse(shown);
              return;
            }
            await ensureRuntimeConfig();
            if (requireApplicationProfileSetupBeforeApply()) {
              sendResponse(shown);
              return;
            }
            await applyServerJourneyRefresh("dashboard_start_apply").catch(() => undefined);
            if (savedStatus.status === "RESUME_READY") {
              void runAutofillPhase(jobId);
            } else if (savedStatus.saved) {
              void pollUntilResumeReady(jobId);
            } else {
              void runAutofillPhase(jobId);
            }
            sendResponse(shown);
          });
        return true;
      }

      if (message?.action === EXTENSION_MESSAGE.PING) {
        sendResponse({ ready: true, version: chrome.runtime.getManifest().version });
        return true;
      }

      if (
        message?.action === EXTENSION_MESSAGE.JOB_ARCHIVED &&
        typeof message.entryId === "string"
      ) {
        if (savedStatus.saved && savedStatus.id === message.entryId) {
          console.log("[EasySubmit] ext:job-archived — resetting to stage 0", { entryId: message.entryId });
          resetExtensionJourneyToStage0("job_archived");
        }
        sendResponse({ success: true });
        return true;
      }

      return false;
    };

    if (!contentWindow.__easysubmitMessageHooked) {
      contentWindow.__easysubmitMessageHooked = true;
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        const handle = contentWindow.__easysubmitHandleMessage;
        if (!handle) return false;
        return handle(message as Record<string, unknown>, sendResponse);
      });
    }

    contentWindow.__easysubmitCleanup = () => {
      contentWindow.__easysubmitObserversBooted = false;
      contentWindow.__easysubmitDomObserversBooted = false;
      contentWindow.__easysubmitTeardownDone = false;
      domContentObserver?.disconnect();
      domContentObserver = null;
      stopAllExtensionTimers();
      removeCard();
    };

    console.log("EasySubmit: content script ready");
  }
}
}

bootContentScript();
