"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signOutUser } from "@/lib/auth/sign-out-client";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
  label?: string;
  showIcon?: boolean;
  /** Icon-only control (e.g. onboarding header). */
  iconOnly?: boolean;
  /** JetBrains-style uppercase label for onboarding chrome. */
  mono?: boolean;
};

export function SignOutButton({
  className,
  label = "Sign out",
  showIcon = true,
  iconOnly = false,
  mono = false,
}: SignOutButtonProps) {
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    if (pending) return;
    setPending(true);

    try {
      await signOutUser();
    } catch {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={iconOnly ? "icon" : "sm"}
      disabled={pending}
      aria-label={iconOnly ? (pending ? "Signing out" : "Sign out") : undefined}
      onClick={() => void handleSignOut()}
      className={cn(
        "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
        iconOnly && "h-8 w-8 shrink-0",
        mono && !iconOnly && "font-mono text-[10px] uppercase tracking-[0.14em]",
        className,
      )}
    >
      {showIcon ? <LogOut className="h-4 w-4" aria-hidden="true" /> : null}
      {iconOnly ? null : pending ? "Signing out…" : label}
    </Button>
  );
}
