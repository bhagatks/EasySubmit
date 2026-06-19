import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Brain,
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

export const metadata = {
  title: "EasySubmit.ai — AI Resume + Job Autofill that beats every ATS",
  description:
    "Generate ATS-proof, role-specific resumes and autofill any job application with your own AI key. Free forever, BYOK, guaranteed to pass every ATS scanner.",
  openGraph: {
    title: "EasySubmit.ai — Beat every ATS, free with your own AI key",
    description: "Custom resumes per job + one-click apply Chrome extension. BYOK, free daily usage, ATS-guaranteed.",
  },
};

function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="bg-grid absolute inset-0 opacity-60" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 md:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Land interviews.
            <br />
            <span className="text-gradient">Beat every ATS.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            EasySubmit crafts a custom, ATS-proof resume for every job and autofills the
            application in one click — using <span className="text-foreground">your own AI key</span>.
            Free, unlimited control, zero lock-in.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login">
              <Button variant="hero" size="xl">
                Start for Free <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/extension">
              <Button variant="outline" size="xl">
                <Puzzle className="h-5 w-5" /> Get Chrome Extension
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card. Bring your OpenAI / Anthropic / Gemini / Groq key.
          </p>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="absolute -inset-x-20 -top-20 h-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated">
            <Image
              src="/assets/hero-resume.jpg"
              alt="ATS-optimized resume scanned by AI"
              width={1536}
              height={1152}
              className="w-full"
              priority
            />
          </div>
          <div className="pointer-events-none absolute inset-x-10 -bottom-6 h-12 rounded-full bg-mint/30 blur-2xl" />
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: Target,
    title: "Per-job tailored resumes",
    body: "Paste a JD — get a resume rewritten around the role's keywords, scoped to your real experience. Never generic, never overclaimed.",
  },
  {
    icon: ShieldCheck,
    title: "ATS-guaranteed format",
    body: "Parsed and re-parsed against Workday, Greenhouse, Lever, Taleo, iCIMS. If a scanner mangles it, we refund — there is no refund needed.",
  },
  {
    icon: Puzzle,
    title: "One-click autofill",
    body: "Chrome extension fills any application form across LinkedIn, Indeed, Workday, and 2,000+ career portals — verified before submit.",
  },
  {
    icon: Key,
    title: "Bring your own AI key",
    body: "OpenAI, Anthropic, Gemini, Groq, or local. Your key, your usage, your data. We never proxy or store prompts.",
  },
  {
    icon: Brain,
    title: "Best-in-class resume engine",
    body: "Trained on 50k recruiter-rated resumes. Scores impact lines, quantifies vague bullets, and surfaces missing keywords.",
  },
  {
    icon: Zap,
    title: "Apply 10× faster",
    body: "Track every application, tailor variants, and submit a polished resume in under 60 seconds per role.",
  },
];

function Features() {
  return (
    <section id="features" className="relative border-t border-border/60 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
            <Wand2 className="h-3 w-3 text-mint" /> Everything you need to apply
          </div>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Built for the way you actually job-hunt.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Resume tailoring, ATS scoring, and one-click autofill — connected end to end.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface/60 p-6 transition hover:border-primary/50 hover:bg-surface"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
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
    <section id="ats" className="relative border-t border-border/60 py-24">
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
  return (
    <section id="byok" className="relative border-t border-border/60 py-24">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground">
          <Key className="h-3 w-3 text-primary" /> BYOK — Bring Your Own Key
        </div>
        <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Simplify.jobs charges. <br />
          <span className="text-gradient">We give you the keys.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
          Plug in your own OpenAI, Anthropic, Gemini, or Groq key. Pay cents per resume
          directly to the provider. Free daily quota included so you can apply without setup.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { name: "Free forever", price: "$0", body: "20 tailored resumes / day on our keys. No card." },
            { name: "BYOK", price: "$0", body: "Unlimited usage, your key, your data. Recommended." , highlight: true},
            { name: "Teams", price: "Soon", body: "Shared resume library + recruiter outreach." },
          ].map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl border p-6 text-left ${
                t.highlight
                  ? "border-primary/60 bg-surface shadow-glow"
                  : "border-border bg-surface/60"
              }`}
            >
              {t.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-mint px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-mint-foreground">
                  Recommended
                </span>
              )}
              <div className="text-sm text-muted-foreground">{t.name}</div>
              <div className="mt-2 font-display text-4xl font-semibold">{t.price}</div>
              <p className="mt-3 text-sm text-muted-foreground">{t.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section id="pricing" className="relative border-t border-border/60 py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-12 text-center shadow-elevated">
          <div className="bg-grid absolute inset-0 opacity-40" />
          <div className="absolute -top-20 left-1/2 h-60 w-[80%] -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Your next offer is <span className="text-gradient">one click</span> away.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join thousands using EasySubmit to outsmart the ATS — for free, with their own AI.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/login">
                <Button variant="hero" size="xl">
                  Start for Free <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/extension">
                <Button variant="mint" size="xl">
                  <Puzzle className="h-5 w-5" /> Install Extension
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
          <span>© {new Date().getFullYear()} EasySubmit.ai</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
          <a href="#" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <Code2 className="h-4 w-4" /> Open source
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <AtsBand />
        <ByokBand />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}