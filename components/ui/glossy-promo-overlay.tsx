"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { GlossySheen } from "@/components/ui/glossy-sheen";
import { GLOSSY_OVERLAY_CLASS, GLOSSY_PANEL_CLASS } from "@/components/ui/glossy-tokens";
import { cn } from "@/lib/utils";

type GlossyPromoOverlayProps = {
  open: boolean;
  onDismiss: () => void;
  title: string;
  description: string;
  /** Icon or illustration above the title. */
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  zIndex?: number;
};

/**
 * Centered glossy promo / nudge overlay with backdrop dismiss.
 * Used for one-time prompts (e.g. BYOK nudge).
 */
export function GlossyPromoOverlay({
  open,
  onDismiss,
  title,
  description,
  icon,
  children,
  className,
  zIndex = 150,
}: GlossyPromoOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="glossy-promo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex }}
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Dismiss"
            className={cn(
              "pointer-events-auto absolute inset-0",
              GLOSSY_OVERLAY_CLASS,
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="glossy-promo-title"
            aria-describedby="glossy-promo-desc"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className={cn(
              "pointer-events-auto relative w-full max-w-md overflow-hidden p-6",
              GLOSSY_PANEL_CLASS,
              className,
            )}
          >
            <GlossySheen />

            <button
              type="button"
              onClick={onDismiss}
              className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {icon ? <div className="relative">{icon}</div> : null}

            <h2
              id="glossy-promo-title"
              className="relative mt-4 font-display text-xl font-semibold tracking-tight text-foreground"
            >
              {title}
            </h2>
            <p id="glossy-promo-desc" className="relative mt-2 text-sm text-muted-foreground">
              {description}
            </p>

            {children ? <div className="relative mt-6">{children}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
