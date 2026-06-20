"use client";

import { JetBrains_Mono } from "next/font/google";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Sparkles, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  PrimeResume,
  type PrimeResumeData,
} from "@/components/onboarding/PrimeResume";
import { buildRefineryDefaults } from "@/lib/resume/refineryDefaults";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { SignOutButton } from "@/components/auth/SignOutButton";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

const PRIMARY = "oklch(0.62 0.21 265)";
const REFINERY_PROGRESS = 75;

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary/45 focus:outline-none focus:ring-1 focus:ring-primary/30";

type EngineTuningForm = {
  fullName: string;
  email: string;
  phone: string;
  skills: string[];
};

function EngineLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
      style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
    >
      {children}
    </label>
  );
}

function SkillsEditor({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const value = draft.trim();
    if (!value || tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...tags, value]);
    setDraft("");
  }

  return (
    <div>
      <EngineLabel>Skills</EngineLabel>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {tags.map((tag) => (
              <motion.span
                key={tag}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-foreground"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => onChange(tags.filter((item) => item !== tag))}
                  className="rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTag();
              }
            }}
            placeholder="Add skill…"
            className={cn(INPUT_CLASS, "flex-1")}
          />
          <button
            type="button"
            onClick={addTag}
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/35"
            style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function DigitalGhostScan() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2px]"
    >
      <div
        className="absolute inset-x-0 z-10 h-20 animate-scan"
        style={{
          background:
            "linear-gradient(180deg, transparent, oklch(0.62 0.21 265 / 0.1), oklch(0.99 0.002 268 / 0.35), oklch(0.62 0.21 265 / 0.1), transparent)",
        }}
      />
      <div className="absolute inset-x-0 z-20 h-px animate-scan bg-primary/50 shadow-[0_0_12px_oklch(0.62_0.21_265_/_0.45)]" />
    </div>
  );
}

export function RefineryWorkbench() {
  const { data: session } = useSession();
  const parsedResumeData = useOnboardingStore((s) => s.parsedResumeData);
  const refineryDraft = useOnboardingStore((s) => s.refineryDraft);
  const selectedRole = useOnboardingStore((s) => s.selectedRole);

  const { values: parsedDefaults } = useMemo(
    () =>
      buildRefineryDefaults({
        parsed: parsedResumeData,
        sessionFirstName: session?.user?.firstName,
        sessionLastName: session?.user?.lastName,
        sessionName: session?.user?.name,
        sessionEmail: session?.user?.email,
      }),
    [
      parsedResumeData,
      session?.user?.email,
      session?.user?.firstName,
      session?.user?.lastName,
      session?.user?.name,
    ],
  );

  const defaultSkills = useMemo(() => {
    if (refineryDraft) {
      return [
        ...refineryDraft.coreCompetencies,
        ...refineryDraft.technicalSkills,
      ];
    }
    return [
      ...parsedDefaults.coreCompetencies,
      ...parsedDefaults.technicalSkills,
    ];
  }, [parsedDefaults, refineryDraft]);

  const defaultValues = useMemo<EngineTuningForm>(
    () => ({
      fullName: refineryDraft?.fullName ?? parsedDefaults.fullName,
      email: refineryDraft?.email ?? parsedDefaults.email,
      phone: refineryDraft?.phone ?? parsedDefaults.phone,
      skills: defaultSkills,
    }),
    [defaultSkills, parsedDefaults, refineryDraft],
  );

  const staticExperiences = useMemo(
    () =>
      (refineryDraft?.experiences ?? parsedDefaults.experiences).map((entry) => ({
        id: entry.id,
        title: entry.title,
        company: entry.company,
      })),
    [parsedDefaults.experiences, refineryDraft?.experiences],
  );

  const { register, control, watch, reset } = useForm<EngineTuningForm>({
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const watchedFullName = watch("fullName");
  const watchedEmail = watch("email");
  const watchedPhone = watch("phone");
  const watchedSkills = watch("skills");

  const previewResume = useMemo<PrimeResumeData>(
    () => ({
      fullName: watchedFullName,
      headline: selectedRole,
      email: watchedEmail,
      phone: watchedPhone,
      location: refineryDraft?.location ?? parsedDefaults.location,
      skills: watchedSkills,
      experience: staticExperiences,
    }),
    [
      watchedEmail,
      watchedFullName,
      watchedPhone,
      watchedSkills,
      selectedRole,
      refineryDraft?.location,
      parsedDefaults.location,
      staticExperiences,
    ],
  );

  return (
    <div
      className={cn(
        jetbrainsMono.variable,
        "flex h-screen min-h-0 flex-col overflow-hidden",
      )}
    >
      <div
        className="h-1 w-full shrink-0 bg-surface"
        role="progressbar"
        aria-valuenow={REFINERY_PROGRESS}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Onboarding progress"
      >
        <div
          className="h-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${REFINERY_PROGRESS}%` }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section
          aria-label="Resume preview"
          className="relative min-h-0 flex-[3] overflow-y-auto bg-background px-4 py-6 sm:px-8 sm:py-10"
        >
          <div className="mx-auto flex h-full min-h-[min(70vh,720px)] w-full max-w-3xl items-center justify-center">
            <div className="relative w-full max-w-[min(100%,32rem)]">
              <PrimeResume resume={previewResume} className="min-h-[420px]" />
              <DigitalGhostScan />
            </div>
          </div>
        </section>

        <section
          aria-label="Engine tuning"
          className="flex min-h-0 flex-[2] flex-col border-t border-white/10 bg-surface lg:border-l lg:border-t-0"
        >
          <header className="shrink-0 border-b border-white/10 px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary"
                  style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
                >
                  <Sparkles className="mr-1.5 inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />
                  Engine Tuning
                </p>
                <h1 className="mt-2 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  Calibrate profile signals
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Edits sync live to your digital resume preview.
                </p>
              </div>
              <SignOutButton iconOnly />
            </div>
          </header>

          <form className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5 sm:px-6">
            <div className="space-y-5">
              <div>
                <EngineLabel htmlFor="refinery-name">Name</EngineLabel>
                <input
                  id="refinery-name"
                  {...register("fullName")}
                  className={INPUT_CLASS}
                  placeholder="Your full name"
                />
              </div>

              <div>
                <EngineLabel htmlFor="refinery-email">Email</EngineLabel>
                <input
                  id="refinery-email"
                  type="email"
                  {...register("email")}
                  className={INPUT_CLASS}
                  placeholder="you@email.com"
                />
              </div>

              <div>
                <EngineLabel htmlFor="refinery-phone">Phone</EngineLabel>
                <input
                  id="refinery-phone"
                  {...register("phone")}
                  className={INPUT_CLASS}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <Controller
                control={control}
                name="skills"
                render={({ field }) => (
                  <SkillsEditor tags={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
