import type { ReactNode } from "react";
import { GLOSSY_FULLSCREEN_BACKDROP_STYLE } from "@/components/ui/glossy-tokens";
import { cn } from "@/lib/utils";

type GlossyFullscreenShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  zIndex?: number;
  role?: "dialog" | "status";
  "aria-label"?: string;
  "aria-live"?: "polite" | "assertive" | "off";
  "aria-busy"?: boolean;
};

/**
 * Full-viewport glossy backdrop with grid + glow accents.
 * Used by IgnitionGate, SynthesisTransition, and similar cinematic flows.
 */
export function GlossyFullscreenShell({
  children,
  className,
  contentClassName,
  zIndex = 120,
  role = "dialog",
  "aria-label": ariaLabel,
  "aria-live": ariaLive,
  "aria-busy": ariaBusy,
}: GlossyFullscreenShellProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 flex flex-col overflow-y-auto backdrop-blur-2xl",
        className,
      )}
      style={{ ...GLOSSY_FULLSCREEN_BACKDROP_STYLE, zIndex }}
      role={role}
      aria-modal={role === "dialog" ? true : undefined}
      aria-label={ariaLabel}
      aria-live={ariaLive}
      aria-busy={ariaBusy}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-1/4 top-0 h-[480px] w-[480px] rounded-full blur-3xl"
          style={{ backgroundColor: "oklch(0.62 0.21 265 / 0.12)" }}
        />
        <div
          className="absolute -right-1/4 bottom-0 h-[420px] w-[420px] rounded-full blur-3xl"
          style={{ backgroundColor: "oklch(0.82 0.16 165 / 0.08)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.82 0.16 165 / 0.5) 1px, transparent 1px), linear-gradient(90deg, oklch(0.82 0.16 165 / 0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 40%, oklch(0.62 0.21 265 / 0.16), transparent 58%), radial-gradient(circle at 50% 50%, oklch(0.82 0.16 165 / 0.07), transparent 50%)",
          }}
        />
      </div>

      <div
        className={cn("relative mx-auto flex w-full flex-1 flex-col", contentClassName)}
      >
        {children}
      </div>
    </div>
  );
}
