import type { CSSProperties } from "react";

/** Shared Trust Tech glossy surface tokens for dialogs, overlays, and full-screen gates. */

export const GLOSSY_NAVY = "oklch(0.16 0.04 268)";
export const GLOSSY_TECH_BORDER = "oklch(0.62 0.21 265 / 0.28)";
export const GLOSSY_MINT = "oklch(0.82 0.16 165)";

/** Framer Motion cannot interpolate oklch() with alpha — use these rgba equivalents in `animate`. */
export const GLOSSY_NAVY_35 = "rgba(6, 12, 30, 0.35)";
export const GLOSSY_MINT_10 = "rgba(55, 228, 170, 0.1)";
export const GLOSSY_MINT_12 = "rgba(55, 228, 170, 0.12)";
export const GLOSSY_MINT_50 = "rgba(55, 228, 170, 0.5)";
export const GLOSSY_MUTED_RGB = "rgba(80, 85, 97, 1)";

export const GLOSSY_OVERLAY_CLASS =
  "bg-[oklch(0.16_0.04_268/0.72)] backdrop-blur-md";

export const GLOSSY_PANEL_CLASS =
  "rounded-2xl border border-[oklch(0.62_0.21_265_/_0.28)] bg-[oklch(0.16_0.04_268_/_0.97)] shadow-elevated backdrop-blur-xl";

export const GLOSSY_SHEEN_STYLE: CSSProperties = {
  background:
    "radial-gradient(ellipse 80% 50% at 50% 0%, oklch(0.62 0.21 265 / 0.14), transparent 55%), radial-gradient(ellipse 60% 40% at 50% 100%, oklch(0.82 0.16 165 / 0.08), transparent 60%)",
};

export const GLOSSY_FULLSCREEN_BACKDROP_STYLE: CSSProperties = {
  backgroundColor: "oklch(0.16 0.04 268 / 0.92)",
};
