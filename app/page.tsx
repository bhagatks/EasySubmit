import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  ChevronRight,
  FileText,
  Code2,
  Key,
  Puzzle,
  ShieldCheck,
  Target,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/ui/logo";
import { Navbar } from "@/components/Navbar";
import { PricingPlansSection } from "@/components/pricing/PricingPlansSection";
import { BRAND, brandCopyright, EXTENSION_STORE_URL } from "@/lib/brand";
import {

  PRICING_FAQ,
  PRICING_PAGE_COPY,
} from "@/lib/pricing/plan-display";

export const metadata = {
  title: `${BRAND.full} — AI Resume Tailoring that beats every ATS`,
  description: PRICING_PAGE_COPY.metaDescription,
  openGraph: {
    title: `${BRAND.full} — Beat every ATS, free with your own AI key`,
    description: PRICING_PAGE_COPY.metaDescription,
  },
};

export const dynamic = "force-dynamic";

const featureList = [
  { icon: Key, title: "Connect your own AI key" },
  { icon: Target, title: "Tailor every resume to the job" },
  { icon: ShieldCheck, title: "ATS score, keywords, and bullet quality" },
  { icon: Puzzle, title: "Chrome extension — capture jobs and preview on site" },
  { icon: FileText, title: "Export PDF, Word, and LaTeX" },
  { icon: Zap, title: "Autofill any job application in one click" },
] as const;

function Hero() {
  return (
    <section className="relative bg-hero">
      <div className="bg-grid absolute inset-0 opacity-60" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl flex-col justify-center px-6 pb-10 pt-12 md:pb-12 md:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Land interviews.
            <br />
            <span className="text-gradient">Beat every ATS.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            {PRICING_PAGE_COPY.subhead}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login">
              <Button variant="hero" size="xl">
                Start for Free <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href={EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="xl">
                <Puzzle className="h-5 w-5" /> Get Chrome Extension
              </Button>
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card. Bring your OpenAI / Anthropic / Gemini / Groq key.
          </p>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-4">
        <div className="relative mx-auto max-w-5xl">
          <div className="absolute -inset-x-20 -top-20 h-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated">
            <Image
              src="/assets/hero-resume.jpg"
              alt="ATS-optimized resume scanned by AI"
              width={1536}
              height={1152}
              className="h-auto w-full"
              priority
            />
          </div>
          <div className="pointer-events-none absolute inset-x-10 -bottom-6 h-12 rounded-full bg-mint/30 blur-2xl" />
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="relative scroll-mt-20 border-t border-border/60 pb-16 pt-8">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
            <Wand2 className="h-3 w-3 text-mint" /> Everything you need to apply
          </div>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Built for the way you actually job-hunt.
          </h2>
          <p className="mt-3 text-muted-foreground">{PRICING_PAGE_COPY.subhead}</p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featureList.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface/60 p-6 transition hover:border-primary/50 hover:bg-surface"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold leading-snug">{f.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AtsBand() {
  const scanners = ["Workday", "Greenhouse", "Lever", "Taleo", "iCIMS", "SuccessFactors", "Jobvite", "Ashby"];
  return (
    <section id="ats" className="relative scroll-mt-20 border-t border-border/60 py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint/10 px-3 py-1 text-xs text-mint">
            <ShieldCheck className="h-3 w-3" /> ATS Guarantee
          </div>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Parsed perfectly by every scanner. <span className="text-gradient">Or it's on us.</span>
          </h2>
          <p className="mt-5 text-muted-foreground">
            Every resume is rendered, exported as PDF, and re-parsed through real ATS engines.
            We verify name, email, every job, every date, every skill comes back intact —
            before you ever hit submit.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Real ATS round-trip parse (not a keyword checker)",
              "Score against the exact job description",
              "Auto-fix unicode glyphs, columns, and tables that break parsers",
              "Recruiter-readable formatting that scores 95+ on every scanner",
            ].map((p) => (
              <li key={p} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                <span className="text-foreground/90">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/30 to-mint/20 blur-2xl" />
          <div className="relative rounded-2xl border border-border bg-surface p-6 shadow-elevated">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">resume_senior-pm.pdf</span>
              </div>
              <span className="rounded-full bg-mint/15 px-2 py-0.5 text-xs font-medium text-mint">
                98 / 100
              </span>
            </div>
            <div className="mt-5 space-y-4">
              {[
                { label: "Keyword match", value: 96 },
                { label: "ATS parse integrity", value: 100 },
                { label: "Impact quantification", value: 92 },
                { label: "Recruiter readability", value: 95 },
              ].map((m) => (
                <div key={m.label}>
                  <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>{m.label}</span>
                    <span className="text-foreground">{m.value}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-mint"
                      style={{ width: `${m.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-4 gap-2 border-t border-border pt-5">
              {scanners.map((s) => (
                <div
                  key={s}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-background/40 px-2 py-1.5 text-[10px] text-muted-foreground"
                >
                  <Check className="h-3 w-3 text-mint" /> {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ByokBand() {
  const providers = ["OpenAI", "Anthropic", "Gemini", "Groq", "DeepSeek", "OpenRouter"];
  return (
    <section id="byok" className="relative scroll-mt-20 border-t border-border/60 py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Key className="h-3 w-3" /> BYOK
          </div>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Your key. <span className="text-gradient">Your control.</span>
          </h2>
          <p className="mt-5 text-muted-foreground">
            Bring Your Own Key — connect your API key from any major provider. You pay the AI
            provider directly (typically cents per resume). EasySubmit handles tailoring, ATS
            scoring, and the extension workflow.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Free forever with your own key — no credit card",
              "Choose the model you trust for each enhance",
              "Keys are vaulted securely — never stored in plain text",
              "Prefer hands-off? Paid plans with EasySubmit AI are coming soon",
            ].map((p) => (
              <li key={p} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                <span className="text-foreground/90">{p}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link href="/login">
              <Button variant="hero" size="lg">
                Connect your key <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/25 to-mint/15 blur-2xl" />
          <div className="relative rounded-2xl border border-border bg-surface p-6 shadow-elevated">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Supported providers
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {providers.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2.5 text-sm"
                >
                  <Key className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  {name}
                </div>
              ))}
            </div>
            <p className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
              {PRICING_FAQ.find((item) => item.q === "What is BYOK?")?.a}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section id="get-started" className="relative border-t border-border/60 py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-12 text-center shadow-elevated">
          <div className="bg-grid absolute inset-0 opacity-40" />
          <div className="absolute -top-20 left-1/2 h-60 w-[80%] -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Your next offer is <span className="text-gradient">one resume</span> away.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              {PRICING_PAGE_COPY.subhead}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/login">
                <Button variant="hero" size="xl">
                  Start for Free <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="xl">
                  View pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <LogoIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
          <span>{brandCopyright(new Date().getFullYear())}</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/help" className="hover:text-foreground">Help</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <a href="#" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <Code2 className="h-4 w-4" /> Open source
          </a>
        </div>
      </div>
    </footer>
  );
}

export default async function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <AtsBand />
        <ByokBand />
        <PricingPlansSection id="pricing" className="border-t border-border/60 py-24" />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}