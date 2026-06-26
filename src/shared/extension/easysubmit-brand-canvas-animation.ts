import { BRAND_COLORS, brandAlpha } from "../brand-colors";

/** Canvas palette aligned with extension light surfaces + engine glow. */
export const EASYSUBMIT_BRAND_CANVAS_COLORS = {
  surface: "#FFFFFF",
  surfaceMuted: "#F9FAFB",
  border: "#E5E7EB",
  text: "#1F2937",
  textMuted: "#6B7280",
  primary: BRAND_COLORS.primary.hex,
  primaryDark: BRAND_COLORS.primaryDark.hex,
  primaryMuted: BRAND_COLORS.primaryMuted.hex,
  glow: brandAlpha(BRAND_COLORS.primary.hex, 0.22),
  glowSoft: brandAlpha(BRAND_COLORS.primary.hex, 0.1),
} as const;

export type EasySubmitAnimationController = {
  stop: () => void;
  finish: () => Promise<void>;
};

type ActiveAnimation = {
  frameId: number;
  finishResolve: (() => void) | null;
  finishPromise: Promise<void>;
};

let activeAnimation: ActiveAnimation | null = null;

function findCanvasRoot(root?: ParentNode): ParentNode | null {
  if (root) return root;
  if (typeof document === "undefined") return null;
  return document;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function drawLogoBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  glow: number,
): void {
  const { primary, surface } = EASYSUBMIT_BRAND_CANVAS_COLORS;
  const radius = Math.max(5, size * 0.24);

  if (glow > 0.02) {
    ctx.save();
    ctx.shadowColor = brandAlpha(primary, 0.4 * glow);
    ctx.shadowBlur = 14 * glow;
    ctx.fillStyle = brandAlpha(primary, 0.12 * glow);
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x - 2, y - 2, size + 4, size + 4, radius + 2);
    } else {
      ctx.rect(x - 2, y - 2, size + 4, size + 4);
    }
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = primary;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, size, size, radius);
  } else {
    ctx.rect(x, y, size, size);
  }
  ctx.fill();

  ctx.fillStyle = surface;
  ctx.font = `800 ${Math.round(size * 0.36)}px "DM Sans", system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("ES", x + size * 0.47, y + size * 0.42);

  ctx.font = `700 ${Math.round(size * 0.19)}px "DM Sans", system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("ai", x + size * 0.9, y + size * 0.9);
}

function drawProgressRail(
  ctx: CanvasRenderingContext2D,
  trackStart: number,
  trackEnd: number,
  y: number,
  logoCenterX: number,
): void {
  const width = trackEnd - trackStart;
  const progress = width <= 0 ? 0 : (logoCenterX - trackStart) / width;

  ctx.fillStyle = "#E5E7EB";
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(trackStart, y, width, 4, 999);
  } else {
    ctx.rect(trackStart, y, width, 4);
  }
  ctx.fill();

  const fillWidth = Math.max(4, width * Math.max(0, Math.min(1, progress)));
  const gradient = ctx.createLinearGradient(trackStart, y, trackStart + fillWidth, y);
  gradient.addColorStop(0, EASYSUBMIT_BRAND_CANVAS_COLORS.primary);
  gradient.addColorStop(1, brandAlpha(EASYSUBMIT_BRAND_CANVAS_COLORS.primary, 0.5));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(trackStart, y, fillWidth, 4, 999);
  } else {
    ctx.rect(trackStart, y, fillWidth, 4);
  }
  ctx.fill();
}

export type TriggerEasySubmitAnimationOptions = {
  root?: ParentNode;
  subtext?: string;
  until?: Promise<unknown>;
};

/**
 * ES logo shuttles along a progress rail. Wordmark lives in HTML above the canvas.
 */
export function triggerEasySubmitAnimation(
  options: TriggerEasySubmitAnimationOptions = {},
): EasySubmitAnimationController | null {
  const host = findCanvasRoot(options.root);
  if (!host) return null;
  const canvas = host.querySelector("#brand-canvas") as HTMLCanvasElement | null;
  const subtextEl = host.querySelector("#status-subtext") as HTMLElement | null;
  const box = host.querySelector(".easysubmit-animation-box") as HTMLElement | null;

  if (!canvas || !box) return null;

  stopEasySubmitAnimation();

  if (subtextEl && options.subtext) {
    subtextEl.textContent = options.subtext;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const layoutWidth = Math.max(240, Math.min(box.clientWidth || 280, 320));
  const layoutHeight = 52;
  canvas.width = Math.floor(layoutWidth * dpr);
  canvas.height = Math.floor(layoutHeight * dpr);
  canvas.style.width = `${layoutWidth}px`;
  canvas.style.height = `${layoutHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const iconSize = 24;
  const padX = 16;
  const railY = 38;
  const iconY = railY - iconSize - 6;
  const trackStart = padX;
  const trackEnd = layoutWidth - padX - iconSize;
  const iconHomeX = trackStart;

  let logoX = iconHomeX;
  let logoTargetX = iconHomeX;
  let settling = false;
  let stopped = false;
  let processingDone = false;
  const startedAt = performance.now();
  let lastFrameAt = startedAt;

  let finishResolve: (() => void) | null = null;
  const finishPromise = new Promise<void>((resolve) => {
    finishResolve = resolve;
  });

  const markProcessingDone = (): void => {
    processingDone = true;
  };

  if (options.until) {
    void options.until.finally(markProcessingDone);
  } else {
    markProcessingDone();
  }

  const controller: EasySubmitAnimationController = {
    stop: () => {
      stopped = true;
      if (activeAnimation?.frameId) {
        cancelAnimationFrame(activeAnimation.frameId);
      }
      activeAnimation = null;
      finishResolve?.();
    },
    finish: () => finishPromise,
  };

  activeAnimation = {
    frameId: 0,
    finishResolve,
    finishPromise,
  };

  const render = (now: number): void => {
    if (stopped) return;

    const dt = Math.min(0.032, (now - lastFrameAt) / 1000);
    lastFrameAt = now;
    const elapsed = (now - startedAt) / 1000;

    if (settling) {
      logoTargetX = iconHomeX;
    } else if (processingDone) {
      settling = true;
      logoTargetX = iconHomeX;
    } else {
      const wave = 0.5 - 0.5 * Math.cos(elapsed * 1.35);
      logoTargetX = lerp(trackStart, trackEnd, wave);
    }

    const blend = 1 - Math.exp(-10 * dt);
    logoX = lerp(logoX, logoTargetX, blend);

    const velocity = Math.abs(logoTargetX - logoX);
    const travelGlow = 0.4 + Math.min(0.45, velocity / 16);

    ctx.clearRect(0, 0, layoutWidth, layoutHeight);
    drawProgressRail(ctx, trackStart, trackEnd, railY, logoX + iconSize * 0.5);
    drawLogoBlock(ctx, logoX, iconY, iconSize, travelGlow);

    if (settling && Math.abs(logoX - iconHomeX) < 0.35) {
      finishResolve?.();
      activeAnimation = null;
      return;
    }

    activeAnimation!.frameId = requestAnimationFrame(render);
  };

  activeAnimation.frameId = requestAnimationFrame(render);
  return controller;
}

export function stopEasySubmitAnimation(): void {
  if (!activeAnimation) return;
  if (activeAnimation.frameId) {
    cancelAnimationFrame(activeAnimation.frameId);
  }
  activeAnimation.finishResolve?.();
  activeAnimation = null;
}

declare global {
  interface Window {
    triggerEasySubmitAnimation?: typeof triggerEasySubmitAnimation;
    stopEasySubmitAnimation?: typeof stopEasySubmitAnimation;
  }
}

export function exposeEasySubmitAnimationGlobals(): void {
  if (typeof window === "undefined") return;
  window.triggerEasySubmitAnimation = triggerEasySubmitAnimation;
  window.stopEasySubmitAnimation = stopEasySubmitAnimation;
}
