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

export const metadata = {
  title: `${BRAND.full} Chrome Extension — One-click apply, anywhere`,
  description:
    "Autofill any job application with a tailored, ATS-proof resume. Works on LinkedIn, Indeed, Workday, Greenhouse, and 2,000+ portals.",
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

export default function ExtensionPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar />

      <section className="relative overflow-hidden bg-hero">
        <div className="bg-grid absolute inset-0 opacity-50" />
        <div className="relative mx-auto grid max-w-7xl gap-16 px-6 py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Globe className="h-3 w-3 text-mint" /> Chrome · Edge · Brave · Arc
            </div>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
              Apply to any job in <span className="text-gradient">one click</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              The {BRAND.full} extension reads the job description, tailors your resume on the fly,
              and fills the application form — across every major ATS.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="xl">
                <Download className="h-5 w-5" /> Add to Chrome — Free
              </Button>
              <Button variant="outline" size="xl">
                Watch 30s demo
              </Button>
            </div>
            <p className="mt-3 font-dm text-xs text-muted-foreground">
              Open source · No tracking · Your AI key stays local.
            </p>
          </div>

          <ExtensionCardMock />
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
              + 2,000 more
            </span>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Zap,
                title: "60 seconds per application",
                body: "From JD to submitted in under a minute.",
              },
              {
                icon: ShieldCheck,
                title: "Review before submit",
                body: "Every field is human-verified. Nothing fires blindly.",
              },
              {
                icon: Check,
                title: "Track everything",
                body: "Every applied role syncs back to your dashboard.",
              },
            ].map((f) => (
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
        </div>
      </section>
    </div>
  );
}
