import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Chrome,
  Download,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/extension")({
  head: () => ({
    meta: [
      { title: "EasySubmit Chrome Extension — One-click apply, anywhere" },
      {
        name: "description",
        content:
          "Autofill any job application with a tailored, ATS-proof resume. Works on LinkedIn, Indeed, Workday, Greenhouse, and 2,000+ portals.",
      },
      { property: "og:title", content: "EasySubmit Chrome Extension" },
      {
        property: "og:description",
        content: "One-click autofill across every major job board. BYOK, free forever.",
      },
    ],
  }),
  component: ExtensionPage,
});

const supported = [
  "LinkedIn", "Indeed", "Workday", "Greenhouse", "Lever", "Ashby", "Taleo",
  "iCIMS", "SmartRecruiters", "Jobvite", "BambooHR", "SuccessFactors",
];

function ExtensionPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-glow">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-semibold">
              easysubmit<span className="text-mint">.ai</span>
            </span>
          </Link>
          <Link to="/app">
            <Button variant="hero" size="sm">Open dashboard <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-hero">
        <div className="bg-grid absolute inset-0 opacity-50" />
        <div className="relative mx-auto grid max-w-7xl gap-16 px-6 py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Chrome className="h-3 w-3 text-mint" /> Chrome · Edge · Brave · Arc
            </div>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Apply to any job in <span className="text-gradient">one click</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              The EasySubmit extension reads the job description, tailors your resume on the fly,
              and fills the application form — across every major ATS.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="xl">
                <Download className="h-5 w-5" /> Add to Chrome — Free
              </Button>
              <Button variant="outline" size="xl">Watch 30s demo</Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Open source · No tracking · Your AI key stays local.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-primary/30 to-mint/20 blur-3xl" />
            <div className="relative rounded-2xl border border-border bg-surface shadow-elevated">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-mint/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-primary/70" />
                <div className="ml-3 flex-1 truncate rounded-md bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                  jobs.workday.com/apply/senior-product-manager
                </div>
              </div>
              <div className="grid gap-4 p-6">
                {[
                  { label: "Full name", value: "Alex Rivera" },
                  { label: "Email", value: "alex@rivera.dev" },
                  { label: "Resume", value: "resume_senior-pm_tailored.pdf", chip: "Tailored 98/100" },
                  { label: "Why this role?", value: "Generated from JD · 142 words", chip: "AI" },
                ].map((f) => (
                  <div key={f.label} className="rounded-lg border border-border bg-background/40 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {f.label}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-sm text-foreground">{f.value}</div>
                      {f.chip && (
                        <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-medium text-mint">
                          {f.chip}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <Button variant="mint" className="mt-2 w-full">
                  <MousePointerClick className="h-4 w-4" /> Autofill & review
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Works everywhere you apply.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {supported.map((s) => (
              <span
                key={s}
                className="rounded-full border border-border bg-surface/60 px-4 py-2 text-sm text-muted-foreground"
              >
                {s}
              </span>
            ))}
            <span className="rounded-full border border-mint/40 bg-mint/10 px-4 py-2 text-sm text-mint">
              + 2,000 more
            </span>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {[
              { icon: Zap, title: "60 seconds per application", body: "From JD to submitted in under a minute." },
              { icon: ShieldCheck, title: "Review before submit", body: "Every field is human-verified. Nothing fires blindly." },
              { icon: Check, title: "Track everything", body: "Every applied role syncs back to your dashboard." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-surface/60 p-6">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
