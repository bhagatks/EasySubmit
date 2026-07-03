import { BRAND } from "../brand";
import { BRAND_COLORS, brandAlpha } from "../brand-colors";

/**
 * Self-contained apply-pipeline loader.
 *
 * Independent of the card re-render cycle: it mounts a single persistent DOM
 * node, owns its own requestAnimationFrame loop, and only ever transitions
 * forward — `start()` → (`succeed()` | `fail()`). It never toggles back and
 * forth, so repeated `renderCard()` calls cannot restart or flicker it.
 */

const PRIMARY = BRAND_COLORS.primary.hex;

const LOADER_HOST_CLASS = "es-apply-loader-host";
const LOADER_CANVAS_ID = "es-apply-loader-canvas";

type LoaderState = "running" | "dismissed";

type LoaderInstance = {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  frameId: number;
  state: LoaderState;
  startedAt: number;
  lastFrameAt: number;
  logoX: number;
};

let instance: LoaderInstance | null = null;

function markup(): string {
  return `
    <div class="es-apply-loader-box">
      <div class="es-apply-loader-wordmark" aria-hidden="true">
        <span class="es-apply-loader-name">${BRAND.name}</span><span class="es-apply-loader-suffix">${BRAND.suffix}</span>
      </div>
      <canvas id="${LOADER_CANVAS_ID}" aria-hidden="true"></canvas>
    </div>`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function drawLogoBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const radius = Math.max(5, size * 0.24);
  ctx.save();
  ctx.shadowColor = brandAlpha(PRIMARY, 0.35);
  ctx.shadowBlur = 12;
  ctx.fillStyle = PRIMARY;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, size, size, radius);
  } else {
    ctx.rect(x, y, size, size);
  }
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${Math.round(size * 0.36)}px "DM Sans", system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("ES", x + size * 0.47, y + size * 0.42);
}

function drawRail(
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
  ctx.fillStyle = brandAlpha(PRIMARY, 0.85);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(trackStart, y, fillWidth, 4, 999);
  } else {
    ctx.rect(trackStart, y, fillWidth, 4);
  }
  ctx.fill();
}

function sizeCanvas(canvas: HTMLCanvasElement): {
  ctx: CanvasRenderingContext2D | null;
  width: number;
  height: number;
  resized: boolean;
} {
  const box = canvas.parentElement;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(240, Math.min(box?.clientWidth || 280, 320));
  const height = 48;
  const nextWidth = Math.floor(width * dpr);
  const nextHeight = Math.floor(height * dpr);
  const resized = canvas.width !== nextWidth || canvas.height !== nextHeight;
  if (resized) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
  const ctx = canvas.getContext("2d");
  if (ctx && resized) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height, resized };
}

function runLoop(inst: LoaderInstance): void {
  const step = (now: number): void => {
    if (!instance || instance !== inst || inst.state !== "running") return;

    const { ctx, width, height } = sizeCanvas(inst.canvas);
    if (!ctx) {
      inst.frameId = requestAnimationFrame(step);
      return;
    }

    const dt = Math.min(0.032, (now - inst.lastFrameAt) / 1000);
    inst.lastFrameAt = now;
    const elapsed = (now - inst.startedAt) / 1000;

    const iconSize = 24;
    const padX = 16;
    const railY = 34;
    const iconY = railY - iconSize - 4;
    const trackStart = padX;
    const trackEnd = width - padX - iconSize;

    const wave = 0.5 - 0.5 * Math.cos(elapsed * 1.35);
    const target = lerp(trackStart, trackEnd, wave);
    const blend = 1 - Math.exp(-10 * dt);
    inst.logoX = lerp(inst.logoX, target, blend);

    ctx.clearRect(0, 0, width, height);
    drawRail(ctx, trackStart, trackEnd, railY, inst.logoX + iconSize * 0.5);
    drawLogoBlock(ctx, inst.logoX, iconY, iconSize);

    inst.frameId = requestAnimationFrame(step);
  };
  inst.frameId = requestAnimationFrame(step);
}

export type ApplyPipelineLoaderMount = {
  /** Stable container the loader attaches into. Cleared on dismiss. */
  slot: HTMLElement;
};

/**
 * Start the loader inside `slot`, or re-parent an existing running loader after
 * card re-render. Never restarts the animation while still running.
 */
export function startApplyPipelineLoader(mount: ApplyPipelineLoaderMount): void {
  const { slot } = mount;

  if (instance && instance.state === "running") {
    if (!slot.contains(instance.host)) {
      slot.replaceChildren(instance.host);
    }
    return;
  }

  stopApplyPipelineLoader();

  const host = document.createElement("div");
  host.className = LOADER_HOST_CLASS;
  host.setAttribute("role", "status");
  host.setAttribute("aria-live", "polite");
  host.setAttribute("aria-label", "Processing");
  host.innerHTML = markup();
  slot.replaceChildren(host);

  const canvas = host.querySelector(`#${LOADER_CANVAS_ID}`) as HTMLCanvasElement | null;
  if (!canvas) {
    slot.replaceChildren();
    return;
  }

  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  instance = {
    host,
    canvas,
    frameId: 0,
    state: "running",
    startedAt: now,
    lastFrameAt: now,
    logoX: 16,
  };
  runLoop(instance);
}

/** @deprecated Status line is rendered separately in the card actions block. */
export function updateApplyPipelineLoaderCaption(_caption: string): void {
  // no-op — caption lives in journey-status below the loader
}

/** Whether the loader is currently animating. */
export function isApplyPipelineLoaderRunning(): boolean {
  return instance !== null && instance.state === "running";
}

/** Immediately stop and remove the loader (no terminal state). */
export function stopApplyPipelineLoader(): void {
  if (!instance) return;
  if (instance.frameId) cancelAnimationFrame(instance.frameId);
  instance.state = "dismissed";
  instance.host.remove();
  instance = null;
}

/** Terminal success — stop and remove. Caller enables Auto Suggest. */
export function succeedApplyPipelineLoader(): void {
  stopApplyPipelineLoader();
}

/** Terminal failure — stop and remove. Caller shows the tracker error. */
export function failApplyPipelineLoader(): void {
  stopApplyPipelineLoader();
}

export function applyPipelineLoaderStyles(): string {
  return `
    .${LOADER_HOST_CLASS} {
      margin-bottom: 8px;
    }
    .es-apply-loader-box {
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      box-shadow:
        0 8px 22px ${brandAlpha(PRIMARY, 0.08)},
        inset 0 1px 0 rgba(255, 255, 255, 0.95);
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }
    .es-apply-loader-wordmark {
      padding: 12px 12px 2px;
      text-align: center;
      font-family: "DM Sans", system-ui, -apple-system, sans-serif;
      font-size: 15px;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.01em;
      white-space: nowrap;
      user-select: none;
    }
    .es-apply-loader-name { color: #1F2937; }
    .es-apply-loader-suffix { color: ${PRIMARY}; }
    .${LOADER_HOST_CLASS} #${LOADER_CANVAS_ID} {
      display: block;
      width: 100%;
      height: 48px;
      background: #F9FAFB;
    }
  `;
}
