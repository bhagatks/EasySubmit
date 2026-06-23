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

async function loadRuntimeConfig(): Promise<ExtensionRuntimeConfig> {
  const base = (await getApiBase()).replace(/\/$/, "");
  const data = await apiFetch<ExtensionRuntimeConfig & { success?: boolean }>(
    "/api/extension/config",
  );
  // Pin to the host we actually reached — do not drift to NEXT_PUBLIC_APP_URL from the body.
  await chrome.storage.local.set({ [STORAGE_KEYS.apiBaseUrl]: base });
  return {
    jobCardEnabled: Boolean(data.jobCardEnabled),
    enabledPlatforms: data.enabledPlatforms ?? ["generic"],
    genericFallbackEnabled: data.genericFallbackEnabled ?? true,
    minConfidence: data.minConfidence ?? 55,
    apiBaseUrl: base,
    oneClickApply: data.oneClickApply ?? true,
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

  const tabs = await chrome.tabs.query({});
  const existing = tabs.find((tab) => tab.url && jobUrlsMatch(tab.url, url));

  if (existing?.id) {
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId != null) {
      await chrome.windows.update(existing.windowId, { focused: true });
    }
    await notifyTabStartApply(existing.id, jobId, url);
    return { success: true };
  }

  const created = await chrome.tabs.create({ url, active: true });
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
    typeof message.oneClickApply === "boolean"
  ) {
    void apiFetch<{ success: boolean; oneClickApply?: boolean; error?: string }>(
      "/api/extension/user-prefs",
      {
        method: "PATCH",
        body: JSON.stringify({ oneClickApply: message.oneClickApply }),
      },
    )
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
