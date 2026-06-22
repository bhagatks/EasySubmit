import { JOB_CARD_WIDTH } from "./card-position";

export type StageNudgeVariant = "capture" | "captured";

export type PipelineUiMode = "auto" | "manual";

export type ManualPipelineStep = 1 | 2 | 3;

function renderPipelineSteps(activeStep: ManualPipelineStep, labels: [string, string, string]): string {
  const steps = labels.map((label, index) => {
    const stepNum = (index + 1) as ManualPipelineStep;
    const active = stepNum === activeStep ? " active" : "";
    return `
      <div class="pipe-step${active}">
        <span class="pipe-dot"></span>
        <span class="pipe-label">${label}</span>
      </div>
    `;
  });

  return `
    <div class="nudge-pipeline" aria-hidden="true">
      ${steps[0]}
      <div class="pipe-line"></div>
      ${steps[1]}
      <div class="pipe-line"></div>
      ${steps[2]}
    </div>
  `;
}

export type StageNudgeRenderOptions = {
  mode?: PipelineUiMode;
  manualStep?: ManualPipelineStep;
};

/** Transparent glossy shell wrapping the two inner white cards (job + stage nudge). */
export function glossyShellStyles(): string {
  return `
    .glossy-stack {
      box-sizing: border-box;
      width: ${JOB_CARD_WIDTH}px;
      position: relative;
    }
    .glossy-shell {
      position: relative;
      padding: 7px;
      border-radius: 16px;
      overflow: visible;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(22px) saturate(1.45);
      -webkit-backdrop-filter: blur(22px) saturate(1.45);
      border: 1px solid rgba(255, 255, 255, 0.52);
      box-shadow:
        0 10px 36px rgba(15, 23, 42, 0.14),
        inset 0 1px 0 rgba(255, 255, 255, 0.72),
        inset 0 -1px 0 rgba(255, 255, 255, 0.18);
    }
    .glossy-shell.is-live {
      animation: shell-glow 3.4s ease-in-out infinite;
    }
    .glossy-shell-sheen {
      pointer-events: none;
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background:
        radial-gradient(ellipse 95% 60% at 50% -8%, rgba(18, 179, 209, 0.16), transparent 58%),
        radial-gradient(ellipse 80% 50% at 50% 108%, rgba(255, 255, 255, 0.22), transparent 62%);
    }
    .glossy-shell-shimmer {
      pointer-events: none;
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(
        108deg,
        transparent 38%,
        rgba(255, 255, 255, 0.28) 50%,
        transparent 62%
      );
      transform: translateX(-130%);
      animation: shell-shimmer 5s ease-in-out infinite;
    }
    .glossy-cards {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow: visible;
    }
    .white-card {
      box-sizing: border-box;
      width: 100%;
      overflow: visible;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(255, 255, 255, 0.95);
      border-radius: 12px;
      box-shadow:
        0 4px 14px rgba(15, 23, 42, 0.07),
        inset 0 1px 0 rgba(255, 255, 255, 1);
    }
    @keyframes shell-glow {
      0%, 100% {
        box-shadow:
          0 10px 36px rgba(15, 23, 42, 0.14),
          inset 0 1px 0 rgba(255, 255, 255, 0.72),
          0 0 0 rgba(18, 179, 209, 0);
      }
      50% {
        box-shadow:
          0 12px 40px rgba(18, 179, 209, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.85),
          0 0 24px rgba(18, 179, 209, 0.08);
      }
    }
    @keyframes shell-shimmer {
      0%, 40% { transform: translateX(-130%); }
      100% { transform: translateX(130%); }
    }
  `;
}

export function stageNudgeStyles(): string {
  return `
    .stage-nudge {
      box-sizing: border-box;
      width: 100%;
      position: relative;
      border: none;
      padding: 0;
      text-align: left;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      animation: nudge-enter 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .stage-nudge.capture { cursor: pointer; overflow: hidden; }
    .stage-nudge.capture:hover { transform: translateY(-1px); }
    .stage-nudge.capture:active { transform: translateY(0); }
    .stage-nudge.captured { cursor: default; animation: nudge-enter 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
    .stage-nudge.captured:hover { transform: none; }
    .nudge-sheen {
      pointer-events: none;
      position: absolute;
      inset: 0;
      border-radius: 12px;
      background: linear-gradient(
        105deg,
        transparent 36%,
        rgba(18, 179, 209, 0.08) 50%,
        transparent 64%
      );
      transform: translateX(-120%);
      animation: nudge-sheen 4.2s ease-in-out infinite;
    }
    .nudge-inner {
      position: relative;
      z-index: 1;
      display: flex;
      gap: 12px;
      padding: 12px 12px 11px;
      align-items: flex-start;
    }
    .nudge-visual {
      flex-shrink: 0;
      width: 52px;
      height: 52px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .orbit-ring {
      position: absolute;
      inset: 0;
      animation: orbit-spin 6s linear infinite;
    }
    .orbit-dot {
      position: absolute;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #12B3D1;
      box-shadow: 0 0 10px rgba(18, 179, 209, 0.85);
    }
    .orbit-dot.d1 { top: 2px; left: 50%; transform: translateX(-50%); animation: dot-pulse 1.6s ease-in-out infinite; }
    .orbit-dot.d2 { bottom: 8px; right: 4px; animation: dot-pulse 1.6s ease-in-out 0.35s infinite; }
    .orbit-dot.d3 { bottom: 8px; left: 4px; animation: dot-pulse 1.6s ease-in-out 0.7s infinite; }
    .nudge-icon-wrap {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(18, 179, 209, 0.1);
      border: 1px solid rgba(18, 179, 209, 0.28);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: icon-float 2.8s ease-in-out infinite;
    }
    .nudge-icon-wrap svg { width: 20px; height: 20px; color: #12B3D1; }
    .nudge-spark {
      position: absolute;
      top: 6px;
      right: 8px;
      font-size: 14px;
      color: #12B3D1;
      animation: spark-pop 2.2s ease-in-out infinite;
    }
    .nudge-copy { flex: 1; min-width: 0; }
    .nudge-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #0E7490;
      margin-bottom: 4px;
    }
    .nudge-eyebrow .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #12B3D1;
      box-shadow: 0 0 0 0 rgba(18, 179, 209, 0.6);
      animation: live-pulse 2s ease-out infinite;
    }
    .nudge-title {
      margin: 0 0 4px;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.35;
      color: #1F2937;
    }
    .nudge-sub {
      margin: 0;
      font-size: 11px;
      line-height: 1.45;
      color: #64748B;
    }
    .nudge-pipeline {
      display: flex;
      align-items: center;
      gap: 0;
      margin-top: 10px;
      padding-top: 9px;
      border-top: 1px solid rgba(18, 179, 209, 0.16);
    }
    .pipe-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      flex: 0 0 auto;
    }
    .pipe-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #E5E7EB;
      border: 1px solid #D1D5DB;
    }
    .pipe-step.active .pipe-dot {
      background: #12B3D1;
      border-color: #67E8F9;
      box-shadow: 0 0 10px rgba(18, 179, 209, 0.55);
      animation: pipe-glow 1.8s ease-in-out infinite;
    }
    .pipe-label {
      font-size: 9px;
      font-weight: 600;
      color: #9CA3AF;
      letter-spacing: 0.02em;
    }
    .pipe-step.active .pipe-label { color: #0E7490; }
    .pipe-line {
      flex: 1;
      height: 2px;
      margin: 0 4px 12px;
      border-radius: 999px;
      background: #E5E7EB;
      position: relative;
      overflow: hidden;
    }
    .pipe-line::after {
      content: "";
      position: absolute;
      inset: 0;
      width: 40%;
      background: linear-gradient(90deg, transparent, #12B3D1, transparent);
      animation: pipe-flow 2.4s ease-in-out infinite;
    }
    .nudge-hint {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 600;
      color: #12B3D1;
      animation: hint-bounce 2s ease-in-out infinite;
    }
    .nudge-hint svg { width: 12px; height: 12px; }
    .captured .nudge-visual { width: 44px; height: 44px; }
    .captured .nudge-icon-wrap { animation: none; }
    .captured .nudge-eyebrow .live-dot {
      animation: none;
      box-shadow: none;
    }
    .captured .nudge-title { font-size: 12px; }
    .check-pop {
      animation: check-pop 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes nudge-enter {
      from { opacity: 0; transform: translateY(14px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes nudge-sheen {
      0%, 35% { transform: translateX(-120%); }
      100% { transform: translateX(120%); }
    }
    @keyframes orbit-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes dot-pulse {
      0%, 100% { transform: scale(1); opacity: 0.85; }
      50% { transform: scale(1.25); opacity: 1; }
    }
    @keyframes icon-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    @keyframes spark-pop {
      0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.85; }
      50% { transform: scale(1.2) rotate(12deg); opacity: 1; }
    }
    @keyframes live-pulse {
      0% { box-shadow: 0 0 0 0 rgba(18, 179, 209, 0.55); }
      70% { box-shadow: 0 0 0 7px rgba(18, 179, 209, 0); }
      100% { box-shadow: 0 0 0 0 rgba(18, 179, 209, 0); }
    }
    @keyframes pipe-glow {
      0%, 100% { box-shadow: 0 0 6px rgba(18, 179, 209, 0.35); }
      50% { box-shadow: 0 0 12px rgba(18, 179, 209, 0.7); }
    }
    @keyframes pipe-flow {
      0% { transform: translateX(-100%); opacity: 0; }
      30% { opacity: 1; }
      100% { transform: translateX(260%); opacity: 0; }
    }
    @keyframes hint-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-2px); }
    }
    @keyframes check-pop {
      from { transform: scale(0.6); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `;
}

const DOCUMENT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>`;

const CHECK_ICON = `<svg class="check-pop" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

export function renderStageNudgeMarkup(
  variant: StageNudgeVariant,
  options?: StageNudgeRenderOptions,
): string {
  const mode = options?.mode ?? "auto";
  const manualStep = options?.manualStep ?? 1;

  if (mode === "manual") {
    if (variant === "captured") {
      const stepCopy =
        manualStep === 2
          ? {
              eyebrow: "Step 2 · Update resume",
              title: "Tailor your resume for this role",
              sub: "Open Resume profiles, enhance with AI using this job description, then return to apply.",
              hint: "Continue in dashboard →",
            }
          : manualStep >= 3
            ? {
                eyebrow: "Step 3 · Apply",
                title: "Finish the application on this site",
                sub: "Your resume is ready — complete the Workday form and submit when you&apos;re satisfied.",
                hint: "Apply on this page →",
              }
            : {
                eyebrow: "Step 1 complete",
                title: "Saved to Job Tracker",
                sub: "Next: update your resume for this role, then apply on the job site.",
                hint: "",
              };

      return `
        <div class="stage-nudge captured white-card" data-stage-nudge="1" data-manual-step="${manualStep}">
          <div class="nudge-inner">
            <div class="nudge-visual">
              <div class="nudge-icon-wrap">${manualStep >= 3 ? CHECK_ICON : DOCUMENT_ICON}</div>
            </div>
            <div class="nudge-copy">
              <div class="nudge-eyebrow"><span class="live-dot"></span> ${stepCopy.eyebrow}</div>
              <p class="nudge-title">${stepCopy.title}</p>
              <p class="nudge-sub">${stepCopy.sub}</p>
              ${renderPipelineSteps(manualStep, ["Save", "Update resume", "Apply"])}
              ${stepCopy.hint ? `<span class="nudge-hint">${stepCopy.hint}</span>` : ""}
            </div>
          </div>
        </div>
      `;
    }

    return `
      <button type="button" class="stage-nudge capture white-card" data-stage-nudge="1" aria-label="Save this job to your tracker">
        <div class="nudge-sheen" aria-hidden="true"></div>
        <div class="nudge-inner">
          <div class="nudge-visual">
            <div class="orbit-ring" aria-hidden="true">
              <span class="orbit-dot d1"></span>
              <span class="orbit-dot d2"></span>
              <span class="orbit-dot d3"></span>
            </div>
            <div class="nudge-icon-wrap">${DOCUMENT_ICON}</div>
            <span class="nudge-spark" aria-hidden="true">✦</span>
          </div>
          <div class="nudge-copy">
            <div class="nudge-eyebrow"><span class="live-dot"></span> Manual apply · Step 1</div>
            <p class="nudge-title">Save to Job Tracker</p>
            <p class="nudge-sub">Three steps: save this role, update your resume in the dashboard, then apply here.</p>
            ${renderPipelineSteps(1, ["Save", "Update resume", "Apply"])}
            <span class="nudge-hint">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              Tap Save to Tracker
            </span>
          </div>
        </div>
      </button>
    `;
  }

  if (variant === "captured") {
    return `
      <button type="button" class="stage-nudge captured white-card" data-stage-nudge="1" aria-label="Job captured — resume tailoring unlocks next">
        <div class="nudge-inner">
          <div class="nudge-visual">
            <div class="nudge-icon-wrap">${CHECK_ICON}</div>
          </div>
          <div class="nudge-copy">
            <div class="nudge-eyebrow"><span class="live-dot"></span> Step 1 complete</div>
            <p class="nudge-title">Job captured — you&apos;re in the pipeline</p>
            <p class="nudge-sub">Resume tailoring &amp; autofill unlock automatically in the next phase.</p>
          </div>
        </div>
      </button>
    `;
  }

  return `
    <button type="button" class="stage-nudge capture white-card" data-stage-nudge="1" aria-label="Add this job to tailor your resume">
      <div class="nudge-sheen" aria-hidden="true"></div>
      <div class="nudge-inner">
        <div class="nudge-visual">
          <div class="orbit-ring" aria-hidden="true">
            <span class="orbit-dot d1"></span>
            <span class="orbit-dot d2"></span>
            <span class="orbit-dot d3"></span>
          </div>
          <div class="nudge-icon-wrap">${DOCUMENT_ICON}</div>
          <span class="nudge-spark" aria-hidden="true">✦</span>
        </div>
        <div class="nudge-copy">
          <div class="nudge-eyebrow"><span class="live-dot"></span> Step 1 · Capture</div>
          <p class="nudge-title">Add this job to tailor your resume</p>
          <p class="nudge-sub">Save this role now — we&apos;ll match your experience and prep an ATS-ready resume next.</p>
          <div class="nudge-pipeline" aria-hidden="true">
            <div class="pipe-step active">
              <span class="pipe-dot"></span>
              <span class="pipe-label">Job</span>
            </div>
            <div class="pipe-line"></div>
            <div class="pipe-step">
              <span class="pipe-dot"></span>
              <span class="pipe-label">Tailor</span>
            </div>
            <div class="pipe-line"></div>
            <div class="pipe-step">
              <span class="pipe-dot"></span>
              <span class="pipe-label">Apply</span>
            </div>
          </div>
          <span class="nudge-hint">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
            Tap to save &amp; start
          </span>
        </div>
      </div>
    </button>
  `;
}

export function bindStageNudge(
  root: ParentNode,
  options: {
    saved: boolean;
    onCapture: () => void;
    onManualStep?: (step: ManualPipelineStep) => void;
  },
): void {
  const nudge = root.querySelector("[data-stage-nudge]") as HTMLElement | null;
  if (!nudge) return;

  if (options.saved) {
    nudge.addEventListener("click", (event) => {
      event.stopPropagation();
      const step = Number(nudge.getAttribute("data-manual-step") || "2") as ManualPipelineStep;
      options.onManualStep?.(step >= 2 ? step : 2);
    });
    return;
  }

  nudge.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();
    options.onCapture();
  });
}
