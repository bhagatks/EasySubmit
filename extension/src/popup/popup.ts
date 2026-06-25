import { EXTENSION_MESSAGE } from "@shared/extension/constants";
import type { ExtensionRuntimeConfig } from "@shared/extension/types";

const statusEl = document.getElementById("status")!;
const showCardBtn = document.getElementById("show-card") as HTMLButtonElement;
const openTrackerBtn = document.getElementById("open-tracker") as HTMLButtonElement;
const oneClickRow = document.getElementById("one-click-row")!;
const oneClickToggle = document.getElementById("one-click-toggle") as HTMLInputElement;
const connectBtn = document.getElementById("connect") as HTMLButtonElement;
const reconnectBtn = document.getElementById("reconnect") as HTMLButtonElement;

let prefsBusy = false;

function setStatus(message: string): void {
  statusEl.textContent = message;
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
    throw new Error("Open a job site tab first — this page cannot show the card.");
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

async function refreshAuthState(): Promise<void> {
  const auth = await chrome.runtime.sendMessage({ action: EXTENSION_MESSAGE.GET_AUTH });
  const token = (auth as { token?: string | null } | undefined)?.token;

  if (!token) {
    connectBtn.classList.remove("hidden");
    reconnectBtn.classList.add("hidden");
    oneClickRow.classList.add("hidden");
    setStatus("Not connected — connect the same account you use on the dashboard.");
    return;
  }

  connectBtn.classList.add("hidden");
  reconnectBtn.classList.remove("hidden");
  oneClickRow.classList.remove("hidden");

  const configRes = (await chrome.runtime.sendMessage({
    action: EXTENSION_MESSAGE.GET_CONFIG,
  })) as { success?: boolean; config?: ExtensionRuntimeConfig };

  const config = configRes.config;
  const autoApplyEnabled = config?.autoApplyEnabled !== false;
  oneClickToggle.checked = autoApplyEnabled && (config?.autoApplyUserSwitch ?? true);
  oneClickToggle.disabled = !autoApplyEnabled || prefsBusy;
  oneClickRow.classList.toggle("hidden", !autoApplyEnabled);

  const email = config?.connectedUser?.email;
  if (email) {
    setStatus(`Connected as ${email}. If saves are missing on the dashboard, click Reconnect.`);
    return;
  }

  setStatus("Connected. Reconnect if Job Tracker stays empty on the dashboard.");
}

showCardBtn.addEventListener("click", () => {
  void (async () => {
    showCardBtn.disabled = true;
    setStatus("Showing job card on this page…");

    try {
      const result = await sendToActiveTab<{
        success?: boolean;
        error?: string;
        title?: string;
        jobDetected?: boolean;
      }>({
        action: EXTENSION_MESSAGE.FORCE_SHOW_CARD,
      });

      if (result?.success) {
        if (result.jobDetected === false) {
          setStatus("Job card opened — job not detected on this page.");
        } else {
          setStatus(
            result.title
              ? `Job card visible: ${result.title}`
              : "Job card is now visible on this page.",
          );
        }
      } else {
        setStatus(result?.error ?? "Could not show the job card on this page.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not reach this tab.");
    } finally {
      showCardBtn.disabled = false;
      void refreshAuthState();
    }
  })();
});

openTrackerBtn.addEventListener("click", () => {
  void chrome.runtime.sendMessage({
    action: EXTENSION_MESSAGE.OPEN_DASHBOARD,
    path: "/dashboard/job-tracker",
  });
});

oneClickToggle.addEventListener("change", () => {
  void (async () => {
    if (prefsBusy) return;
    prefsBusy = true;
    oneClickToggle.disabled = true;
    const enabled = oneClickToggle.checked;

    try {
      const result = (await chrome.runtime.sendMessage({
        action: EXTENSION_MESSAGE.UPDATE_USER_PREFS,
        autoApplyUserSwitch: enabled,
      })) as { success?: boolean; error?: string };

      if (!result?.success) {
        oneClickToggle.checked = !enabled;
        setStatus(result?.error ?? "Could not update one-click apply setting.");
        return;
      }

      setStatus(
        enabled
          ? "One-click apply enabled for Workday job pages."
          : "One-click apply off — the card will save jobs only.",
      );
    } catch (error) {
      oneClickToggle.checked = !enabled;
      setStatus(error instanceof Error ? error.message : "Could not update setting.");
    } finally {
      prefsBusy = false;
      oneClickToggle.disabled = false;
      void refreshAuthState();
    }
  })();
});

function openConnectFlow(): void {
  void chrome.runtime.sendMessage({ action: EXTENSION_MESSAGE.OPEN_LOGIN });
}

connectBtn.addEventListener("click", openConnectFlow);
reconnectBtn.addEventListener("click", openConnectFlow);

void (async () => {
  await refreshAuthState();

  const tab = await getActiveTab();
  if (isRestrictedUrl(tab?.url)) {
    return;
  }

  try {
    const ping = await sendToActiveTab<{ ready?: boolean }>({ action: EXTENSION_MESSAGE.PING });
    if (ping?.ready && statusEl.textContent?.includes("Connected")) {
      return;
    }
    if (ping?.ready) {
      setStatus(`${statusEl.textContent ?? "Connected."} Ready on this tab.`);
    }
  } catch {
    // Tab message optional — auth status already shown.
  }
})();
