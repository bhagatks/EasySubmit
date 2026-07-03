import {
  emptyPipelineDebugProgress,
  PIPELINE_DEBUG_STEP_DEFS,
  type PipelineDebugProgress,
  type PipelineDebugStep,
  type PipelineDebugStepStatus,
} from "@shared/extension/pipeline-debug-types";
import { isPipelineDebugEnabled } from "@shared/extension/pipeline-debug-gate";

/** Dev-only — always on in dev, never in production. */
export function isPipelineDebugOverlayEnabled(): boolean {
  return isPipelineDebugEnabled();
}

const POLL_MS = 800;
const MAX_POLL_MS = 180_000;

type PipelineDebugOverlayHost = {
  root: HTMLElement;
  shadow: ShadowRoot;
  pollTimer: number | null;
};

let host: PipelineDebugOverlayHost | null = null;

function statusIcon(status: PipelineDebugStepStatus): string {
  switch (status) {
    case "done":
      return "✓";
    case "active":
      return "◉";
    case "error":
      return "✕";
    case "skipped":
      return "–";
    case "warning":
      return "!";
    default:
      return "○";
  }
}

function statusClass(status: PipelineDebugStepStatus): string {
  return `step-status step-${status}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMeta(meta: Record<string, unknown> | undefined): string {
  if (!meta || Object.keys(meta).length === 0) return "";
  try {
    return JSON.stringify(meta, null, 2);
  } catch {
    return "";
  }
}

function overlayStyles(): string {
  return `
    :host {
      all: initial;
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      pointer-events: none;
      font-family: "SF Mono", "Fira Code", ui-monospace, monospace;
    }
    .panel {
      pointer-events: auto;
      position: fixed;
      top: 12px;
      right: 12px;
      width: min(420px, calc(100vw - 24px));
      max-height: calc(100vh - 24px);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border-radius: 14px;
      border: 1px solid rgba(99, 130, 255, 0.45);
      background: rgba(12, 16, 32, 0.94);
      color: #e8ecff;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(12px);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      flex: 0 0 auto;
    }
    .title {
      margin: 0;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #9db4ff;
    }
    .trace {
      margin: 2px 0 0;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.45);
      word-break: break-all;
    }
    .close {
      border: none;
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      border-radius: 8px;
      width: 28px;
      height: 28px;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
    }
    .close:hover { background: rgba(255, 255, 255, 0.16); }
    .body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
      padding: 8px 0 12px;
    }
    .group {
      padding: 6px 14px 2px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(157, 180, 255, 0.75);
    }
    .step {
      padding: 8px 14px;
      border-left: 3px solid transparent;
    }
    .step.active { border-left-color: #6382ff; background: rgba(99, 130, 255, 0.08); }
    .step.done { border-left-color: #34d399; }
    .step.warning { border-left-color: #fbbf24; background: rgba(251, 191, 36, 0.08); }
    .step.error { border-left-color: #f87171; background: rgba(248, 113, 113, 0.08); }
    .step.skipped { opacity: 0.65; }
    .step-head {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .step-status {
      flex: 0 0 16px;
      font-size: 12px;
      line-height: 1.3;
    }
    .step-status.step-active { color: #6382ff; animation: pulse 1.2s ease-in-out infinite; }
    .step-status.step-done { color: #34d399; }
    .step-status.step-warning { color: #fbbf24; }
    .step-status.step-error { color: #f87171; }
    .step-status.step-skipped { color: rgba(255,255,255,0.35); }
    .step-status.step-pending { color: rgba(255,255,255,0.25); }
    .step-label {
      font-size: 12px;
      font-weight: 600;
      color: #f3f4ff;
    }
    .step-desc {
      margin: 2px 0 0;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.45);
      line-height: 1.35;
    }
    .step-detail {
      margin: 4px 0 0 24px;
      font-size: 11px;
      color: #c7d2fe;
      line-height: 1.35;
    }
    .step-meta {
      margin: 4px 0 0 24px;
      padding: 6px 8px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.25);
      font-size: 9px;
      color: rgba(199, 210, 254, 0.85);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 120px;
      overflow: auto;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.45; }
    }
  `;
}

function renderStep(step: PipelineDebugStep): string {
  const meta = formatMeta(step.meta);
  return `
    <div class="step ${step.status}">
      <div class="step-head">
        <span class="${statusClass(step.status)}">${statusIcon(step.status)}</span>
        <div>
          <div class="step-label">${escapeHtml(step.label)}</div>
          <div class="step-desc">${escapeHtml(step.description)}</div>
        </div>
      </div>
      ${step.detail ? `<div class="step-detail">${escapeHtml(step.detail)}</div>` : ""}
      ${meta ? `<pre class="step-meta">${escapeHtml(meta)}</pre>` : ""}
    </div>
  `;
}

function renderStepListHtml(steps: PipelineDebugStep[]): string {
  let currentGroup = "";
  return steps
    .map((step) => {
      const groupHeader =
        step.group !== currentGroup
          ? ((currentGroup = step.group), `<div class="group">${escapeHtml(step.group)}</div>`)
          : "";
      return `${groupHeader}${renderStep(step)}`;
    })
    .join("");
}

function resolveSteps(
  progress: PipelineDebugProgress | null,
  localSteps?: PipelineDebugStep[],
): PipelineDebugStep[] {
  return progress?.steps ?? localSteps ?? [];
}

function renderShell(traceId: string, stepHtml: string): string {
  return `
    <style>${overlayStyles()}</style>
    <div class="panel" role="dialog" aria-label="Apply pipeline debug">
      <div class="header">
        <div>
          <p class="title">Apply pipeline (QA)</p>
          <p class="trace" data-debug-trace>trace: ${escapeHtml(traceId)}</p>
        </div>
        <button type="button" class="close" data-debug-close="1" aria-label="Close">×</button>
      </div>
      <div class="body" data-debug-body>${stepHtml || "<div class='group'>Waiting…</div>"}</div>
    </div>
  `;
}

import { scheduleRestoreBodyScroll } from "@/lib/extension/pipeline-debug-overlay-scroll";
  shadow: ShadowRoot,
  progress: PipelineDebugProgress | null,
  localSteps?: PipelineDebugStep[],
): void {
  const steps = resolveSteps(progress, localSteps);
  const traceId = progress?.traceId ?? "pending…";
  const stepHtml = renderStepListHtml(steps);

  const existingBody = shadow.querySelector<HTMLElement>("[data-debug-body]");
  if (!existingBody) {
    shadow.innerHTML = renderShell(traceId, stepHtml);
    return;
  }

  const scrollTop = existingBody.scrollTop;
  existingBody.innerHTML = stepHtml || "<div class='group'>Waiting…</div>";
  scheduleRestoreBodyScroll(existingBody, scrollTop);

  const traceEl = shadow.querySelector("[data-debug-trace]");
  if (traceEl) {
    traceEl.textContent = `trace: ${traceId}`;
  }
}

function ensureHost(): PipelineDebugOverlayHost {
  if (host) return host;

  const root = document.createElement("div");
  root.id = "easysubmit-pipeline-debug-overlay";
  const shadow = root.attachShadow({ mode: "open" });
  document.documentElement.appendChild(root);

  shadow.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-debug-close]")) {
      hidePipelineDebugOverlay();
    }
  });

  host = { root, shadow, pollTimer: null };
  return host;
}

export function createLocalPipelineDebugSteps(): PipelineDebugStep[] {
  return PIPELINE_DEBUG_STEP_DEFS.map((def) => ({
    ...def,
    status: "pending" as const,
  }));
}

export function showPipelineDebugOverlay(
  initialSteps?: PipelineDebugStep[],
): PipelineDebugOverlayHost {
  const h = ensureHost();
  paintOverlayDom(h.shadow, null, initialSteps);
  h.root.style.display = "block";
  return h;
}

export function updatePipelineDebugOverlay(
  progress: PipelineDebugProgress | null,
  localSteps?: PipelineDebugStep[],
): void {
  if (!host) return;
  paintOverlayDom(host.shadow, progress, localSteps);
}

export function hidePipelineDebugOverlay(): void {
  if (!host) return;
  if (host.pollTimer !== null) {
    window.clearInterval(host.pollTimer);
    host.pollTimer = null;
  }
  host.root.remove();
  host = null;
}

export type PipelineDebugPollOptions = {
  entryId: string;
  fetchProgress: (entryId: string) => Promise<PipelineDebugProgress | null>;
  onTerminal?: () => void;
};

export function startPipelineDebugPolling(options: PipelineDebugPollOptions): void {
  if (!isPipelineDebugOverlayEnabled()) return;

  const h = ensureHost();
  const startedAt = Date.now();

  if (h.pollTimer !== null) {
    window.clearInterval(h.pollTimer);
  }

  const poll = async () => {
    try {
      const progress = await options.fetchProgress(options.entryId);
      updatePipelineDebugOverlay(progress);

      const terminal = progress?.steps.find((s) => s.id === "status_ready");
      if (
        terminal &&
        (terminal.status === "done" || terminal.status === "error")
      ) {
        if (h.pollTimer !== null) {
          window.clearInterval(h.pollTimer);
          h.pollTimer = null;
        }
        options.onTerminal?.();
      } else if (Date.now() - startedAt > MAX_POLL_MS) {
        if (h.pollTimer !== null) {
          window.clearInterval(h.pollTimer);
          h.pollTimer = null;
        }
      }
    } catch {
      // keep polling
    }
  };

  void poll();
  h.pollTimer = window.setInterval(() => void poll(), POLL_MS);
}

export function markLocalPipelineDebugStep(
  steps: PipelineDebugStep[],
  stepId: string,
  update: Partial<Pick<PipelineDebugStep, "status" | "detail" | "meta">>,
): PipelineDebugStep[] {
  return steps.map((step) =>
    step.id === stepId
      ? {
          ...step,
          ...update,
          meta: update.meta ? { ...(step.meta ?? {}), ...update.meta } : step.meta,
        }
      : step,
  );
}

export function localPipelineDebugProgress(
  traceId: string,
  steps: PipelineDebugStep[],
): PipelineDebugProgress {
  const base = emptyPipelineDebugProgress(traceId);
  return { ...base, steps };
}
