"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground";

type NavbarProfileMenuProps = {
  /** Landing nav includes Settings; dashboard header is logout-only. */
  showSettingsLink?: boolean;
};

export function NavbarProfileMenu({ showSettingsLink = true }: NavbarProfileMenuProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const user = session?.user;
  const menuVisible = open || signOutConfirmOpen;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account menu"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-0.5 pr-1.5 transition-colors hover:border-mint/30 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <UserAvatar
          image={user.image}
          firstName={user.firstName}
          lastName={user.lastName}
          email={user.email}
          name={user.name}
          seed={user.id}
          size={36}
        />
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {menuVisible ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-2 min-w-[11rem] rounded-xl border border-white/10 bg-background/95 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md"
        >
          {showSettingsLink ? (
            <Link
              href="/dashboard/settings"
              role="menuitem"
              className={menuItemClass}
              onClick={() => setOpen(false)}
            >
              <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
              Settings
            </Link>
          ) : null}
          <SignOutButton
            variant="ghost"
            confirm
            label="Log out"
            onConfirmOpenChange={(nextOpen) => {
              setSignOutConfirmOpen(nextOpen);
              if (!nextOpen) {
                setOpen(false);
              }
            }}
            className={cn(
              menuItemClass,
              "h-auto justify-start gap-2.5 font-normal hover:bg-white/[0.06]",
            )}
            icon={<LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />}
          />
        </div>
      ) : null}
    </div>
  );
}
