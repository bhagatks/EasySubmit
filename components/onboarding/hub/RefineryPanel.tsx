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
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { CityStateField } from "@/components/onboarding/hub/CityStateField";
import { DateRangeFields } from "@/components/onboarding/hub/DateRangeFields";
import { PhoneField } from "@/components/onboarding/hub/PhoneField";
import { StudioSkillsField } from "@/components/onboarding/hub/StudioSkillsField";
import { LanguagesField } from "@/components/onboarding/hub/LanguagesField";
import { StudioCollapsibleSection } from "@/components/resume/StudioCollapsibleSection";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  getWorkbenchPhase,
  WORKBENCH_FINALIZE_LABEL,
} from "@/lib/onboarding/workbenchPhases";
import { WorkbenchPhaseIntro } from "@/components/onboarding/hub/WorkbenchPhaseIntro";
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
import {
  buildInitialStudioSectionState,
  STUDIO_EDITOR_SECTION_LABELS,
  type StudioEditorSectionId,
} from "@/lib/resume/studio-editor-sections";
import { TargetRoleField } from "@/components/onboarding/hub/TargetRoleField";
import { MIN_STUDIO_SKILLS, selectCanProceedToCalibration } from "@/lib/onboarding/studio";
import { useOnboardingStore } from "@/src/stores/onboarding-store";
import { cn } from "@/lib/utils";

export const STUDIO_PROFILE_FORM_ID = "resume-studio-form";

export type StudioProfileSaveState = {
  disabled: boolean;
};

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
  /** When set (e.g. after AI enhance), overrides collapsible section open state. */
  sectionExpansion?: Record<string, boolean> | null;
  /** Hide in-panel phase intro — actions live in OnboardingWorkbenchHeader. */
  hidePhaseIntro?: boolean;
  onStudioToolbarChange?: (payload: RefineryStudioToolbarPayload | null) => void;
  /** Dashboard profile studio — sync save button disabled state for header icon. */
  onSaveStateChange?: (state: StudioProfileSaveState | null) => void;
};

export type RefineryStudioToolbarUi = {
  showRawText: boolean;
  allSectionsExpanded: boolean;
  hasRawText: boolean;
};

export type RefineryStudioToolbarPayload = {
  ui: RefineryStudioToolbarUi;
  actions: {
    toggleRawText: () => void;
    toggleAllSections: () => void;
  };
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
  hideTitle = false,
}: {
  title: string;
  items: Array<{ id: string; text: string; hidden?: boolean }>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, text: string) => void;
  monoClass: string;
  placeholder: string;
  hideTitle?: boolean;
}) {
  if (items.length === 0) {
    return (
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          {hideTitle ? null : <SectionTitle monoClass={monoClass}>{title}</SectionTitle>}
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
        {hideTitle ? null : <SectionTitle monoClass={monoClass}>{title}</SectionTitle>}
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
  sectionExpansion,
  hidePhaseIntro = false,
  onStudioToolbarChange,
  onSaveStateChange,
}: RefineryPanelProps) {
  const [showRawText, setShowRawText] = useState(false);
  const onboardingCanProceed = useOnboardingStore(selectCanProceedToCalibration);
  const isProfileMode = mode === "profile";
  const localSkillCount = studioSkills?.length ?? 0;
  const canProceedToCalibration = isProfileMode
    ? localSkillCount >= MIN_STUDIO_SKILLS
    : onboardingCanProceed;
  const { register, control, handleSubmit, watch, setValue, getValues } =
    useForm<HubRefineryForm>({
      defaultValues: initialValues,
      mode: "onChange",
    });

  const experienceFields = useFieldArray({ control, name: "experience" });
  const educationFields = useFieldArray({ control, name: "education" });
  const certFields = useFieldArray({ control, name: "certifications" });
  const projectFields = useFieldArray({ control, name: "projects" });
  const languageFields = useFieldArray({ control, name: "languages" });
  const customSectionFields = useFieldArray({ control, name: "customSections" });

  const editorVariant = isProfileMode ? "dashboard" : "onboarding";
  const coreSectionIds: StudioEditorSectionId[] = [
    ...(isProfileMode ? (["profileRole"] as const) : []),
    "header",
    "professionalSummary",
    "skills",
    "professionalExperience",
    "education",
    "certifications",
    "projects",
    "languages",
  ];
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    buildInitialStudioSectionState(coreSectionIds, editorVariant),
  );

  useEffect(() => {
    if (sectionExpansion) {
      setExpandedSections(sectionExpansion);
    }
  }, [sectionExpansion]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  const allSectionKeys = useMemo(() => {
    const ids: StudioEditorSectionId[] = [
      ...(isProfileMode ? (["profileRole"] as const) : []),
      "header",
      "professionalSummary",
      "skills",
      "professionalExperience",
      "education",
      "certifications",
      "projects",
      "languages",
    ];
    return [...ids, ...customSectionFields.fields.map((field) => field.id)];
  }, [isProfileMode, customSectionFields.fields]);

  const allSectionsExpanded =
    allSectionKeys.length > 0 &&
    allSectionKeys.every((key) => Boolean(expandedSections[key]));

  const toggleAllSections = useCallback(() => {
    setExpandedSections((current) => {
      const keys = allSectionKeys;
      const nextExpanded = !(
        keys.length > 0 && keys.every((key) => Boolean(current[key]))
      );
      const next = { ...current };
      for (const key of keys) {
        next[key] = nextExpanded;
      }
      return next;
    });
  }, [allSectionKeys]);

  useEffect(() => {
    if (isProfileMode) {
      onStudioToolbarChange?.({
        ui: {
          showRawText: false,
          allSectionsExpanded,
          hasRawText: false,
        },
        actions: {
          toggleRawText: () => {},
          toggleAllSections,
        },
      });
      return;
    }

    if (!hidePhaseIntro) {
      onStudioToolbarChange?.(null);
      return;
    }

    onStudioToolbarChange?.({
      ui: {
        showRawText,
        allSectionsExpanded,
        hasRawText: Boolean(rawText?.trim()),
      },
      actions: {
        toggleRawText: () => setShowRawText((current) => !current),
        toggleAllSections,
      },
    });
  }, [
    isProfileMode,
    hidePhaseIntro,
    showRawText,
    allSectionsExpanded,
    rawText,
    onStudioToolbarChange,
    toggleAllSections,
  ]);

  const headerActionClass = cn(
    monoClass,
    "inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors hover:bg-white/[0.06]",
  );

  const watched = watch();

  useEffect(() => {
    const subscription = watch(() => {
      onChange(getValues());
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange, getValues]);

  const phoneParts = splitPhoneNumber(watched.phone ?? "");
  const phoneValid = isValidPhoneNumber(
    phoneParts.dialCode || DEFAULT_DIAL_CODE,
    phoneParts.nationalNumber,
  );
  const linkedInValue = watched.linkedIn?.trim() ?? "";

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

  const resolvedBackLabel = backLabel ?? getWorkbenchPhase(2)?.label ?? "Import";
  const resolvedFinalizeLabel =
    finalizeLabel ??
    (isProfileMode ? "Save profile" : WORKBENCH_FINALIZE_LABEL);
  const studioSubtitle = headerDescription?.trim() || getWorkbenchPhase(3)?.description || "";

  useEffect(() => {
    if (!isProfileMode) {
      onSaveStateChange?.(null);
      return;
    }

    onSaveStateChange?.({ disabled: isProceedDisabled });
  }, [isProfileMode, isProceedDisabled, onSaveStateChange]);

  useEffect(() => {
    return () => {
      onSaveStateChange?.(null);
    };
  }, [onSaveStateChange]);

  return (
    <div className={cn(isProfileMode ? "flex flex-col" : "flex flex-1 flex-col")}>
      {!isProfileMode && !hidePhaseIntro ? (
        <WorkbenchPhaseIntro
          phaseId={3}
          monoClass={monoClass}
          icon={<Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
          subtitle={headerTitle?.trim() || studioSubtitle || undefined}
          actions={
            <>
              {rawText?.trim() ? (
                <button
                  type="button"
                  onClick={() => setShowRawText((current) => !current)}
                  className={headerActionClass}
                  style={{ color: PRIMARY }}
                >
                  {showRawText ? (
                    <EyeOff className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <Eye className="h-3 w-3" aria-hidden="true" />
                  )}
                  {showRawText ? "Hide raw" : "Raw text"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={toggleAllSections}
                className={headerActionClass}
                style={{ color: PRIMARY }}
                aria-label={allSectionsExpanded ? "Collapse all sections" : "Expand all sections"}
              >
                {allSectionsExpanded ? (
                  <ChevronUp className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                )}
                {allSectionsExpanded ? "Collapse all" : "Expand all"}
              </button>
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className={cn(
                    monoClass,
                    "inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors hover:border-[oklch(0.62_0.21_265_/_0.35)]",
                  )}
                  style={{ color: "oklch(0.98 0.01 268)" }}
                >
                  <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                  {resolvedBackLabel}
                </button>
              ) : null}
            </>
          }
          footer={
            showRawText && rawText?.trim() ? (
              <pre className="max-h-28 w-full overflow-y-auto rounded-xl border border-white/10 bg-[oklch(0.12_0.03_268)] p-3 text-[10px] leading-relaxed text-[oklch(0.75_0.02_268)]">
                {rawText}
              </pre>
            ) : null
          }
        />
      ) : null}

      {!isProfileMode && hidePhaseIntro && showRawText && rawText?.trim() ? (
        <pre className="mb-3 max-h-28 w-full shrink-0 overflow-y-auto rounded-xl border border-white/10 bg-[oklch(0.12_0.03_268)] p-3 text-[10px] leading-relaxed text-[oklch(0.75_0.02_268)]">
          {rawText}
        </pre>
      ) : null}

      <form
        id={isProfileMode ? STUDIO_PROFILE_FORM_ID : undefined}
        className={cn(
          "flex flex-col space-y-3",
          isProfileMode ? "mt-0" : hidePhaseIntro ? "mt-0 flex-1" : "mt-4 flex-1",
        )}
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
          <StudioCollapsibleSection
            title={STUDIO_EDITOR_SECTION_LABELS.profileRole}
            expanded={Boolean(expandedSections.profileRole)}
            onToggle={() => toggleSection("profileRole")}
            variant={editorVariant}
            monoClass={monoClass}
            showDragHandle={false}
          >
            <p className="mb-3 text-xs" style={{ color: MUTED }}>
              Names this resume profile in your list — not printed on the resume.
            </p>
            <TargetRoleField
              monoClass={monoClass}
              value={targetRole}
              onChange={onTargetRoleChange}
            />
          </StudioCollapsibleSection>
        ) : null}

        <StudioCollapsibleSection
          title={STUDIO_EDITOR_SECTION_LABELS.header}
          expanded={Boolean(expandedSections.header)}
          onToggle={() => toggleSection("header")}
          variant={editorVariant}
          monoClass={monoClass}
        >
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
            {!linkedInValue ? (
              <p className="mt-1.5 text-xs" style={{ color: MUTED }}>
                Add LinkedIn — helps recruiters find you
              </p>
            ) : null}
          </div>
        </StudioCollapsibleSection>

        <StudioCollapsibleSection
          title={STUDIO_EDITOR_SECTION_LABELS.professionalSummary}
          expanded={Boolean(expandedSections.professionalSummary)}
          onToggle={() => toggleSection("professionalSummary")}
          variant={editorVariant}
          monoClass={monoClass}
        >
          <textarea
            {...register("professionalSummary")}
            rows={4}
            className={cn(INPUT_CLASS, "resize-y")}
            placeholder={SUMMARY_PLACEHOLDER}
          />
        </StudioCollapsibleSection>

        <StudioCollapsibleSection
          title={STUDIO_EDITOR_SECTION_LABELS.skills}
          expanded={Boolean(expandedSections.skills)}
          onToggle={() => toggleSection("skills")}
          variant={editorVariant}
          monoClass={monoClass}
        >
          <StudioSkillsField
            monoClass={monoClass}
            skills={isProfileMode ? studioSkills : undefined}
            onSkillsChange={isProfileMode ? onStudioSkillsChange : undefined}
          />
        </StudioCollapsibleSection>

        <StudioCollapsibleSection
          title={STUDIO_EDITOR_SECTION_LABELS.professionalExperience}
          expanded={Boolean(expandedSections.professionalExperience)}
          onToggle={() => toggleSection("professionalExperience")}
          variant={editorVariant}
          monoClass={monoClass}
        >
          <div className="mb-3 flex justify-end">
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
        </StudioCollapsibleSection>

        <StudioCollapsibleSection
          title={STUDIO_EDITOR_SECTION_LABELS.education}
          expanded={Boolean(expandedSections.education)}
          onToggle={() => toggleSection("education")}
          variant={editorVariant}
          monoClass={monoClass}
        >
          <div className="mb-3 flex justify-end">
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
        </StudioCollapsibleSection>

        <StudioCollapsibleSection
          title={STUDIO_EDITOR_SECTION_LABELS.certifications}
          expanded={Boolean(expandedSections.certifications)}
          onToggle={() => toggleSection("certifications")}
          variant={editorVariant}
          monoClass={monoClass}
        >
          <OptionalListSection
            title={RESUME_SECTION_TITLES.certifications}
            items={watched.certifications ?? []}
            monoClass={monoClass}
            placeholder="Certification — Issuer, MM/YYYY"
            hideTitle
            onAdd={() =>
              certFields.append({ id: `cert-${Date.now()}`, text: "", hidden: false })
            }
            onRemove={(index) => certFields.remove(index)}
            onUpdate={(index, text) =>
              setValue(`certifications.${index}.text`, text, { shouldDirty: true })
            }
          />
        </StudioCollapsibleSection>

        <StudioCollapsibleSection
          title={STUDIO_EDITOR_SECTION_LABELS.projects}
          expanded={Boolean(expandedSections.projects)}
          onToggle={() => toggleSection("projects")}
          variant={editorVariant}
          monoClass={monoClass}
        >
          <OptionalListSection
            title={RESUME_SECTION_TITLES.projects}
            items={watched.projects ?? []}
            monoClass={monoClass}
            placeholder="Project name — one-line description"
            hideTitle
            onAdd={() =>
              projectFields.append({ id: `proj-${Date.now()}`, text: "", hidden: false })
            }
            onRemove={(index) => projectFields.remove(index)}
            onUpdate={(index, text) =>
              setValue(`projects.${index}.text`, text, { shouldDirty: true })
            }
          />
        </StudioCollapsibleSection>

        <StudioCollapsibleSection
          title={STUDIO_EDITOR_SECTION_LABELS.languages}
          expanded={Boolean(expandedSections.languages)}
          onToggle={() => toggleSection("languages")}
          variant={editorVariant}
          monoClass={monoClass}
        >
          {isProfileMode ? (
            <OptionalListSection
              title={RESUME_SECTION_TITLES.languages}
              items={watched.languages ?? []}
              monoClass={monoClass}
              placeholder="Language — proficiency (e.g. English — Native)"
              hideTitle
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
        </StudioCollapsibleSection>

        {customSectionFields.fields.map((field, index) => {
          const sectionKey = field.id;
          return (
            <StudioCollapsibleSection
              key={field.id}
              title={
                watched.customSections?.[index]?.title?.trim() || "Custom Section"
              }
              expanded={Boolean(expandedSections[sectionKey])}
              onToggle={() => toggleSection(sectionKey)}
              variant={editorVariant}
              monoClass={monoClass}
            >
              <div className="space-y-3">
                <input
                  {...register(`customSections.${index}.title`)}
                  className={INPUT_CLASS}
                  placeholder="Section title (use standard names when possible)"
                  autoComplete="off"
                />
                <textarea
                  {...register(`customSections.${index}.content`)}
                  rows={5}
                  className={cn(INPUT_CLASS, "resize-y")}
                  placeholder="Section content — plain text, one paragraph or line per item"
                />
                <button
                  type="button"
                  onClick={() => {
                    customSectionFields.remove(index);
                    setExpandedSections((current) => {
                      const next = { ...current };
                      delete next[sectionKey];
                      return next;
                    });
                  }}
                  className={cn(monoClass, "text-[10px] uppercase tracking-[0.12em]")}
                  style={{ color: MUTED }}
                >
                  Remove section
                </button>
              </div>
            </StudioCollapsibleSection>
          );
        })}

        <button
          type="button"
          onClick={() => {
            const id = `custom-${Date.now()}`;
            customSectionFields.append({
              id,
              title: "",
              content: "",
              hidden: false,
            });
            setExpandedSections((current) => ({ ...current, [id]: true }));
          }}
          className={cn(
            monoClass,
            "rounded-xl border border-dashed px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
            isProfileMode
              ? "border-border text-muted-foreground hover:border-mint/40 hover:text-foreground"
              : "border-white/15 text-[oklch(0.65_0.02_268)] hover:border-[oklch(0.62_0.21_265_/_0.35)]",
          )}
        >
          + Custom section
        </button>

        {!isProfileMode ? (
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
        ) : null}
      </form>
    </div>
  );
}
