"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { CityStateField } from "@/components/onboarding/hub/CityStateField";
import { DateRangeFields } from "@/components/onboarding/hub/DateRangeFields";
import { PhoneField } from "@/components/onboarding/hub/PhoneField";
import { StudioSkillsField } from "@/components/onboarding/hub/StudioSkillsField";
import { LanguagesField } from "@/components/onboarding/hub/LanguagesField";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { getWorkbenchPhase, workbenchPhaseHeader } from "@/lib/onboarding/workbenchPhases";
import { DEFAULT_DIAL_CODE } from "@/lib/phone/countryCodes";
import {
  formatFullPhone,
  formatNationalNumber,
  isValidPhoneNumber,
  splitPhoneNumber,
} from "@/lib/phone/phone";
import {
  EXPERIENCE_BULLET_PLACEHOLDER,
  RESUME_SECTION_TITLES,
  SUMMARY_PLACEHOLDER,
} from "@/lib/resume/resumeSpec";
import { TargetRoleField } from "@/components/onboarding/hub/TargetRoleField";
import { MIN_STUDIO_SKILLS, selectCanProceedToCalibration } from "@/lib/onboarding/studio";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { cn } from "@/lib/utils";

const PRIMARY = "oklch(0.62 0.21 265)";
const MINT = "oklch(0.82 0.16 165)";
const MUTED = "oklch(0.45 0.02 268)";

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-[oklch(0.98_0.01_268)] placeholder:text-[oklch(0.45_0.02_268)] transition-colors focus:border-[oklch(0.62_0.21_265_/_0.5)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.62_0.21_265_/_0.35)]";

type RefineryPanelProps = {
  initialValues: HubRefineryForm;
  rawText?: string | null;
  monoClass: string;
  onChange: (values: HubRefineryForm) => void;
  onFinalize: (values: HubRefineryForm) => void;
  onBack?: () => void;
  /** Dashboard resume profile studio — local skills + target role field. */
  mode?: "onboarding" | "profile";
  targetRole?: string;
  onTargetRoleChange?: (role: string) => void;
  studioSkills?: string[];
  onStudioSkillsChange?: (skills: string[]) => void;
  backLabel?: string;
  finalizeLabel?: string;
  headerTitle?: string;
  headerDescription?: string;
  phaseLabel?: string;
};

function SectionTitle({
  children,
  monoClass,
}: {
  children: React.ReactNode;
  monoClass: string;
}) {
  return (
    <p
      className={cn(
        monoClass,
        "mb-3 text-[11px] font-medium uppercase tracking-[0.18em]",
      )}
      style={{ color: MINT }}
    >
      {children}
    </p>
  );
}

function OptionalListSection({
  title,
  items,
  onAdd,
  onRemove,
  onUpdate,
  monoClass,
  placeholder,
}: {
  title: string;
  items: Array<{ id: string; text: string; hidden?: boolean }>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, text: string) => void;
  monoClass: string;
  placeholder: string;
}) {
  if (items.length === 0) {
    return (
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <SectionTitle monoClass={monoClass}>{title}</SectionTitle>
          <button
            type="button"
            onClick={onAdd}
            className={cn(
              monoClass,
              "text-[10px] font-semibold uppercase tracking-[0.12em]",
            )}
            style={{ color: PRIMARY }}
          >
            + Add
          </button>
        </div>
        <p className="text-xs" style={{ color: MUTED }}>
          Optional — omit if empty.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <SectionTitle monoClass={monoClass}>{title}</SectionTitle>
        <button
          type="button"
          onClick={onAdd}
          className={cn(
            monoClass,
            "text-[10px] font-semibold uppercase tracking-[0.12em]",
          )}
          style={{ color: PRIMARY }}
        >
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="flex gap-2">
            <input
              value={item.text}
              onChange={(event) => onUpdate(index, event.target.value)}
              className={INPUT_CLASS}
              placeholder={placeholder}
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="shrink-0 rounded-lg p-2 hover:bg-[oklch(0.65_0.2_25_/_0.12)]"
              style={{ color: MUTED }}
              aria-label={`Remove ${title} item`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RefineryPanel({
  initialValues,
  rawText,
  monoClass,
  onChange,
  onFinalize,
  onBack,
  mode = "onboarding",
  targetRole = "",
  onTargetRoleChange,
  studioSkills,
  onStudioSkillsChange,
  backLabel,
  finalizeLabel,
  headerTitle,
  headerDescription,
  phaseLabel,
}: RefineryPanelProps) {
  const [showRawText, setShowRawText] = useState(false);
  const onboardingCanProceed = useOnboardingStore(selectCanProceedToCalibration);
  const isProfileMode = mode === "profile";
  const localSkillCount = studioSkills?.length ?? 0;
  const canProceedToCalibration = isProfileMode
    ? localSkillCount >= MIN_STUDIO_SKILLS
    : onboardingCanProceed;
  const { register, control, handleSubmit, watch, reset, setValue } =
    useForm<HubRefineryForm>({
      defaultValues: initialValues,
      mode: "onChange",
    });

  const experienceFields = useFieldArray({ control, name: "experience" });
  const educationFields = useFieldArray({ control, name: "education" });
  const certFields = useFieldArray({ control, name: "certifications" });
  const projectFields = useFieldArray({ control, name: "projects" });
  const languageFields = useFieldArray({ control, name: "languages" });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const watched = watch();

  useEffect(() => {
    const subscription = watch((formValues) => {
      onChange(formValues as HubRefineryForm);
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange]);

  const phoneParts = splitPhoneNumber(watched.phone ?? "");
  const phoneValid = isValidPhoneNumber(
    phoneParts.dialCode || DEFAULT_DIAL_CODE,
    phoneParts.nationalNumber,
  );

  const isValid =
    watched.firstName?.trim().length > 0 &&
    phoneValid &&
    watched.email?.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watched.email?.trim() ?? "");

  const isProceedLocked = !canProceedToCalibration;
  const isProceedDisabled =
    !isValid ||
    isProceedLocked ||
    (isProfileMode && !targetRole.trim());

  const resolvedPhaseLabel = phaseLabel ?? workbenchPhaseHeader(3);
  const resolvedHeaderTitle = headerTitle ?? getWorkbenchPhase(3)?.headline ?? "Refine your resume";
  const resolvedHeaderDescription =
    headerDescription ?? getWorkbenchPhase(3)?.description ?? "";
  const resolvedBackLabel = backLabel ?? getWorkbenchPhase(2)?.label ?? "Import";
  const resolvedFinalizeLabel =
    finalizeLabel ??
    (isProfileMode ? "Save profile" : "Synthesize Architecture.");

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={cn(monoClass, "text-[11px] font-medium uppercase tracking-[0.2em]")}
            style={{ color: PRIMARY }}
          >
            <Sparkles className="mr-1.5 inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />
            {resolvedPhaseLabel}
          </p>
          <h2
            className="mt-3 font-display text-xl font-semibold tracking-tight sm:text-2xl"
            style={{ color: "oklch(0.98 0.01 268)" }}
          >
            {resolvedHeaderTitle}
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: MUTED }}>
            {resolvedHeaderDescription}
          </p>
        </div>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={cn(
              monoClass,
              "inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors hover:border-[oklch(0.62_0.21_265_/_0.35)]",
            )}
            style={{ color: "oklch(0.98 0.01 268)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {resolvedBackLabel}
          </button>
        ) : null}
      </div>

      {rawText?.trim() ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowRawText((current) => !current)}
            className={cn(
              monoClass,
              "text-[10px] font-semibold uppercase tracking-[0.12em]",
            )}
            style={{ color: PRIMARY }}
          >
            {showRawText ? "Hide Raw Text" : "View Raw Text"}
          </button>
          {showRawText ? (
            <pre className="mt-3 max-h-32 overflow-y-auto rounded-xl border border-white/10 bg-[oklch(0.12_0.03_268)] p-3 text-[10px] leading-relaxed text-[oklch(0.75_0.02_268)]">
              {rawText}
            </pre>
          ) : null}
        </div>
      ) : null}

      <form
        className="mt-6 flex flex-1 flex-col space-y-8"
        onSubmit={handleSubmit((values) =>
          onFinalize({
            ...values,
            skillsText: isProfileMode
              ? (studioSkills ?? []).join(", ")
              : useOnboardingStore.getState().studio.skills.join(", "),
          }),
        )}
        autoComplete="off"
      >
        {isProfileMode && onTargetRoleChange ? (
          <section>
            <SectionTitle monoClass={monoClass}>Profile role</SectionTitle>
            <p className="mb-3 text-xs" style={{ color: MUTED }}>
              Names this resume profile in your list — not printed on the resume.
            </p>
            <TargetRoleField
              monoClass={monoClass}
              value={targetRole}
              onChange={onTargetRoleChange}
            />
          </section>
        ) : null}

        <StudioSkillsField
          monoClass={monoClass}
          skills={isProfileMode ? studioSkills : undefined}
          onSkillsChange={isProfileMode ? onStudioSkillsChange : undefined}
        />

        {/* 1. Header */}
        <section>
          <SectionTitle monoClass={monoClass}>Header</SectionTitle>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                {...register("firstName", { required: true })}
                className={INPUT_CLASS}
                placeholder="First name"
                autoComplete="off"
                name="es-first-name"
              />
              <input
                {...register("lastName")}
                className={INPUT_CLASS}
                placeholder="Last name"
                autoComplete="off"
                name="es-last-name"
              />
            </div>
            <Controller
              control={control}
              name="cityState"
              render={({ field }) => (
                <CityStateField
                  value={field.value}
                  onChange={field.onChange}
                  monoClass={monoClass}
                  inputClass={INPUT_CLASS}
                />
              )}
            />
            <Controller
              control={control}
              name="phone"
              render={({ field }) => {
                const parts = splitPhoneNumber(field.value ?? "");
                return (
                  <PhoneField
                    dialCode={parts.dialCode || DEFAULT_DIAL_CODE}
                    nationalNumber={formatNationalNumber(
                      parts.dialCode || DEFAULT_DIAL_CODE,
                      parts.nationalNumber,
                    )}
                    onDialCodeChange={(code) => {
                      field.onChange(
                        formatFullPhone(code, parts.nationalNumber),
                      );
                    }}
                    onNationalNumberChange={(value) => {
                      field.onChange(
                        formatFullPhone(parts.dialCode || DEFAULT_DIAL_CODE, value),
                      );
                    }}
                    monoClass={monoClass}
                    inputClass={INPUT_CLASS}
                    showIcon={false}
                  />
                );
              }}
            />
            <input
              {...register("email", { required: true })}
              type="email"
              className={INPUT_CLASS}
              placeholder="Email"
              autoComplete="off"
              name="es-email"
            />
            <input
              {...register("linkedIn")}
              className={INPUT_CLASS}
              placeholder="LinkedIn URL"
              autoComplete="off"
              name="es-linkedin"
            />
          </div>
        </section>

        {/* 2. Professional Summary */}
        <section>
          <SectionTitle monoClass={monoClass}>
            {RESUME_SECTION_TITLES.professionalSummary}
          </SectionTitle>
          <textarea
            {...register("professionalSummary")}
            rows={4}
            className={cn(INPUT_CLASS, "resize-y")}
            placeholder={SUMMARY_PLACEHOLDER}
          />
        </section>

        {/* 4. Professional Experience */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <SectionTitle monoClass={monoClass}>
              {RESUME_SECTION_TITLES.professionalExperience}
            </SectionTitle>
            <button
              type="button"
              onClick={() =>
                experienceFields.append({
                  id: `exp-${Date.now()}`,
                  title: "",
                  company: "",
                  location: "",
                  startMonth: "",
                  startYear: "",
                  endMonth: "",
                  endYear: "",
                  bullets: "",
                  hidden: false,
                })
              }
              className={cn(
                monoClass,
                "text-[10px] font-semibold uppercase tracking-[0.12em]",
              )}
              style={{ color: PRIMARY }}
            >
              + Add job
            </button>
          </div>

          <div className="space-y-4">
            {experienceFields.fields.map((field, index) => {
              const isHidden = Boolean(watched.experience?.[index]?.hidden);

              return (
                <div
                  key={field.id}
                  className={cn(
                    "rounded-xl border border-white/10 bg-white/[0.03] p-4",
                    isHidden && "opacity-45",
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p
                      className={cn(monoClass, "text-[10px] uppercase tracking-[0.14em]")}
                      style={{ color: MUTED }}
                    >
                      Role {index + 1}
                    </p>
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => experienceFields.move(index, index - 1)}
                        className="rounded-lg p-1.5 disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" style={{ color: MUTED }} />
                      </button>
                      <button
                        type="button"
                        disabled={index === experienceFields.fields.length - 1}
                        onClick={() => experienceFields.move(index, index + 1)}
                        className="rounded-lg p-1.5 disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" style={{ color: MUTED }} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setValue(`experience.${index}.hidden`, !isHidden, {
                            shouldDirty: true,
                          })
                        }
                        className="rounded-lg p-1.5"
                      >
                        {isHidden ? (
                          <EyeOff className="h-3.5 w-3.5" style={{ color: PRIMARY }} />
                        ) : (
                          <Eye className="h-3.5 w-3.5" style={{ color: MUTED }} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => experienceFields.remove(index)}
                        className="rounded-lg p-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" style={{ color: MUTED }} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <input
                      {...register(`experience.${index}.title`)}
                      className={INPUT_CLASS}
                      placeholder="Job title"
                      autoComplete="off"
                    />
                    <input
                      {...register(`experience.${index}.company`)}
                      className={INPUT_CLASS}
                      placeholder="Company"
                      autoComplete="off"
                    />
                    <input
                      {...register(`experience.${index}.location`)}
                      className={INPUT_CLASS}
                      placeholder="City, state"
                      autoComplete="off"
                    />
                    <DateRangeFields
                      monoClass={monoClass}
                      compact
                      startMonth={watched.experience?.[index]?.startMonth ?? ""}
                      startYear={watched.experience?.[index]?.startYear ?? ""}
                      endMonth={watched.experience?.[index]?.endMonth ?? ""}
                      endYear={watched.experience?.[index]?.endYear ?? ""}
                      onStartMonthChange={(value) =>
                        setValue(`experience.${index}.startMonth`, value, {
                          shouldDirty: true,
                        })
                      }
                      onStartYearChange={(value) =>
                        setValue(`experience.${index}.startYear`, value, {
                          shouldDirty: true,
                        })
                      }
                      onEndMonthChange={(value) =>
                        setValue(`experience.${index}.endMonth`, value, {
                          shouldDirty: true,
                        })
                      }
                      onEndYearChange={(value) =>
                        setValue(`experience.${index}.endYear`, value, {
                          shouldDirty: true,
                        })
                      }
                    />
                    <textarea
                      {...register(`experience.${index}.bullets`)}
                      rows={4}
                      className={cn(INPUT_CLASS, "resize-y")}
                      placeholder={EXPERIENCE_BULLET_PLACEHOLDER}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. Education */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <SectionTitle monoClass={monoClass}>{RESUME_SECTION_TITLES.education}</SectionTitle>
            <button
              type="button"
              onClick={() =>
                educationFields.append({
                  id: `edu-${Date.now()}`,
                  degree: "",
                  school: "",
                  location: "",
                  startMonth: "",
                  startYear: "",
                  endMonth: "",
                  endYear: "",
                  hidden: false,
                })
              }
              className={cn(
                monoClass,
                "text-[10px] font-semibold uppercase tracking-[0.12em]",
              )}
              style={{ color: PRIMARY }}
            >
              + Add
            </button>
          </div>
          <div className="space-y-3">
            {educationFields.fields.map((field, index) => (
              <div
                key={field.id}
                className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <input
                  {...register(`education.${index}.degree`)}
                  className={INPUT_CLASS}
                  placeholder="Degree, Major"
                  autoComplete="off"
                />
                <input
                  {...register(`education.${index}.school`)}
                  className={INPUT_CLASS}
                  placeholder="Institution"
                  autoComplete="off"
                />
                <input
                  {...register(`education.${index}.location`)}
                  className={INPUT_CLASS}
                  placeholder="City, state"
                  autoComplete="off"
                />
                <DateRangeFields
                  monoClass={monoClass}
                  compact
                  startMonth={watched.education?.[index]?.startMonth ?? ""}
                  startYear={watched.education?.[index]?.startYear ?? ""}
                  endMonth={watched.education?.[index]?.endMonth ?? ""}
                  endYear={watched.education?.[index]?.endYear ?? ""}
                  onStartMonthChange={(value) =>
                    setValue(`education.${index}.startMonth`, value, {
                      shouldDirty: true,
                    })
                  }
                  onStartYearChange={(value) =>
                    setValue(`education.${index}.startYear`, value, {
                      shouldDirty: true,
                    })
                  }
                  onEndMonthChange={(value) =>
                    setValue(`education.${index}.endMonth`, value, {
                      shouldDirty: true,
                    })
                  }
                  onEndYearChange={(value) =>
                    setValue(`education.${index}.endYear`, value, {
                      shouldDirty: true,
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() => educationFields.remove(index)}
                  className={cn(monoClass, "text-[10px] uppercase tracking-[0.12em]")}
                  style={{ color: MUTED }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Optional sections */}
        <OptionalListSection
          title={RESUME_SECTION_TITLES.certifications}
          items={watched.certifications ?? []}
          monoClass={monoClass}
          placeholder="Certification — Issuer, MM/YYYY"
          onAdd={() =>
            certFields.append({ id: `cert-${Date.now()}`, text: "", hidden: false })
          }
          onRemove={(index) => certFields.remove(index)}
          onUpdate={(index, text) =>
            setValue(`certifications.${index}.text`, text, { shouldDirty: true })
          }
        />

        <OptionalListSection
          title={RESUME_SECTION_TITLES.projects}
          items={watched.projects ?? []}
          monoClass={monoClass}
          placeholder="Project name — one-line description"
          onAdd={() =>
            projectFields.append({ id: `proj-${Date.now()}`, text: "", hidden: false })
          }
          onRemove={(index) => projectFields.remove(index)}
          onUpdate={(index, text) =>
            setValue(`projects.${index}.text`, text, { shouldDirty: true })
          }
        />

        {isProfileMode ? (
          <OptionalListSection
            title={RESUME_SECTION_TITLES.languages}
            items={watched.languages ?? []}
            monoClass={monoClass}
            placeholder="Language — proficiency (e.g. English — Native)"
            onAdd={() =>
              languageFields.append({ id: `lang-${Date.now()}`, text: "", hidden: false })
            }
            onRemove={(index) => languageFields.remove(index)}
            onUpdate={(index, text) =>
              setValue(`languages.${index}.text`, text, { shouldDirty: true })
            }
          />
        ) : (
          <LanguagesField monoClass={monoClass} idPrefix="studio-languages" />
        )}

        <button
          type="submit"
          disabled={isProceedDisabled}
          className={cn(
            "mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
            isProceedDisabled
              ? "cursor-not-allowed opacity-50"
              : "hover:brightness-110",
          )}
          style={{
            backgroundColor: PRIMARY,
            color: "oklch(0.98 0.01 268)",
            boxShadow: isProceedDisabled
              ? undefined
              : "0 0 40px -12px oklch(0.62 0.21 265 / 0.55)",
          }}
          aria-disabled={isProceedDisabled}
        >
          {isProceedLocked ? (
            <>
              <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              {resolvedFinalizeLabel}
            </>
          ) : (
            resolvedFinalizeLabel
          )}
        </button>
      </form>
    </div>
  );
}
