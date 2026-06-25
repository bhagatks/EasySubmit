"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BRAND_FULL } from "@/lib/brand";
import { signOutUser } from "@/lib/auth/sign-out-client";
import { cn } from "@/lib/utils";

const authLinkPillClass =
  "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:brightness-110";

const authLinkPillStyle = {
  color: "oklch(0.82 0.16 165)",
  borderColor: "oklch(0.82 0.16 165 / 0.4)",
  backgroundColor: "oklch(0.82 0.16 165 / 0.1)",
} as const;

type SignOutButtonProps = {
  className?: string;
  label?: string;
  /** Match marketing nav “Sign In” pill styling. */
  variant?: "pill" | "ghost";
  /** Ask before signing out (default true). */
  confirm?: boolean;
  /** @deprecated Use variant="pill" or variant="ghost" instead. */
  showIcon?: boolean;
  /** @deprecated Icon-only is no longer supported — use text label. */
  iconOnly?: boolean;
  /** @deprecated Use variant="ghost" with className instead. */
  mono?: boolean;
};

export function SignOutButton({
  className,
  label = "Sign out",
  variant = "pill",
  confirm = true,
  showIcon: _showIcon = false,
  iconOnly: _iconOnly = false,
  mono = false,
}: SignOutButtonProps) {
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleSignOut(): Promise<boolean> {
    if (pending) return false;
    setPending(true);

    try {
      await signOutUser();
      return true;
    } catch {
      setPending(false);
      return false;
    }
  }

  function handleClick() {
    if (pending) return;
    if (confirm) {
      setConfirmOpen(true);
      return;
    }
    void handleSignOut();
  }

  const displayLabel = pending ? "Signing out…" : label;

  return (
    <>
      {variant === "pill" ? (
        <button
          type="button"
          disabled={pending}
          onClick={handleClick}
          className={cn(authLinkPillClass, className)}
          style={authLinkPillStyle}
        >
          {displayLabel}
        </button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={handleClick}
          className={cn(
            "rounded-xl text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
            mono && "font-mono text-[10px] uppercase tracking-[0.14em]",
            className,
          )}
        >
          {displayLabel}
        </Button>
      )}

      {confirm ? (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Sign out of ${BRAND_FULL}?`}
          description="You'll return to the login screen. Unsaved changes in this tab may be lost."
          confirmLabel="Sign out"
          cancelLabel="Stay signed in"
          confirmVariant="destructive"
          onConfirm={handleSignOut}
        />
      ) : null}
    </>
  );
}
