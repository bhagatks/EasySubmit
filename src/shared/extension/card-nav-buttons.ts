import { extensionButtonClass } from "../brand-buttons";
import { CARD_NAV_LABELS } from "./card-layout-tokens";

const NAV_ICONS = {
  jobInfo: `<svg class="nav-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="nav-job-lid" d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><rect class="nav-job-body" x="2" y="7" width="20" height="14" rx="2"/></svg>`,
  resume: `<svg class="nav-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path class="nav-resume-line" style="--nav-line-i:0" d="M10 13H8"/><path class="nav-resume-line" style="--nav-line-i:1" d="M16 13H8"/><path class="nav-resume-line" style="--nav-line-i:2" d="M16 17H8"/></svg>`,
  coverLetter: `<svg class="nav-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path class="nav-cover-flap" d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
} as const;

type CardNavKey = keyof typeof NAV_ICONS;

function renderCardNavButton(attrs: string, key: CardNavKey): string {
  const label = CARD_NAV_LABELS[key];
  const iconClass =
    key === "jobInfo" ? "card-nav-icon--job" : key === "resume" ? "card-nav-icon--resume" : "card-nav-icon--cover";
  return `<button type="button" class="${extensionButtonClass("chip")} card-nav-btn" ${attrs} title="${label}" aria-label="${label}">
    <span class="card-nav-icon ${iconClass}">${NAV_ICONS[key]}</span>
    <span class="card-nav-label">${label}</span>
  </button>`;
}

export type CardNavRowInput = {
  showJobInfo: boolean;
  showResume: boolean;
  showCover: boolean;
};

export function renderCardNavRow(input: CardNavRowInput): string {
  const buttons: string[] = [];
  if (input.showJobInfo) {
    buttons.push(renderCardNavButton('data-open-job-detail="1"', "jobInfo"));
  }
  if (input.showResume) {
    buttons.push(renderCardNavButton('data-open-resume-preview="1"', "resume"));
  }
  if (input.showCover) {
    buttons.push(renderCardNavButton('data-open-cover-preview="1"', "coverLetter"));
  }
  if (buttons.length === 0) return "";
  return `<div class="card-nav-row" style="--es-nav-cols: ${buttons.length}">${buttons.join("")}</div>`;
}

export function cardNavButtonStyles(): string {
  return `
    .company-name {
      margin: 0;
      font-size: 13px;
      line-height: 1.35;
      color: #6B7280;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .card-nav-row {
      display: grid;
      grid-template-columns: repeat(var(--es-nav-cols, 3), minmax(0, 1fr));
      gap: 6px;
      margin: 0;
    }
    .card-nav-btn {
      flex-direction: column;
      gap: 5px;
      padding: 8px 4px 7px;
      min-width: 0;
      width: 100%;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
    }
    .card-nav-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.12);
    }
    .card-nav-btn:active:not(:disabled) {
      transform: translateY(0);
    }
    .card-nav-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 10px;
      flex-shrink: 0;
    }
    .card-nav-icon .nav-icon-svg {
      width: 17px;
      height: 17px;
      pointer-events: none;
    }
    .card-nav-icon--job {
      color: #4F46E5;
      background: rgba(99, 102, 241, 0.1);
    }
    .card-nav-icon--resume {
      color: #0D9488;
      background: rgba(20, 184, 166, 0.1);
    }
    .card-nav-icon--cover {
      color: #2563EB;
      background: rgba(37, 99, 235, 0.1);
    }
    .card-nav-label {
      font-size: 10px;
      font-weight: 600;
      line-height: 1.15;
      text-align: center;
      color: #374151;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .card-nav-btn:hover .card-nav-icon--job {
      animation: es-nav-job-bounce 0.55s ease;
    }
    .card-nav-btn:hover .nav-job-lid {
      animation: es-nav-job-lid 0.55s ease;
    }
    .card-nav-btn:hover .nav-resume-line {
      animation: es-nav-resume-scan 0.9s ease;
    }
    .card-nav-btn:hover .nav-cover-flap {
      animation: es-nav-cover-flap 0.7s ease;
    }
    .card-nav-icon--resume .nav-resume-line {
      opacity: 0.45;
    }
    @keyframes es-nav-job-bounce {
      0%, 100% { transform: scale(1); }
      40% { transform: scale(1.08); }
      70% { transform: scale(0.98); }
    }
    @keyframes es-nav-job-lid {
      0%, 100% { transform: translateY(0); }
      35% { transform: translateY(-2px); }
    }
    @keyframes es-nav-resume-scan {
      0% { opacity: 0.35; stroke-dasharray: 2 12; stroke-dashoffset: 8; }
      50% { opacity: 1; stroke-dasharray: 12 2; stroke-dashoffset: 0; }
      100% { opacity: 0.55; stroke-dasharray: 2 12; stroke-dashoffset: -8; }
    }
    @keyframes es-nav-cover-flap {
      0%, 100% { transform: translateY(0); }
      35% { transform: translateY(-1.5px) scaleY(0.92); }
      65% { transform: translateY(0.5px) scaleY(1.02); }
    }
    @media (prefers-reduced-motion: reduce) {
      .card-nav-btn:hover .card-nav-icon--job,
      .card-nav-btn:hover .nav-job-lid,
      .card-nav-btn:hover .nav-resume-line,
      .card-nav-btn:hover .nav-cover-flap {
        animation: none;
      }
      .card-nav-btn:hover:not(:disabled) {
        transform: none;
      }
    }
  `;
}
