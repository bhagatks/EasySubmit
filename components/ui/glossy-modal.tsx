"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { GlossySheen } from "@/components/ui/glossy-sheen";
import { GLOSSY_OVERLAY_CLASS, GLOSSY_PANEL_CLASS } from "@/components/ui/glossy-tokens";
import { cn } from "@/lib/utils";

export type GlossyModalPlacement = "center" | "login-panel";

type GlossyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  placement?: GlossyModalPlacement;
  className?: string;
  /** Hide the top-right close control (e.g. confirm dialogs). */
  hideClose?: boolean;
  /** Block backdrop / Escape / X while an action is running. */
  busy?: boolean;
  /** Stack above fullscreen flows (SynthesisTransition uses z-120). */
  zIndex?: number;
};

/**
 * Reliable glossy modal shell (framer-motion + fixed flex layout).
 * Use instead of Radix Dialog for glossy panels — avoids backdrop covering content.
 */
export function GlossyModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  placement = "center",
  className,
  hideClose = false,
  busy = false,
  zIndex = 150,
}: GlossyModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    if (!busy) onOpenChange(false);
  }, [busy, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  const titleId = "glossy-modal-title";

  if (!mounted) {
    return null;
  }

  const shellClassName = cn(
    "pointer-events-none fixed inset-0 flex px-4 py-[max(1rem,5dvh)]",
    placement === "login-panel"
      ? "items-center justify-center lg:justify-end lg:pr-[25px]"
      : "items-center justify-center",
  );

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="glossy-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={shellClassName}
          style={{ zIndex }}
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Dismiss"
            className={cn("absolute inset-0 z-0", GLOSSY_OVERLAY_CLASS)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            disabled={busy}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className={cn(
              "pointer-events-auto relative z-10 flex max-h-[min(90dvh,720px)] w-[min(512px,calc(100vw-2rem))] flex-col overflow-hidden",
              GLOSSY_PANEL_CLASS,
              className,
            )}
          >
            <GlossySheen />

            {hideClose ? null : (
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="absolute right-3 top-3 z-20 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-40"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <header
              className={cn(
                "relative z-10 shrink-0 space-y-1.5 border-b border-white/10 px-5 py-4 text-left",
                !hideClose && "pr-12",
              )}
            >
              <h2 id={titleId} className="font-display text-lg font-semibold text-foreground">
                {title}
              </h2>
              {description ? (
                <p className="text-sm text-muted-foreground">{description}</p>
              ) : null}
            </header>

            {children ? (
              <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                {children}
              </div>
            ) : null}

            {footer ? (
              <div className="relative z-10 shrink-0 border-t border-white/10 px-5 py-3">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
