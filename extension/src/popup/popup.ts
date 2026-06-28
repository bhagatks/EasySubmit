import { BRAND } from "@shared/brand";
import { extensionPopupButtonCss } from "@shared/brand-buttons";
import { EXTENSION_MESSAGE } from "@shared/extension/constants";
import { isExtensionForceUpgradeRequired } from "@shared/extension/extension-force-upgrade";
import type { ExtensionJobStatsResponse, ExtensionRuntimeConfig } from "@shared/extension/types";
import { tabStatusLabel, type ExtensionTabStatusPayload } from "@shared/extension/tab-status";
import { AnalyticsEvents, captureAnalyticsEvent, trackScreenOverlay } from "@shared/analytics";

type PopupView = "disconnected" | "connected" | "force-upgrade";

const TAB_UNDETECTED_COPY = "Open a job listing to use the card";

const headerConnected = document.getElementById("header-connected")!;
const panelLoading = document.getElementById("panel-loading")!;
const panelDisconnected = document.getElementById("panel-disconnected")!;
const panelForceUpgrade = document.getElementById("panel-force-upgrade")!;
const panelConnected = document.getElementById("panel-connected")!;

const accountEmailEl = document.getElementById("account-email")!;
const reconnectBtn = document.getElementById("reconnect") as HTMLButtonElement;
const connectBtn = document.getElementById("connect") as HTMLButtonElement;
const upgradeMessageEl = document.getElementById("upgrade-message")!;
const upgradeExtensionBtn = document.getElementById("upgrade-extension") as HTMLButtonElement;
const tabStatusEl = document.getElementById("tab-status")!;
const showCardBtn = document.getElementById("show-card") as HTMLButtonElement;
const statsLineEl = document.getElementById("stats-line")!;

let headerRefreshBtn = document.getElementById("header-refresh") as HTMLButtonElement | null;

let forceUpgradeUpdateUrl = "/extension";

function hidePanelLoading(): void {
  panelLoading.classList.add("hidden");
  panelLoading.removeAttribute("aria-busy");
}

function applyBrandToPopup(): void {
  document.title = BRAND.extension.popupTitle;

  const style = document.createElement("style");
  style.textContent = extensionPopupButtonCss();
  document.head.appendChild(style);
}

applyBrandToPopup();
captureAnalyticsEvent(AnalyticsEvents.EXTENSION_POPUP_OPENED, {});
trackScreenOverlay("extension_popup", { route: "chrome-extension://popup" });

function truncateEmail(email: string, maxLen = 24): string {
  const trimmed = email.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

function setPopupView(view: PopupView): void {
  headerConnected.classList.toggle("hidden", view !== "connected" && view !== "force-upgrade");
  panelDisconnected.classList.toggle("hidden", view !== "disconnected");
  panelForceUpgrade.classList.toggle("hidden", view !== "force-upgrade");
  panelConnected.classList.toggle("hidden", view !== "connected");
}

function formatStatsLine(stats: ExtensionJobStatsResponse): string | null {
  if (!stats.success) return null;
  const captured = stats.captured ?? 0;
  const readyToApply = stats.readyToApply ?? 0;
  const total = stats.total ?? 0;
  if (captured === 0 && readyToApply === 0 && total === 0) return null;
  return `${captured} captured · ${readyToApply} ready · ${total} total`;
}

function renderStats(stats: ExtensionJobStatsResponse | null): void {
  const line = stats ? formatStatsLine(stats) : null;
  if (!line) {
    statsLineEl.classList.add("hidden");
    statsLineEl.textContent = "";
    return;
  }
  statsLineEl.textContent = line;
  statsLineEl.classList.remove("hidden");
}

function setTabStatus(message: string): void {
  tabStatusEl.textContent = message;
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
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

async function sendToActiveTab<T>(message: Record<string, unknown>): Promise<T> {
  const tab = await getActiveTab();
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }
  if (isRestrictedUrl(tab.url)) {
    throw new Error(TAB_UNDETECTED_COPY);
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    return chrome.tabs.sendMessage(tab.id, message);
  }
}

function openConnectFlow(): void {
  void chrome.runtime.sendMessage({ action: EXTENSION_MESSAGE.OPEN_LOGIN });
}

function openForceUpgradeUrl(url: string): void {
  if (/^https?:\/\//i.test(url)) {
    void chrome.tabs.create({ url });
    return;
  }
  void chrome.runtime.sendMessage({
    action: EXTENSION_MESSAGE.OPEN_DASHBOARD,
    path: url.startsWith("/") ? url : `/${url}`,
  });
}

function getExtensionVersion(): string {
  return chrome.runtime.getManifest().version;
}

async function fetchAuthToken(): Promise<string | null> {
  const auth = (await chrome.runtime.sendMessage({ action: EXTENSION_MESSAGE.GET_AUTH })) as
    | { token?: string | null }
    | undefined;
  const token = auth?.token;
  return typeof token === "string" && token.length > 0 ? token : null;
}

async function fetchRuntimeConfig(): Promise<ExtensionRuntimeConfig | null> {
  const configRes = (await chrome.runtime.sendMessage({
    action: EXTENSION_MESSAGE.GET_CONFIG,
  })) as { success?: boolean; config?: ExtensionRuntimeConfig };
  return configRes?.config ?? null;
}

async function fetchJobStats(): Promise<ExtensionJobStatsResponse | null> {
  const stats = (await chrome.runtime.sendMessage({
    action: EXTENSION_MESSAGE.GET_JOB_STATS,
  })) as ExtensionJobStatsResponse;
  return stats?.success ? stats : null;
}

function isStaleSession(config: ExtensionRuntimeConfig | null): boolean {
  return !config?.connectedUser?.email?.trim();
}

function renderForceUpgradePanel(config: ExtensionRuntimeConfig, email: string | null): void {
  setPopupView("force-upgrade");
  accountEmailEl.textContent = email ? truncateEmail(email) : "Connected";
  reconnectBtn.classList.add("hidden");

  upgradeMessageEl.textContent =
    config.forceUpgradeMessage?.trim() || "Update the EasySubmit extension to continue.";
  forceUpgradeUpdateUrl = config.forceUpgradeUpdateUrl?.trim() || "/extension";
}

function renderConnectedPanel(
  config: ExtensionRuntimeConfig,
  stats: ExtensionJobStatsResponse | null,
  initialTabStatus?: string | null,
): void {
  setPopupView("connected");

  const email = config.connectedUser?.email?.trim();
  accountEmailEl.textContent = email ? truncateEmail(email) : "Connected";
  reconnectBtn.classList.toggle("hidden", !isStaleSession(config));

  renderStats(stats);

  if (initialTabStatus) {
    setTabStatus(initialTabStatus);
    return;
  }

  void refreshThisTab();
}

async function resolveTabStatus(): Promise<string> {
  const tab = await getActiveTab();
  if (isRestrictedUrl(tab?.url)) {
    return TAB_UNDETECTED_COPY;
  }

  try {
    const ping = await sendToActiveTab<{ ready?: boolean }>({ action: EXTENSION_MESSAGE.PING });
    if (!ping?.ready) {
      return TAB_UNDETECTED_COPY;
    }

    const payload = await sendToActiveTab<ExtensionTabStatusPayload>({
      action: EXTENSION_MESSAGE.GET_TAB_STATUS,
    });

    const label = tabStatusLabel(payload).trim();
    return label || TAB_UNDETECTED_COPY;
  } catch {
    return TAB_UNDETECTED_COPY;
  }
}

async function refreshThisTab(): Promise<void> {
  setTabStatus("Checking this tab…");
  headerRefreshBtn?.classList.add("is-spinning");
  headerRefreshBtn?.setAttribute("disabled", "true");

  try {
    setTabStatus(await resolveTabStatus());
  } finally {
    headerRefreshBtn?.classList.remove("is-spinning");
    headerRefreshBtn?.removeAttribute("disabled");
  }
}

function openJobTracker(): void {
  void chrome.runtime.sendMessage({
    action: EXTENSION_MESSAGE.OPEN_DASHBOARD,
    path: "/dashboard/job-tracker",
  });
}

function openSettings(): void {
  void chrome.runtime.sendMessage({
    action: EXTENSION_MESSAGE.OPEN_DASHBOARD,
    path: "/dashboard/settings",
  });
}

async function bootstrapPopup(): Promise<void> {
  try {
    const token = await fetchAuthToken();
    if (!token) {
      hidePanelLoading();
      setPopupView("disconnected");
      return;
    }

    const [config, tabStatus] = await Promise.all([fetchRuntimeConfig(), resolveTabStatus()]);
    const runtimeConfig = config ?? {};

    hidePanelLoading();

    if (isExtensionForceUpgradeRequired(runtimeConfig, getExtensionVersion())) {
      const email = runtimeConfig.connectedUser?.email?.trim() ?? null;
      renderForceUpgradePanel(runtimeConfig, email);
      return;
    }

    renderConnectedPanel(runtimeConfig, null, tabStatus);
    void fetchJobStats().then((stats) => {
      if (stats) renderStats(stats);
    });
  } catch {
    hidePanelLoading();
    setPopupView("disconnected");
  }
}

showCardBtn.addEventListener("click", () => {
  captureAnalyticsEvent(AnalyticsEvents.EXTENSION_POPUP_SHOW_CARD, {});
  void (async () => {
    try {
      const result = await sendToActiveTab<{
        success?: boolean;
        error?: string;
      }>({
        action: EXTENSION_MESSAGE.FORCE_SHOW_CARD,
      });

      if (!result?.success) {
        setTabStatus(result?.error ?? "Could not show the job card on this page.");
        return;
      }

      await refreshThisTab();
    } catch (error) {
      setTabStatus(error instanceof Error ? error.message : TAB_UNDETECTED_COPY);
    }
  })();
});

document.getElementById("header-tracker")?.addEventListener("click", openJobTracker);
document.getElementById("header-settings")?.addEventListener("click", openSettings);
document.getElementById("header-close")?.addEventListener("click", () => window.close());
document.getElementById("header-refresh")?.addEventListener("click", () => {
  void refreshThisTab();
});

connectBtn.addEventListener("click", openConnectFlow);
reconnectBtn.addEventListener("click", openConnectFlow);
upgradeExtensionBtn.addEventListener("click", () => {
  openForceUpgradeUrl(forceUpgradeUpdateUrl);
});

void bootstrapPopup();
