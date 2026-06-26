import { BRAND_COLORS } from "../brand-colors";
import { BRAND } from "../brand";

const PRIMARY = BRAND_COLORS.primary.hex;
const PRIMARY_MUTED = BRAND_COLORS.primaryMuted.hex;

export const ENHANCE_PROGRESS_CAPTION = "Enhancing with AI…";
export const ENHANCE_PROGRESS_CANCEL_LABEL = "Cancel";

export function renderEnhanceProgressOverlay(): string {
  return `<div class="es-enhance-progress" role="status" aria-live="polite" aria-label="${ENHANCE_PROGRESS_CAPTION}">
    <div class="es-enhance-progress-inner">
      <div class="easysubmit-animation-box">
        <div class="es-enhance-wordmark" aria-hidden="true">
          <span class="es-enhance-wordmark-name">${BRAND.name}</span><span class="es-enhance-wordmark-suffix">${BRAND.suffix}</span>
        </div>
        <canvas id="brand-canvas" aria-hidden="true"></canvas>
        <div id="status-subtext">${ENHANCE_PROGRESS_CAPTION}</div>
      </div>
      <button type="button" class="es-enhance-cancel-btn" data-document-enhance-cancel="1">${ENHANCE_PROGRESS_CANCEL_LABEL}</button>
    </div>
  </div>`;
}

export function enhanceProgressOverlayStyles(): string {
  return `
    .expand-scroll-enhancing {
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 200px;
      overflow: hidden;
    }
    .expand-scroll-enhancing .preview-frame-dimmed {
      flex: 1 1 auto;
      min-height: 200px;
      opacity: 0.35;
      filter: saturate(0.85) blur(0.4px);
      pointer-events: none;
    }
    .es-enhance-progress {
      position: absolute;
      inset: 0;
      z-index: 4;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px 12px;
      background: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.82) 0%,
        rgba(249, 250, 251, 0.94) 100%
      );
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
    }
    .es-enhance-progress-inner {
      width: 100%;
      max-width: 300px;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }
    .easysubmit-animation-box {
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      box-shadow:
        0 8px 22px rgba(99, 102, 241, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.95);
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }
    .es-enhance-wordmark {
      padding: 14px 12px 4px;
      text-align: center;
      font-family: "DM Sans", system-ui, -apple-system, sans-serif;
      font-size: 15px;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.01em;
      white-space: nowrap;
      user-select: none;
    }
    .es-enhance-wordmark-name {
      color: #1F2937;
    }
    .es-enhance-wordmark-suffix {
      color: ${PRIMARY};
    }
    #brand-canvas {
      display: block;
      width: 100%;
      height: 52px;
      background: #F9FAFB;
    }
    #status-subtext {
      margin: 0;
      padding: 8px 12px 10px;
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.35;
      color: ${PRIMARY_MUTED};
      background: #FFFFFF;
      border-top: 1px solid #F1F5F9;
    }
    .es-enhance-cancel-btn {
      align-self: center;
      margin-top: 2px;
      padding: 6px 14px;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
      background: #fff;
      color: #6B7280;
      font-family: inherit;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.2;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .es-enhance-cancel-btn:hover {
      background: #F9FAFB;
      border-color: #D1D5DB;
      color: #374151;
    }
    .es-enhance-cancel-btn:focus-visible {
      outline: 2px solid ${PRIMARY};
      outline-offset: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      #brand-canvas {
        opacity: 0.96;
      }
    }
  `;
}
