"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Settings } from "lucide-react";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

const SYSTEM_MINT = "oklch(0.82 0.16 165)";

const mintStatusPillClass =
  "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:brightness-110";

const mintStatusPillStyle = {
  color: SYSTEM_MINT,
  borderColor: "oklch(0.82 0.16 165 / 0.4)",
  backgroundColor: "oklch(0.82 0.16 165 / 0.1)",
} as const;

export function Navbar() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <LogoIcon className="h-8 w-8 shrink-0" />
          <BrandWordmark className="text-lg" />
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="/#features" className="transition hover:text-foreground">
            Features
          </a>
          <a href="/#ats" className="transition hover:text-foreground">
            ATS Guarantee
          </a>
          <a href="/#byok" className="transition hover:text-foreground">
            BYOK
          </a>
          <Link href="/pricing" className="transition hover:text-foreground">
            Pricing
          </Link>
          <Link href="/extension" className="transition hover:text-foreground">
            Extension
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("border-mint/30 text-mint hover:bg-mint/10")}
                >
                  Dashboard
                </Button>
              </Link>
              <Link href="/dashboard/settings" aria-label="Settings">
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-xl border-mint/30 text-mint hover:bg-mint/10",
                  )}
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className={mintStatusPillClass}
              style={mintStatusPillStyle}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
