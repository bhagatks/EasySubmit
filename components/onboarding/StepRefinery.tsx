"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Briefcase,
  FolderKanban,
  Pencil,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
} from "react-hook-form";
import { saveProfile } from "@/app/actions/save-profile";
import { cn } from "@/lib/utils";
import {
  buildRefineryDefaults,
  type RefineryFormValues,
  type RefineryVerifiedFields,
} from "@/lib/resume/refineryDefaults";
import { useOnboardingStore } from "@/stores/onboardingStore";

const PRIMARY = "oklch(0.62 0.21 265)";
const MINT = "oklch(0.82 0.16 165)";
const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-[oklch(0.82_0.16_165_/_0.45)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.82_0.16_165_/_0.3)]";

function PreviewPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground/50 italic">{children}</span>
  );
}

function DigitalResumePreview({
  fullName,
  title,
  email,
  phone,
  location,
  coreCompetencies,
  technicalSkills,
  experiences,
}: {
  fullName: string;
  title: string | null;
  email: string;
  phone: string;
  location: string;
  coreCompetencies: string[];
  technicalSkills: string[];
  experiences: RefineryFormValues["experiences"];
}) {
  const contactParts = [email, phone, location].filter(Boolean);
  const visibleExperiences = experiences.filter(
    (entry) => entry.title.trim() || entry.company.trim(),
  );
  const allSkills = [...coreCompetencies, ...technicalSkills];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-[oklch(0.62_0.21_265_/_0.06)] shadow-elevated backdrop-blur-2xl">
      <div className="border-b border-white/10 px-6 py-4">
        <p
          className="font-body text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: PRIMARY }}
        >
          Digital Resume Preview
        </p>
        <p className="mt-1 font-body text-xs text-muted-foreground">
          Live view of your structured profile data
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <header className="border-b border-white/10 pb-6">
          <h2
            className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ color: PRIMARY }}
          >
            {fullName.trim() || <PreviewPlaceholder>Your name</PreviewPlaceholder>}
          </h2>
          <p
            className="mt-2 font-display text-lg font-medium"
            style={{ color: PRIMARY }}
          >
            {title?.trim() || (
              <PreviewPlaceholder>Target role or title</PreviewPlaceholder>
            )}
          </p>
          {contactParts.length > 0 ? (
            <p className="mt-4 font-body text-sm leading-relaxed text-muted-foreground">
              {contactParts.join(" · ")}
            </p>
          ) : (
            <p className="mt-4 font-body text-sm text-muted-foreground/50 italic">
              Contact details will appear here
            </p>
          )}
        </header>

        <section className="mt-8">
          <h3
            className="font-body text-xs font-semibold uppercase tracking-[0.16em]"
            style={{ color: PRIMARY }}
          >
            Skills
          </h3>
          {allSkills.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {allSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex rounded-xl border border-[oklch(0.82_0.16_165_/_0.35)] bg-[oklch(0.82_0.16_165_/_0.12)] px-3 py-1.5 font-body text-xs font-medium text-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 font-body text-sm text-muted-foreground/50 italic">
              Add skills in Engine Tuning to populate badges
            </p>
          )}
        </section>

        <section className="mt-8">
          <h3
            className="font-body text-xs font-semibold uppercase tracking-[0.16em]"
            style={{ color: PRIMARY }}
          >
            Experience
          </h3>
          {visibleExperiences.length > 0 ? (
            <ul className="mt-4 space-y-5">
              {visibleExperiences.map((entry) => (
                <li
                  key={entry.id}
                  className="relative border-l-2 border-[oklch(0.82_0.16_165_/_0.45)] pl-4"
                >
                  <p
                    className="font-display text-base font-semibold text-foreground"
                  >
                    {entry.title.trim() || (
                      <PreviewPlaceholder>Role title</PreviewPlaceholder>
                    )}
                  </p>
                  <p className="mt-0.5 font-body text-sm text-muted-foreground">
                    {entry.company.trim() || (
                      <PreviewPlaceholder>Company</PreviewPlaceholder>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 font-body text-sm text-muted-foreground/50 italic">
              Experience entries will appear here as you add them
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function VerifiedLabel({
  htmlFor,
  label,
  verified,
}: {
  htmlFor?: string;
  label: string;
  verified?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 flex items-center gap-2 font-body text-sm font-medium text-foreground"
    >
      {label}
      {verified && (
        <BadgeCheck
          className="h-4 w-4 shrink-0"
          style={{ color: MINT }}
          aria-label="Verified from resume"
        />
      )}
    </label>
  );
}

function TagCloud({
  label,
  verified,
  tags,
  onChange,
  placeholder,
}: {
  label: string;
  verified?: boolean;
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
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
      <VerifiedLabel label={label} verified={verified} />
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
        <div className="flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {tags.map((tag) => (
              <motion.span
                key={tag}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[oklch(0.82_0.16_165_/_0.35)] bg-[oklch(0.82_0.16_165_/_0.1)] px-3 py-1.5 font-body text-xs font-medium text-foreground"
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
            placeholder={placeholder}
            className={cn(INPUT_CLASS, "flex-1")}
          />
          <button
            type="button"
            onClick={addTag}
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-body text-xs font-semibold text-foreground transition-colors hover:border-[oklch(0.82_0.16_165_/_0.35)]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function ExperienceCard({
  index,
  title,
  company,
  parsed,
  isEditing,
  onToggleEdit,
  register,
}: {
  index: number;
  title: string;
  company: string;
  parsed?: boolean;
  isEditing: boolean;
  onToggleEdit: () => void;
  register: ReturnType<typeof useForm<RefineryFormValues>>["register"];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface/60 p-4 shadow-sm backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 shrink-0" style={{ color: MINT }} aria-hidden="true" />
            {!isEditing ? (
              <>
                <p className="truncate font-display text-sm font-semibold text-foreground">
                  {title || "Role title"}
                </p>
                {parsed && (
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0" style={{ color: MINT }} aria-hidden="true" />
                )}
              </>
            ) : null}
          </div>
          {!isEditing && (
            <p className="mt-1 truncate font-body text-xs text-muted-foreground">
              {company || "Company"}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleEdit}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-body text-xs font-medium text-foreground transition-colors hover:border-[oklch(0.62_0.21_265_/_0.35)]"
        >
          <Pencil className="h-3 w-3" aria-hidden="true" />
          {isEditing ? "Done" : "Edit"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted-foreground">
                  Title
                </label>
                <input
                  {...register(`experiences.${index}.title`)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted-foreground">
                  Company
                </label>
                <input
                  {...register(`experiences.${index}.company`)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProjectCard({
  index,
  name,
  parsed,
  isEditing,
  onToggleEdit,
  register,
}: {
  index: number;
  name: string;
  parsed?: boolean;
  isEditing: boolean;
  onToggleEdit: () => void;
  register: ReturnType<typeof useForm<RefineryFormValues>>["register"];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface/60 p-4 shadow-sm backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FolderKanban className="h-4 w-4 shrink-0" style={{ color: MINT }} aria-hidden="true" />
          {!isEditing && (
            <>
              <p className="truncate font-display text-sm font-semibold text-foreground">
                {name || "Project name"}
              </p>
              {parsed && (
                <BadgeCheck className="h-3.5 w-3.5 shrink-0" style={{ color: MINT }} aria-hidden="true" />
              )}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleEdit}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-body text-xs font-medium text-foreground transition-colors hover:border-[oklch(0.62_0.21_265_/_0.35)]"
        >
          <Pencil className="h-3 w-3" aria-hidden="true" />
          {isEditing ? "Done" : "Edit"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted-foreground">
                  Project name
                </label>
                <input
                  {...register(`projects.${index}.name`)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted-foreground">
                  Description
                </label>
                <textarea
                  {...register(`projects.${index}.description`)}
                  rows={2}
                  className={cn(INPUT_CLASS, "resize-none")}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface StepRefineryProps {
  formId?: string;
  hideSubmitButton?: boolean;
  /** Hide built-in preview when parent renders PrimeResume on a shared canvas. */
  hidePreview?: boolean;
  onValidityChange?: (valid: boolean) => void;
  onResumeChange?: (values: RefineryFormValues) => void;
  onNext?: () => void;
}

export default function StepRefinery({
  formId,
  hideSubmitButton = false,
  hidePreview = false,
  onValidityChange,
  onResumeChange,
  onNext,
}: StepRefineryProps) {
  const { data: session, update: updateSession } = useSession();
  const parsedResumeData = useOnboardingStore((s) => s.parsedResumeData);
  const selectedRole = useOnboardingStore((s) => s.selectedRole);
  const minSalary = useOnboardingStore((s) => s.minSalary);
  const workMode = useOnboardingStore((s) => s.workMode);
  const setRefineryDraft = useOnboardingStore((s) => s.setRefineryDraft);

  const { values: defaultValues, verified } = useMemo(
    () =>
      buildRefineryDefaults({
        parsed: parsedResumeData,
        sessionName: session?.user?.name,
        sessionEmail: session?.user?.email,
      }),
    [parsedResumeData, session?.user?.email, session?.user?.name],
  );

  const verifiedRef = useMemo(() => verified satisfies RefineryVerifiedFields, [verified]);

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid, isSubmitting },
  } = useForm<RefineryFormValues>({
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const {
    fields: experienceFields,
    append: appendExperience,
  } = useFieldArray({ control, name: "experiences" });

  const {
    fields: projectFields,
    append: appendProject,
  } = useFieldArray({ control, name: "projects" });

  const [editingExperienceIds, setEditingExperienceIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [editingProjectIds, setEditingProjectIds] = useState<Set<string>>(
    () => new Set(),
  );

  const watchedExperiences = watch("experiences");
  const watchedProjects = watch("projects");
  const previewFullName = watch("fullName");
  const previewEmail = watch("email");
  const previewPhone = watch("phone");
  const previewLocation = watch("location");
  const previewCoreCompetencies = watch("coreCompetencies");
  const previewTechnicalSkills = watch("technicalSkills");

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  useEffect(() => {
    if (!onResumeChange) return;

    onResumeChange({
      fullName: previewFullName,
      email: previewEmail,
      phone: previewPhone,
      location: previewLocation,
      coreCompetencies: previewCoreCompetencies,
      technicalSkills: previewTechnicalSkills,
      experiences: watchedExperiences,
      projects: watchedProjects,
    });
  }, [
    onResumeChange,
    previewCoreCompetencies,
    previewEmail,
    previewFullName,
    previewLocation,
    previewPhone,
    previewTechnicalSkills,
    watchedExperiences,
    watchedProjects,
  ]);

  async function onSubmit(data: RefineryFormValues) {
    try {
      const result = await saveProfile({
        ...data,
        targetTitle: selectedRole,
        minSalary,
        workMode,
        resumeRawText: parsedResumeData?.rawText ?? null,
        linkedIn: parsedResumeData?.linkedIn ?? null,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setRefineryDraft(data);
      await updateSession({ onboardingStep: result.onboardingStep });
      onNext?.();
    } catch {
      // Parent can surface errors via form state in a follow-up if needed.
    }
  }

  function toggleExperienceEdit(id: string) {
    setEditingExperienceIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleProjectEdit(id: string) {
    setEditingProjectIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex w-full flex-col">
      <div className="mb-6 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1 font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="h-3 w-3" style={{ color: MINT }} aria-hidden="true" />
          Engine Refinery
        </span>
      </div>

      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Refine your profile data
      </h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-muted-foreground">
        {hidePreview
          ? "Your structured profile is your primary asset. Tune each field and watch your resume update on the canvas."
          : "Your structured profile is your primary asset. Tune fields on the right and watch your digital resume update instantly on the left."}
      </p>

      <form
        id={formId}
        onSubmit={handleSubmit(onSubmit)}
        className={cn(
          "mt-6",
          hidePreview
            ? "flex min-h-[520px] flex-col"
            : "grid min-h-[520px] grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]",
        )}
      >
        {!hidePreview && (
          <section
            aria-label="Digital resume preview"
            className="lg:min-h-[560px]"
          >
            <DigitalResumePreview
              fullName={previewFullName}
              title={selectedRole}
              email={previewEmail}
              phone={previewPhone}
              location={previewLocation}
              coreCompetencies={previewCoreCompetencies}
              technicalSkills={previewTechnicalSkills}
              experiences={watchedExperiences}
            />
          </section>
        )}

        <section
          aria-label="Engine tuning"
          className={cn(
            "flex flex-col overflow-hidden",
            hidePreview
              ? "flex-1"
              : "rounded-2xl border border-white/10 bg-surface/60 shadow-elevated backdrop-blur-2xl",
          )}
        >
          <div className="border-b border-white/10 px-5 py-4">
            <p
              className="font-body text-xs font-medium uppercase tracking-[0.16em]"
              style={{ color: MINT }}
            >
              Engine Tuning
            </p>
            <p
              className="mt-1 font-display text-lg font-semibold"
              style={{ color: PRIMARY }}
            >
              Profile pillars
            </p>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <div className="space-y-4">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Essentials
              </p>

              <div>
                <VerifiedLabel htmlFor="refinery-full-name" label="Name" verified={verifiedRef.fullName} />
                <input
                  id="refinery-full-name"
                  {...register("fullName")}
                  className={INPUT_CLASS}
                  placeholder="Your full name"
                />
              </div>

              <div>
                <VerifiedLabel htmlFor="refinery-email" label="Email" verified={verifiedRef.email} />
                <input
                  id="refinery-email"
                  type="email"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address",
                    },
                  })}
                  className={cn(
                    INPUT_CLASS,
                    errors.email && "border-destructive/50 ring-1 ring-destructive/30",
                  )}
                  placeholder="you@email.com"
                />
                {errors.email && (
                  <p className="mt-1.5 font-body text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <VerifiedLabel htmlFor="refinery-phone" label="Phone" verified={verifiedRef.phone} />
                <input
                  id="refinery-phone"
                  {...register("phone")}
                  className={INPUT_CLASS}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <VerifiedLabel htmlFor="refinery-location" label="Location" verified={verifiedRef.location} />
                <input
                  id="refinery-location"
                  {...register("location")}
                  className={INPUT_CLASS}
                  placeholder="City, State or Country"
                />
              </div>
            </div>

            <div className="space-y-4">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Core pillars
              </p>

              <Controller
                control={control}
                name="coreCompetencies"
                render={({ field }) => (
                  <TagCloud
                    label="Core Competencies"
                    verified={verifiedRef.coreCompetencies}
                    tags={field.value}
                    onChange={field.onChange}
                    placeholder="Add competency…"
                  />
                )}
              />

              <Controller
                control={control}
                name="technicalSkills"
                render={({ field }) => (
                  <TagCloud
                    label="Technical Skills"
                    verified={verifiedRef.technicalSkills}
                    tags={field.value}
                    onChange={field.onChange}
                    placeholder="Add skill…"
                  />
                )}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Experience
                  {verifiedRef.experiences && (
                    <BadgeCheck
                      className="ml-1.5 inline h-3.5 w-3.5 align-text-bottom"
                      style={{ color: MINT }}
                      aria-label="Experience parsed"
                    />
                  )}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    appendExperience({
                      id: `exp-new-${Date.now()}`,
                      title: "",
                      company: "",
                      parsed: false,
                    })
                  }
                  className="font-body text-xs font-medium text-[oklch(0.62_0.21_265)]"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-3">
                {experienceFields.length === 0 && (
                  <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center font-body text-xs text-muted-foreground">
                    No roles detected — add experience manually.
                  </p>
                )}
                {experienceFields.map((field, index) => (
                  <ExperienceCard
                    key={field.id}
                    index={index}
                    title={watchedExperiences[index]?.title ?? ""}
                    company={watchedExperiences[index]?.company ?? ""}
                    parsed={field.parsed}
                    isEditing={editingExperienceIds.has(field.id)}
                    onToggleEdit={() => toggleExperienceEdit(field.id)}
                    register={register}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Projects
                  {verifiedRef.projects && (
                    <BadgeCheck
                      className="ml-1.5 inline h-3.5 w-3.5 align-text-bottom"
                      style={{ color: MINT }}
                      aria-label="Projects parsed"
                    />
                  )}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    appendProject({
                      id: `proj-new-${Date.now()}`,
                      name: "",
                      description: "",
                      parsed: false,
                    })
                  }
                  className="font-body text-xs font-medium text-[oklch(0.62_0.21_265)]"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-3">
                {projectFields.length === 0 && (
                  <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center font-body text-xs text-muted-foreground">
                    No projects detected — add one if applicable.
                  </p>
                )}
                {projectFields.map((field, index) => (
                  <ProjectCard
                    key={field.id}
                    index={index}
                    name={watchedProjects[index]?.name ?? ""}
                    parsed={field.parsed}
                    isEditing={editingProjectIds.has(field.id)}
                    onToggleEdit={() => toggleProjectEdit(field.id)}
                    register={register}
                  />
                ))}
              </div>
            </div>
          </div>

          {!hideSubmitButton && (
            <div className="border-t border-white/10 px-5 py-4">
              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="w-full rounded-xl bg-[oklch(0.62_0.21_265)] px-6 py-3 font-body text-sm font-semibold text-[oklch(0.98_0.01_250)] shadow-[0_0_40px_-12px_oklch(0.62_0.21_265_/_0.55)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? "Saving tune…" : "Continue to calibration"}
              </button>
            </div>
          )}
        </section>
      </form>
    </div>
  );
}
