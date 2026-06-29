"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BRAND_FULL } from "@/lib/brand";
import { signOutUser } from "@/lib/auth/sign-out-client";
import {
  dashboardHeaderControlClassName,
  dashboardHeaderMintPillStyle,
} from "@/lib/dashboard/dashboard-header-chrome";
import { cn } from "@/lib/utils";

const authLinkPillClass = cn(
  dashboardHeaderControlClassName,
  "border hover:brightness-110",
);

type SignOutButtonProps = {
  className?: string;
  label?: string;
  /** Optional leading icon (e.g. menu rows). */
  icon?: ReactNode;
  /** Match marketing nav “Sign In” pill styling. */
  variant?: "pill" | "ghost";
  /** Ask before signing out (default true). */
  confirm?: boolean;
  /** Called when the user activates sign out (before confirm dialog). */
  onActivate?: () => void;
  /** Fired when the confirm dialog opens or closes (when `confirm` is true). */
  onConfirmOpenChange?: (open: boolean) => void;
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
  icon,
  variant = "pill",
  confirm = true,
  onActivate,
  onConfirmOpenChange,
  showIcon: _showIcon = false,
  iconOnly: _iconOnly = false,
  mono = false,
}: SignOutButtonProps) {
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const prevConfirmOpenRef = useRef(confirmOpen);

  useEffect(() => {
    if (!confirm) return;
    if (prevConfirmOpenRef.current === confirmOpen) return;
    prevConfirmOpenRef.current = confirmOpen;
    onConfirmOpenChange?.(confirmOpen);
  }, [confirm, confirmOpen, onConfirmOpenChange]);

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
    onActivate?.();
    void handleSignOut();
  }

  const displayLabel = pending ? "Signing out…" : label;
  const content = (
    <>
      {icon}
      {displayLabel}
    </>
  );

  return (
    <>
      {variant === "pill" ? (
        <button
          type="button"
          disabled={pending}
          onClick={handleClick}
          className={cn(authLinkPillClass, className)}
          style={dashboardHeaderMintPillStyle}
        >
          {content}
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
          {content}
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
