/**
 * EasySubmit brand colors — single source of truth for web + extension + logos.
 *
 * OKLCH tokens MUST stay aligned with `app/globals.css` (`:root` --primary,
 * --gradient-primary, --ring). HEX snapshots are for SVG rasterization and
 * surfaces that cannot use CSS variables.
 *
 * After edits: run `npx vitest run lib/brand-colors.test.ts`
 */

export const BRAND_COLORS = {
  /** Engine glow — dashboard primary (`--primary`). */
  primary: {
    oklch: "oklch(0.62 0.21 265)",
    hex: "#6366F1",
  },
  /** Hover / pressed / darker accent. */
  primaryDark: {
    oklch: "oklch(0.52 0.21 265)",
    hex: "#4F46E5",
  },
  /** Muted primary text on light surfaces (replaces legacy teal text). */
  primaryMuted: {
    oklch: "oklch(0.48 0.18 265)",
    hex: "#4338CA",
  },
  gradient: {
    /** Matches `--gradient-primary` in globals.css */
    primary: "linear-gradient(135deg, oklch(0.62 0.21 265) 0%, oklch(0.72 0.18 220) 100%)",
    primaryHex:
      "linear-gradient(135deg, #6366F1 0%, #60A5FA 100%)",
  },
  /** Logo mark background — always primary engine glow. */
  logo: {
    fill: "#6366F1",
    rx: 28,
    viewBox: "0 0 128 128",
  },
} as const;

/** RGBA helper from a brand hex snapshot (e.g. soft backgrounds). */
export function brandAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Short tokens for extension Shadow DOM CSS template literals. */
export function brandExtensionTokens() {
  const primaryHex = BRAND_COLORS.primary.hex;
  return {
    primary: BRAND_COLORS.primary.oklch,
    primaryHex,
    primaryDark: BRAND_COLORS.primaryDark.hex,
    primaryMuted: BRAND_COLORS.primaryMuted.oklch,
    primaryMutedHex: BRAND_COLORS.primaryMuted.hex,
    gradient: BRAND_COLORS.gradient.primary,
    gradientHex: BRAND_COLORS.gradient.primaryHex,
    a08: brandAlpha(primaryHex, 0.08),
    a10: brandAlpha(primaryHex, 0.1),
    a12: brandAlpha(primaryHex, 0.12),
    a16: brandAlpha(primaryHex, 0.16),
    a28: brandAlpha(primaryHex, 0.28),
    a32: brandAlpha(primaryHex, 0.32),
    a35: brandAlpha(primaryHex, 0.35),
    a42: brandAlpha(primaryHex, 0.42),
    a55: brandAlpha(primaryHex, 0.55),
    a60: brandAlpha(primaryHex, 0.6),
    a70: brandAlpha(primaryHex, 0.7),
    a85: brandAlpha(primaryHex, 0.85),
  } as const;
}
