import type { Metadata } from "next";
import Link from "next/link";
import { Info, Zap, FileText, Briefcase, Puzzle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `About | ${BRAND.full}`,
  description: `What ${BRAND.full} does — ATS-first resumes, AI enhance, Job Tracker, and Chrome extension autofill.`,
};

type AboutStep = {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
};

const steps: AboutStep[] = [
  {
    icon: FileText,
    title: "Build your resume profile",
    description:
      "Import your existing resume or build from scratch. EasySubmit structures it to pass ATS parsing on any platform.",
  },
  {
    icon: Zap,
    title: "AI-enhance for every job",
    description:
      "Paste a job description and the AI engine tailors your resume — keywords, bullet strength, and skills coverage — automatically.",
  },
  {
    icon: Briefcase,
    title: "Track every application",
    description:
      "Job Tracker keeps all your tailored resumes, application stages, and follow-ups in one pipeline.",
  },
  {
    icon: Puzzle,
    title: "Autofill with one click",
    description:
      "The Chrome extension fills any application form from your resume profile — no copy-pasting between tabs.",
    href: "/extension",
    linkLabel: "Get the extension",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-8">
      <div className="flex items-center gap-3">
        <Info className="h-6 w-6 shrink-0 text-mint" aria-hidden="true" />
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">About EasySubmit</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            ATS-first resumes and end-to-end job application automation.
          </p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {BRAND.full} is built around one goal: give every job seeker a resume that beats competitors on ATS
        quality and automates the application process end-to-end. No templates that look good but parse
        poorly. No keyword stuffing. Just structured, honest resumes that modern hiring systems actually
        read. See{" "}
        <Link
          href="/dashboard/ats-guidelines"
          className="text-foreground underline underline-offset-2 transition-colors hover:text-mint"
        >
          ATS Guidelines
        </Link>{" "}
        for the rules EasySubmit enforces on every export.
      </p>

      <div className="space-y-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
          How it works
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((step) => (
            <div
              key={step.title}
              className="space-y-2 rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-2">
                <step.icon className="h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">{step.title}</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              {step.href && step.linkLabel ? (
                <Button variant="mint" size="sm" className="mt-1" asChild>
                  <Link href={step.href}>{step.linkLabel}</Link>
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-foreground">
              <Puzzle className="h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
                Install extension
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Save jobs, tailor resumes, and autofill any application form from your browser — without
              leaving the career site.
            </p>
          </div>
          <Button variant="mint" size="sm" className="shrink-0 sm:min-w-[8.5rem]" asChild>
            <Link href="/extension">Get the extension</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-1 rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-foreground">
          Contact & support
        </h2>
        <p className="text-sm text-muted-foreground">
          Questions, bugs, or feature ideas?{" "}
          <a
            href="mailto:support@easysubmit.ai"
            className="text-foreground underline underline-offset-2 transition-colors hover:text-mint"
          >
            support@easysubmit.ai
          </a>
        </p>
        <p className="text-sm text-muted-foreground">
          Manage your account, AI keys, and preferences in{" "}
          <Link
            href="/dashboard/settings"
            className="text-foreground underline underline-offset-2 transition-colors hover:text-mint"
          >
            Settings
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
        <Link
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-foreground"
        >
          Privacy Policy
        </Link>
        <span className="text-border" aria-hidden="true">
          |
        </span>
        <Link
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-foreground"
        >
          Terms of Service
        </Link>
        <span className="ml-auto">&copy; {new Date().getFullYear()} {BRAND.full}</span>
      </div>
    </div>
  );
}
