/**
 * EasySubmit button purposes — shared semantics, surface-specific colors.
 *
 * PARITY RULE
 * - Same **purpose** everywhere (primary, secondary, chip, …).
 * - Same **meaning** for the user (filled = main action, outline = supporting, etc.).
 * - **Colors may differ** between web (dark) and extension (light) — that is the only
 *   intentional cross-surface difference.
 *
 * Web: `webButtonPurposeProps()` → `Button` / `PurposeButton`
 * Extension: `extensionButtonClass()` → Shadow DOM class names
 * Extension CSS: `extensionButtonStyles()` (light-surface palette)
 */

import { brandExtensionTokens } from "./brand-colors";

export type ButtonPurpose =
  | "primary"
  | "secondary"
  | "chip"
  | "ghost"
  | "saved"
  | "destructive"
  /** Web-only — success / ready / active feedback (mint on dark UI). Not for extension CTAs. */
  | "status";

/** What each purpose means to the user — keep copy aligned across surfaces. */
export const BUTTON_PURPOSE_META: Record<
  ButtonPurpose,
  { label: string; userMeaning: string; surfaces: ("web" | "extension")[] }
> = {
  primary: {
    label: "Primary",
    userMeaning: "Main action on this screen (Apply, Continue, Save)",
    surfaces: ["web", "extension"],
  },
  secondary: {
    label: "Secondary",
    userMeaning: "Supporting action (Job info, Cancel, optional step)",
    surfaces: ["web", "extension"],
  },
  chip: {
    label: "Chip",
    userMeaning: "Choose between equal options (Resume, Cover letter)",
    surfaces: ["web", "extension"],
  },
  ghost: {
    label: "Ghost",
    userMeaning: "Low emphasis navigation (Skip, back links, icon actions)",
    surfaces: ["web", "extension"],
  },
  saved: {
    label: "Saved",
    userMeaning: "Already done or low-urgency repeat action",
    surfaces: ["web", "extension"],
  },
  destructive: {
    label: "Destructive",
    userMeaning: "Irreversible or dangerous (Delete, remove)",
    surfaces: ["web", "extension"],
  },
  status: {
    label: "Status",
    userMeaning: "Success / ready state on dark dashboard (Applied, active pipeline)",
    surfaces: ["web"],
  },
};

export const BRAND_BUTTONS = {
  radius: "12px",
  radiusSm: "8px",
  weight: 600,
  size: {
    sm: { fontSize: "12px", padding: "6px 12px" },
    md: { fontSize: "13px", padding: "10px 14px" },
    lg: { fontSize: "14px", padding: "11px 14px" },
  },
} as const;

type WebButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"
  | "hero"
  | "mint"
  | "mintOutline";

/** Dark web app — purpose → Button variant + classes (engine glow + mint status). */
export function webButtonPurposeProps(purpose: ButtonPurpose): {
  variant: WebButtonVariant;
  className: string;
} {
  const xl = "rounded-xl font-semibold";
  switch (purpose) {
    case "primary":
      return { variant: "hero", className: xl };
    case "secondary":
      return {
        variant: "outline",
        className: `${xl} border-primary/40 text-primary hover:bg-primary/10 hover:text-primary`,
      };
    case "chip":
      return {
        variant: "outline",
        className: `${xl} border-border bg-surface/60 text-foreground hover:border-primary/35 hover:bg-surface/80`,
      };
    case "ghost":
      return { variant: "ghost", className: "rounded-xl" };
    case "saved":
      return {
        variant: "outline",
        className: `${xl} border-border text-muted-foreground hover:bg-surface/80`,
      };
    case "destructive":
      return { variant: "destructive", className: xl };
    case "status":
      return { variant: "mint", className: xl };
    default: {
      const _exhaustive: never = purpose;
      return _exhaustive;
    }
  }
}

/** Light extension card — purpose → es-btn class list (gradient primary on white). */
export function extensionButtonClass(
  purpose: Exclude<ButtonPurpose, "status">,
  options?: { fullWidth?: boolean; legacyCta?: boolean },
): string {
  const full = options?.fullWidth !== false;
  switch (purpose) {
    case "primary":
      if (options?.legacyCta) {
        return full ? "cta cta-primary" : "es-btn es-btn-primary";
      }
      return full ? "es-btn es-btn-primary" : "es-btn es-btn-primary";
    case "secondary":
      return "es-btn es-btn-secondary";
    case "chip":
      return "es-btn es-btn-chip";
    case "ghost":
      return "es-btn es-btn-ghost";
    case "saved":
      return options?.legacyCta ? "cta cta-saved" : "es-btn es-btn-saved";
    case "destructive":
      return "es-btn es-btn-destructive";
    default: {
      const _exhaustive: never = purpose;
      return _exhaustive;
    }
  }
}

/** CSS for extension job-card Shadow DOM (light surface palette). */
export function extensionButtonStyles(): string {
  const t = brandExtensionTokens();
  const r = BRAND_BUTTONS.radius;

  return `
    .es-btn {
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: none;
      border-radius: ${r};
      font-family: inherit;
      font-weight: ${BRAND_BUTTONS.weight};
      line-height: 1.2;
      cursor: pointer;
      transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    }
    .es-btn svg,
    .cta svg { width: 15px; height: 15px; flex-shrink: 0; pointer-events: none; }
    .es-btn:disabled,
    .cta:disabled { opacity: 0.65; cursor: not-allowed; transform: none; box-shadow: none; }

    .es-btn-primary,
    .cta.cta-primary {
      width: 100%;
      padding: ${BRAND_BUTTONS.size.md.padding};
      font-size: ${BRAND_BUTTONS.size.md.fontSize};
      background: ${t.gradient};
      color: #fff;
      border: none;
      box-shadow: 0 4px 14px ${t.a32};
    }
    .es-btn-primary:hover:not(:disabled),
    .cta.cta-primary:hover:not(:disabled) {
      box-shadow: 0 6px 18px ${t.a42};
      transform: translateY(-1px);
    }
    .es-btn-primary:active:not(:disabled),
    .cta.cta-primary:active:not(:disabled) { transform: translateY(0); }

    .cta.cta-secondary {
      width: 100%;
      padding: ${BRAND_BUTTONS.size.md.padding};
      font-size: ${BRAND_BUTTONS.size.md.fontSize};
      background: #fff;
      color: ${t.primaryMuted};
      border: 1px solid ${t.a28};
      box-shadow: none;
    }
    .cta.cta-secondary:hover:not(:disabled) { background: ${t.a08}; }

    .es-btn-secondary {
      padding: ${BRAND_BUTTONS.size.sm.padding};
      font-size: ${BRAND_BUTTONS.size.sm.fontSize};
      background: #F9FAFB;
      color: ${t.primaryMuted};
      border: 1px solid ${t.a28};
      box-shadow: none;
    }
    .es-btn-secondary:hover:not(:disabled) {
      background: ${t.a08};
      border-color: ${t.a35};
    }

    .es-btn-chip,
    .doc-chip {
      width: 100%;
      padding: 8px 10px;
      font-size: ${BRAND_BUTTONS.size.sm.fontSize};
      background: #F9FAFB;
      color: #1F2937;
      border: 1px solid #E5E7EB;
    }
    .es-btn-chip:hover:not(:disabled),
    .doc-chip:hover:not(:disabled) {
      background: #F3F4F6;
      border-color: ${t.a35};
    }

    .es-btn-ghost {
      padding: 0;
      background: transparent;
      color: ${t.primaryMuted};
      border: none;
      box-shadow: none;
      font-size: ${BRAND_BUTTONS.size.sm.fontSize};
    }
    .es-btn-ghost:hover:not(:disabled) {
      color: ${t.primary};
      text-decoration: underline;
    }

    .es-btn-saved,
    .cta-saved {
      width: 100%;
      padding: ${BRAND_BUTTONS.size.md.padding};
      font-size: ${BRAND_BUTTONS.size.md.fontSize};
      background: #F9FAFB;
      color: ${t.primaryMuted};
      border: 1px solid ${t.a28};
      box-shadow: none;
    }
    .es-btn-saved:hover:not(:disabled),
    .cta-saved:hover:not(:disabled) { background: ${t.a08}; }

    .es-btn-destructive {
      width: 100%;
      padding: ${BRAND_BUTTONS.size.md.padding};
      font-size: ${BRAND_BUTTONS.size.md.fontSize};
      background: #FEF2F2;
      color: #B91C1C;
      border: 1px solid #FECACA;
    }
    .es-btn-destructive:hover:not(:disabled) { background: #FEE2E2; }

    .cta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      box-sizing: border-box;
      border-radius: ${r};
      padding: ${BRAND_BUTTONS.size.md.padding};
      font-size: ${BRAND_BUTTONS.size.md.fontSize};
      font-weight: ${BRAND_BUTTONS.weight};
      line-height: 1.2;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    }
  `.trim();
}

/** Popup stylesheet — light surface, same purpose names as card. */
export function extensionPopupButtonCss(): string {
  const t = brandExtensionTokens();
  const r = BRAND_BUTTONS.radius;
  return `
.btn {
  display: block;
  width: 100%;
  margin-bottom: 8px;
  border: none;
  border-radius: ${r};
  font-size: ${BRAND_BUTTONS.size.lg.fontSize};
  font-weight: ${BRAND_BUTTONS.weight};
  cursor: pointer;
  padding: ${BRAND_BUTTONS.size.lg.padding};
}
.btn:disabled { opacity: 0.65; cursor: wait; }
.btn-primary { color: #fff; background: ${t.primaryHex}; }
.btn-primary:hover:not(:disabled) { background: ${t.primaryDark}; }
.btn-secondary { color: #1f2937; background: #fff; border: 1px solid #e5e7eb; }
.btn-secondary:hover:not(:disabled) { background: #f3f4f6; }
.btn-ghost { color: ${t.primaryHex}; background: transparent; }
.toggle-input { accent-color: ${t.primaryHex}; }
.eyebrow { color: ${t.primaryHex}; }
`.trim();
}

/** @deprecated Use `extensionPopupButtonCss`. */
export function extensionPopupBrandCss(): string {
  return extensionPopupButtonCss();
}
