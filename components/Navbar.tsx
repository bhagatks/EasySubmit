"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <LogoIcon className="h-8 w-8 shrink-0" />
          <span className="font-display text-lg font-semibold tracking-tight">
            <span className="text-white">EasySubmit</span>
            <span className="text-mint">.ai</span>
          </span>
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
          <Link href="/extension" className="transition hover:text-foreground">
            Extension
          </Link>
          <a href="/#pricing" className="transition hover:text-foreground">
            Pricing
          </a>
        </nav>

        <div className="flex items-center">
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className={cn("border-mint/30 text-mint hover:bg-mint/10")}
              >
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className={cn("font-dm text-sm text-white/60 hover:text-white")}
              >
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
