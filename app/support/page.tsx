import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LifeBuoy, Mail } from "lucide-react";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { LogoIcon } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Support | ${BRAND.full}`,
  description: `Get help with ${BRAND.full} — contact our support team.`,
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <LogoIcon className="h-8 w-8 shrink-0" />
          <BrandWordmark className="text-base leading-none" />
        </Link>

        <div className="rounded-xl border border-border bg-card/50 p-8 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <LifeBuoy className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">Support</h1>
          <p className="mt-3 text-muted-foreground">
            Need help with your account, the Chrome extension, or resume tailoring? Email us and
            we will get back to you as soon as we can.
          </p>

          <a
            href="mailto:support@easysubmit.ai"
            className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-surface/60 px-4 py-3 text-foreground transition-colors hover:border-primary/40 hover:bg-surface"
          >
            <Mail className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="font-medium">support@easysubmit.ai</span>
          </a>

          <Button variant="hero" size="lg" className="mt-6 w-full rounded-xl" asChild>
            <Link href="/dashboard">
              Go to dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
