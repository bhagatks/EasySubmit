"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ComponentType, ReactNode } from "react";
import { IgnitionGate } from "@/src/components/auth/IgnitionGate";
import { cn } from "@/lib/utils";
import { useIgnitionStore } from "@/src/stores/use-ignition-store";

const slideTransition = {
  duration: 0.55,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

type KeyProtectorProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Dashboard-only layout guard — when `isLocked` is true (provider auth failure or
 * manual lock), IgnitionGate covers the dashboard until the user re-authenticates.
 * Missing keys on first visit redirect to onboarding Ignition Gate instead.
 */
export function KeyProtector({ children, className }: KeyProtectorProps) {
  const isLocked = useIgnitionStore((state) => state.isLocked);
  const lockReason = useIgnitionStore((state) => state.lockReason);
  const unlockIgnition = useIgnitionStore((state) => state.unlockIgnition);

  return (
    <div className={cn("relative min-h-0 flex-1", className)}>
      <div
        aria-hidden={isLocked}
        className={cn(
          "min-h-0 transition-[filter,opacity]",
          isLocked && "pointer-events-none select-none overflow-hidden opacity-40 blur-[2px]",
        )}
      >
        {children}
      </div>

      <AnimatePresence>
        {isLocked ? (
          <motion.div
            key="key-protector-shell"
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={slideTransition}
            className="fixed inset-0 z-[110] pointer-events-auto"
          >
            <IgnitionGate
              variant="protect"
              fullScreen
              lockReason={lockReason}
              apiKeyInputId="key-protector-api-key"
              onResume={unlockIgnition}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Optional HOC for route-level protection without wrapping the full app layout. */
export function withKeyProtector<P extends object>(Component: ComponentType<P>) {
  function ProtectedComponent(props: P) {
    return (
      <KeyProtector>
        <Component {...props} />
      </KeyProtector>
    );
  }

  ProtectedComponent.displayName = `withKeyProtector(${Component.displayName ?? Component.name ?? "Component"})`;
  return ProtectedComponent;
}
