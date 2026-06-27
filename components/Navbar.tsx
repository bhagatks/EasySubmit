"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { useSession } from "next-auth/react";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/ui/logo";
import { NavbarProfileMenu } from "@/components/nav/NavbarProfileMenu";
import {
  dashboardHeaderMintPillClassName,
  dashboardHeaderMintPillStyle,
} from "@/lib/dashboard/dashboard-header-chrome";

export function Navbar() {
  const router = useRouter();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    if (isAuthenticated) {
      router.prefetch("/dashboard");
    }
  }, [isAuthenticated, router]);

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

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Button variant="hero" size="lg" className="rounded-xl" asChild>
                <Link href="/dashboard" prefetch>
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  Dashboard
                </Link>
              </Button>
              <NavbarProfileMenu />
            </>
          ) : (
            <Link
              href="/login"
              className={dashboardHeaderMintPillClassName()}
              style={dashboardHeaderMintPillStyle}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
