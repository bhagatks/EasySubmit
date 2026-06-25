import {
  DEFAULT_API_BASE,
  EXTENSION_MESSAGE,
  STORAGE_KEYS,
} from "@shared/extension/constants";
import {
  appOriginsMatch,
  buildDashboardUrl,
  expandAppOriginAliases,
  pickAppTabToReuse,
  type AppTabCandidate,
} from "@shared/extension/open-dashboard";
import { jobUrlsMatch } from "@shared/extension/job-url";
import type {
  ExtensionRuntimeConfig,
  JobSavePayload,
  JobStatusResponse,
} from "@shared/extension/types";
import { fieldCapturePayloadToEvents } from "@shared/extension/field-capture-api";
import { appendAssistOpenParam } from "@shared/extension/assist-open-url";
import type { FieldCapturePayload } from "@shared/extension/field-descriptor";

const CONTEXT_MENU_FORCE_SHOW = "easysubmit-force-show-card";

async function getApiBase(): Promise<string> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.apiBaseUrl);
  const value = stored[STORAGE_KEYS.apiBaseUrl];
  if (typeof value === "string" && value.startsWith("http")) {
    return value.replace(/\/$/, "");
  }
  return DEFAULT_API_BASE;
}

async function getAuthToken(): Promise<string | null> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.authToken);
  const token = stored[STORAGE_KEYS.authToken];
  return typeof token === "string" && token.length > 0 ? token : null;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = await getApiBase();
  const token = await getAuthToken();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${base}${path}`, { ...init, headers });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    const message = res.ok ? "Invalid JSON response" : `Request failed (${res.status})`;
    return { success: false, error: message, saved: false } as T;
  }

  if (!res.ok) {
    const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    const message =
      typeof record.error === "string" ? record.error : `Request failed (${res.status})`;
    return { ...record, success: false, error: message, saved: false } as T;
  }

  return data as T;
}

async function apiFetchBinary(
  path: string,
): Promise<{ success: boolean; bytes?: number[]; filename?: string; error?: string }> {
  const base = await getApiBase();
  const token = await getAuthToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${base}${path}`, { headers });
  if (!res.ok) {
    let error = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (typeof data.error === "string") error = data.error;
    } catch {
      // non-JSON error body
    }
    return { success: false, error };
  }

  const buffer = await res.arrayBuffer();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filenameMatch = disposition.match(/filename="([^"]+)"/i);
  const filename = filenameMatch?.[1] ?? "document.pdf";

  return {
    success: true,
    bytes: Array.from(new Uint8Array(buffer)),
    filename,
  };
}

async function loadRuntimeConfig(): Promise<ExtensionRuntimeConfig> {
  const base = (await getApiBase()).replace(/\/$/, "");
  const data = await apiFetch<ExtensionRuntimeConfig & { success?: boolean }>(
    "/api/extension/config",
  );
  // Pin to the host we actually reached — do not drift to NEXT_PUBLIC_APP_URL from the body.
  await chrome.storage.local.set({ [STORAGE_KEYS.apiBaseUrl]: base });
  return {
    jobCardEnabled: Boolean(data.jobCardEnabled),
    extensionGlobalSwitch: data.extensionGlobalSwitch ?? true,
    enabledPlatforms: data.enabledPlatforms ?? ["generic"],
    genericFallbackEnabled: data.genericFallbackEnabled ?? true,
    minConfidence: data.minConfidence ?? 55,
    apiBaseUrl: base,
    autoApplyUserSwitch: data.autoApplyUserSwitch ?? true,
    oneClickApplyPlatforms: data.oneClickApplyPlatforms ?? ["workday"],
    autoApplyEnabled: data.autoApplyEnabled ?? true,
    connectedUser: data.connectedUser ?? null,
  };
}

async function gatherAppTabCandidates(appOrigin: string): Promise<AppTabCandidate[]> {
  const aliases = expandAppOriginAliases(appOrigin);
  const byId = new Map<number, AppTabCandidate>();

  const addTab = (tab: chrome.tabs.Tab) => {
    const url = tab.url ?? tab.pendingUrl;
    if (!tab.id || !url) return;
    if (!aliases.some((origin) => appOriginsMatch(new URL(url).origin, origin))) return;
    byId.set(tab.id, { id: tab.id, url, windowId: tab.windowId });
  };

  for (const tab of await chrome.tabs.query({})) {
    addTab(tab);
  }

  for (const origin of aliases) {
    try {
      for (const tab of await chrome.tabs.query({ url: `${origin}/*` })) {
        addTab(tab);
      }
    } catch {
      // ignore invalid tab query patterns
    }
  }

  return [...byId.values()];
}

async function openDashboardPath(path: string): Promise<{ success: boolean }> {
  const base = await getApiBase();
  const targetUrl = buildDashboardUrl(base, path);
  const appOrigin = new URL(base).origin;

  const candidates = await gatherAppTabCandidates(appOrigin);
  const existing = pickAppTabToReuse(candidates, appOrigin);

  if (existing?.id) {
    const currentUrl = existing.url.split("#")[0];
    const nextUrl = targetUrl.split("#")[0];
    if (currentUrl !== nextUrl) {
      await chrome.tabs.update(existing.id, { url: targetUrl });
    } else if (nextUrl.includes("/dashboard/job-tracker")) {
      // Same tracker URL — reload so new extension saves appear without a manual refresh.
      await chrome.tabs.reload(existing.id);
    }
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId != null) {
      await chrome.windows.update(existing.windowId, { focused: true });
    }
    return { success: true };
  }

  await chrome.tabs.create({ url: targetUrl, active: true });
  return { success: true };
}

async function openLoginBridge(): Promise<void> {
  const base = await getApiBase();
  const extensionId = chrome.runtime.id;
  await chrome.tabs.create({
    url: `${base}/extension/bridge?extensionId=${encodeURIComponent(extensionId)}`,
  });
}

function isRestrictedUrl(url?: string): boolean {
  if (!url) return true;
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("devtools://")
  );
}

async function notifyTabStartApply(
  tabId: number,
  jobId: string,
  url: string,
): Promise<void> {
  const payload = {
    action: EXTENSION_MESSAGE.START_APPLY,
    jobId,
    url,
  };

  try {
    await chrome.tabs.sendMessage(tabId, payload);
    return;
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    await chrome.tabs.sendMessage(tabId, payload);
  }
}

async function startApplyFromDashboard(jobId: string, url: string): Promise<{ success: boolean }> {
  await chrome.storage.local.set({ [STORAGE_KEYS.pendingApplyJobId]: jobId });
  const targetUrl = appendAssistOpenParam(url);

  const tabs = await chrome.tabs.query({});
  const existing = tabs.find((tab) => tab.url && jobUrlsMatch(tab.url, url));

  if (existing?.id) {
    await chrome.tabs.update(existing.id, { active: true, url: targetUrl });
    if (existing.windowId != null) {
      await chrome.windows.update(existing.windowId, { focused: true });
    }
    await notifyTabStartApply(existing.id, jobId, url);
    return { success: true };
  }

  const created = await chrome.tabs.create({ url: targetUrl, active: true });
  if (created.id) {
    // Content script boot reads pendingApplyJobId when the tab loads.
    await notifyTabStartApply(created.id, jobId, url).catch(() => undefined);
  }

  return { success: true };
}

async function forceShowOnTab(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id || isRestrictedUrl(tab.url)) {
    return;
  }

  const message = { action: EXTENSION_MESSAGE.FORCE_SHOW_CARD };

  try {
    await chrome.tabs.sendMessage(tab.id, message);
    return;
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    await chrome.tabs.sendMessage(tab.id, message);
  }
}

function registerContextMenus(): void {
  void chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_FORCE_SHOW,
      title: "Show job card on this page",
      contexts: ["action"],
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  registerContextMenus();
});

registerContextMenus();

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_FORCE_SHOW || !tab) return;
  void forceShowOnTab(tab);
});

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.action === EXTENSION_MESSAGE.AUTH_TOKEN && typeof message.token === "string") {
    const updates: Record<string, string> = { [STORAGE_KEYS.authToken]: message.token };
    if (typeof message.apiBaseUrl === "string" && message.apiBaseUrl.startsWith("http")) {
      updates[STORAGE_KEYS.apiBaseUrl] = message.apiBaseUrl.replace(/\/$/, "");
    }
    void chrome.storage.local.set(updates).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (
    message?.action === EXTENSION_MESSAGE.START_APPLY &&
    typeof message.jobId === "string" &&
    typeof message.url === "string"
  ) {
    void startApplyFromDashboard(message.jobId, message.url).then(sendResponse);
    return true;
  }

  return false;
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const action = message?.action as string | undefined;

  if (action === EXTENSION_MESSAGE.AUTH_TOKEN && typeof message.token === "string") {
    const updates: Record<string, string> = { [STORAGE_KEYS.authToken]: message.token };
    if (typeof message.apiBaseUrl === "string" && message.apiBaseUrl.startsWith("http")) {
      updates[STORAGE_KEYS.apiBaseUrl] = message.apiBaseUrl.replace(/\/$/, "");
    }
    void chrome.storage.local.set(updates).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (action === EXTENSION_MESSAGE.GET_AUTH) {
    void getAuthToken().then((token) => sendResponse({ token }));
    return true;
  }

  if (action === EXTENSION_MESSAGE.OPEN_LOGIN) {
    void openLoginBridge().then(() => sendResponse({ success: true }));
    return true;
  }

  if (action === EXTENSION_MESSAGE.OPEN_DASHBOARD && typeof message.path === "string") {
    void openDashboardPath(message.path).then(sendResponse);
    return true;
  }

  if (action === EXTENSION_MESSAGE.GET_CONFIG) {
    void loadRuntimeConfig()
      .then((config) => sendResponse({ success: true, config }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }

  if (action === EXTENSION_MESSAGE.GET_RESUME_PROFILES) {
    void apiFetch<import("@shared/extension/types").ExtensionResumeProfilesResponse>(
      "/api/extension/resume-profiles",
    )
      .then((data) => {
        if (!data?.success || !Array.isArray(data.profiles)) {
          sendResponse({
            success: false,
            error: data?.error ?? "Could not load resume profiles",
            profiles: [],
          });
          return;
        }
        sendResponse(data);
      })
      .catch(() => sendResponse({ success: false, error: "Network error", profiles: [] }));
    return true;
  }

  if (action === EXTENSION_MESSAGE.JOB_STATUS && typeof message.url === "string") {
    void apiFetch<JobStatusResponse>(
      `/api/extension/jobs?url=${encodeURIComponent(message.url)}`,
    )
      .then((data) => sendResponse(data))
      .catch(() => sendResponse({ success: false, saved: false, error: "Network error" }));
    return true;
  }

  if (action === EXTENSION_MESSAGE.SAVE_JOB && message.payload) {
    void apiFetch<JobStatusResponse>("/api/extension/jobs", {
      method: "POST",
      body: JSON.stringify(message.payload as JobSavePayload),
    })
      .then((data) => sendResponse(data))
      .catch(() => sendResponse({ success: false, saved: false, error: "Network error" }));
    return true;
  }

  if (action === EXTENSION_MESSAGE.RUN_PIPELINE && message.payload) {
    void apiFetch<JobStatusResponse & { phases?: string[]; pendingPhase?: string | null }>(
      "/api/extension/jobs/pipeline",
      {
        method: "POST",
        body: JSON.stringify(message.payload as JobSavePayload),
      },
    )
      .then((data) => sendResponse(data))
      .catch(() => sendResponse({ success: false, saved: false, error: "Network error" }));
    return true;
  }

  if (action === EXTENSION_MESSAGE.GET_FILL_DATA && typeof message.entryId === "string") {
    void apiFetch<{ success: boolean; fillData?: unknown; error?: string }>(
      `/api/extension/jobs/${encodeURIComponent(message.entryId)}/fill-data`,
    )
      .then((data) => sendResponse(data))
      .catch(() => sendResponse({ success: false, error: "Network error" }));
    return true;
  }

  if (action === EXTENSION_MESSAGE.GET_RESUME_PDF && typeof message.entryId === "string") {
    void apiFetchBinary(
      `/api/extension/jobs/${encodeURIComponent(message.entryId)}/resume-pdf`,
    )
      .then((data) => sendResponse(data))
      .catch(() => sendResponse({ success: false, error: "Network error" }));
    return true;
  }

  if (action === EXTENSION_MESSAGE.GET_COVER_LETTER_PDF && typeof message.entryId === "string") {
    void apiFetchBinary(
      `/api/extension/jobs/${encodeURIComponent(message.entryId)}/cover-letter-pdf`,
    )
      .then((data) => sendResponse(data))
      .catch(() => sendResponse({ success: false, error: "Network error" }));
    return true;
  }

  if (
    action === EXTENSION_MESSAGE.GET_APPLICATION_ANSWERS &&
    typeof message.platform === "string"
  ) {
    const params = new URLSearchParams({ platform: message.platform });
    if (typeof message.tenantHost === "string" && message.tenantHost) {
      params.set("tenantHost", message.tenantHost);
    }
    void apiFetch<{ success: boolean; answers?: unknown; error?: string }>(
      `/api/extension/application-answers?${params.toString()}`,
    )
      .then((data) => sendResponse(data))
      .catch(() => sendResponse({ success: false, answers: {}, error: "Network error" }));
    return true;
  }

  if (action === EXTENSION_MESSAGE.CAPTURE_APPLICATION_ANSWERS && message.payload) {
    const payload = message.payload as FieldCapturePayload;
    const jobEntryId =
      typeof message.jobEntryId === "string" && message.jobEntryId.trim()
        ? message.jobEntryId.trim()
        : undefined;
    const events = fieldCapturePayloadToEvents(payload, jobEntryId);

    if (events.length === 0) {
      sendResponse({ success: true, upserted: 0 });
      return true;
    }

    void apiFetch<{ success: boolean; upserted?: number; error?: string }>(
      "/api/extension/application-answers/capture",
      {
        method: "POST",
        body: JSON.stringify({ events }),
      },
    )
      .then((data) => sendResponse(data))
      .catch(() => sendResponse({ success: false, error: "Network error" }));
    return true;
  }

  if (action === EXTENSION_MESSAGE.COMPLETE_AUTOFILL && typeof message.entryId === "string") {
    void apiFetch<{ success: boolean; id?: string; status?: string; error?: string }>(
      `/api/extension/jobs/${encodeURIComponent(message.entryId)}/autofill-complete`,
      {
        method: "POST",
        body: JSON.stringify({
          stub: message.stub !== false,
          note: typeof message.note === "string" ? message.note : undefined,
        }),
      },
    )
      .then((data) => sendResponse(data))
      .catch(() => sendResponse({ success: false, error: "Network error" }));
    return true;
  }

  if (
    action === EXTENSION_MESSAGE.UPDATE_USER_PREFS &&
    (typeof message.autoApplyUserSwitch === "boolean" ||
      (message.applicationProfile != null &&
        typeof message.applicationProfile === "object" &&
        !Array.isArray(message.applicationProfile)))
  ) {
    const body: Record<string, unknown> = {};
    if (typeof message.autoApplyUserSwitch === "boolean") {
      body.autoApplyUserSwitch = message.autoApplyUserSwitch;
    }
    if (
      message.applicationProfile != null &&
      typeof message.applicationProfile === "object" &&
      !Array.isArray(message.applicationProfile)
    ) {
      body.applicationProfile = message.applicationProfile;
    }
    void apiFetch<{
      success: boolean;
      autoApplyUserSwitch?: boolean;
      applicationProfile?: unknown;
      error?: string;
    }>("/api/extension/user-prefs", {
      method: "PATCH",
      body: JSON.stringify(body),
    })
      .then((data) => sendResponse(data))
      .catch(() => sendResponse({ success: false, error: "Network error" }));
    return true;
  }

  if (action === EXTENSION_MESSAGE.FORCE_SHOW_CARD && message.tabId) {
    void chrome.tabs
      .get(message.tabId as number)
      .then((tab) => forceShowOnTab(tab))
      .then(() => sendResponse({ success: true }))
      .catch((error: Error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (
    action === EXTENSION_MESSAGE.MARK_APPLIED &&
    typeof message.entryId === "string"
  ) {
    void apiFetch<{ success: boolean; id?: string; status?: string; error?: string }>(
      `/api/extension/jobs/${encodeURIComponent(message.entryId)}/mark-applied`,
      {
        method: "POST",
        body: JSON.stringify({
          source: message.source === "extension_auto" ? "extension_auto" : "extension_manual",
        }),
      },
    )
      .then((data) => sendResponse(data))
      .catch(() => sendResponse({ success: false, error: "Network error" }));
    return true;
  }

  if (
    action === EXTENSION_MESSAGE.START_APPLY &&
    typeof message.jobId === "string" &&
    typeof message.url === "string"
  ) {
    void startApplyFromDashboard(message.jobId, message.url).then(sendResponse);
    return true;
  }

  return false;
});

void loadRuntimeConfig().catch(() => {
  // Config loads when content script starts.
});

console.log("EasySubmit: background ready");
