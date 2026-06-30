import Link from "next/link";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { LogoIcon } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

type HelpShellProps = {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function HelpShell({ children, backHref = "/help", backLabel = "All topics" }: HelpShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-6">
          <Link href="/help" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <LogoIcon className="h-8 w-8 shrink-0" />
            <div className="flex flex-col">
              <BrandWordmark className="text-base leading-none" />
              <span className="text-[11px] text-muted-foreground">Help Center</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {backLabel}
              </Link>
            </Button>
            <Button variant="hero" size="sm" className="rounded-xl" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Still stuck? We are here to help.</p>
          <a
            href="mailto:support@easysubmit.ai"
            className="inline-flex items-center gap-2 text-foreground transition-colors hover:text-primary"
          >
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            support@easysubmit.ai
          </a>
        </div>
        <p className="mx-auto mt-4 max-w-5xl px-6 text-xs text-muted-foreground">
          {BRAND.full} ·{" "}
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </p>
      </footer>
    </div>
  );
}
