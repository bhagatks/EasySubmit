export const FLOATING_HINT_BUTTON_CLASS = "es-floating-hint";

export function escapeHintAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

export function floatingHintStyles(buttonClass = FLOATING_HINT_BUTTON_CLASS): string {
  return `
    .${buttonClass} {
      position: relative;
    }
    .${buttonClass}::after {
      content: attr(data-hint);
      position: absolute;
      left: 50%;
      top: calc(100% + 8px);
      bottom: auto;
      transform: translateX(-50%);
      padding: 5px 8px;
      border-radius: 8px;
      background: #111827;
      color: #F9FAFB;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.25;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.12s ease, visibility 0.12s ease;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
      z-index: 30;
    }
    .${buttonClass}:hover::after,
    .${buttonClass}:focus-visible::after {
      opacity: 1;
      visibility: visible;
    }
  `;
}
