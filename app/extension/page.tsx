import Link from "next/link";
import {
  Check,
  Globe,
  Download,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { ExtensionCardMock } from "@/components/marketing/ExtensionCardMock";
import { BRAND } from "@/lib/brand";
import { getExtensionStoreUrl } from "@/lib/extension/force-upgrade-gate";
import { PRICING_PAGE_COPY } from "@/lib/pricing/plan-display";

export const metadata = {
  title: `${BRAND.full} Chrome Extension — Tailor resumes on any job page`,
  description: PRICING_PAGE_COPY.metaDescription,
};

const supported = [
  "LinkedIn",
  "Indeed",
  "Workday",
  "Greenhouse",
  "Lever",
  "Ashby",
  "Taleo",
  "iCIMS",
  "SmartRecruiters",
  "Jobvite",
  "BambooHR",
  "SuccessFactors",
];

const extensionFeatures = [
  {
    icon: Zap,
    title: "Tailor every resume to the job",
    body: "Capture the listing and tailor your resume to the role without leaving the tab.",
  },
  {
    icon: ShieldCheck,
    title: "Chrome extension — capture jobs and preview on site",
    body: "Preview resume and cover letter in the extension before you download or continue.",
  },
  {
    icon: Check,
    title: "Extension and dashboard stay in sync",
    body: "Saved roles sync to your job tracker so nothing gets lost in open tabs.",
  },
] as const;

export default async function ExtensionPage() {
  const storeUrl = await getExtensionStoreUrl();

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar storeUrl={storeUrl} />

      <section className="relative flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden bg-hero">
        <div className="bg-grid absolute inset-0 opacity-50" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-10 md:py-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Globe className="h-3 w-3 text-mint" /> Chrome · Edge · Brave · Arc
            </div>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
              Tailor and track from <span className="text-gradient">any job page</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              {PRICING_PAGE_COPY.subhead}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="xl" asChild>
                <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-5 w-5" /> Add to Chrome — Free
                </a>
              </Button>
              <Link href="/pricing">
                <Button variant="outline" size="xl">
                  View pricing
                </Button>
              </Link>
            </div>
            <p className="mt-3 font-dm text-xs text-muted-foreground">
              {PRICING_PAGE_COPY.footerDailyLimit}
            </p>
          </div>

          <div className="flex items-center justify-center lg:justify-end">
            <ExtensionCardMock />
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-background py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Works everywhere you apply.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {supported.map((s) => (
              <span
                key={s}
                className="rounded-full border border-border bg-surface/60 px-4 py-2 font-dm text-sm text-muted-foreground"
              >
                {s}
              </span>
            ))}
            <span className="rounded-full border border-mint/40 bg-mint/10 px-4 py-2 font-dm text-sm text-mint">
              Works on LinkedIn, Indeed, Workday, Greenhouse, and more
            </span>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {extensionFeatures.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-surface/60 p-6 transition hover:border-primary/50"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 font-dm text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            {PRICING_PAGE_COPY.footerPaidComingSoon}{" "}
            <Link href="/pricing" className="underline underline-offset-2 hover:text-foreground">
              See full pricing →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
