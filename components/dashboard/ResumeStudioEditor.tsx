"use client";

import Link from "next/link";
import { JetBrains_Mono } from "next/font/google";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { saveResumeProfileStudio } from "@/app/actions/resume-profiles";
import { RefineryPanel, STUDIO_PROFILE_FORM_ID } from "@/components/onboarding/hub/RefineryPanel";
import {
  PrimeResume,
  type PrimeResumeData,
} from "@/components/onboarding/PrimeResume";
import { ResumeStudioWorkbench } from "@/components/resume/ResumeStudioWorkbench";
import {
  DashboardExpandAllButton,
  DashboardHeaderHeroButton,
} from "@/components/dashboard/DashboardWorkspaceHeader";
import { useResumeEnhanceFlow } from "@/components/resume/useResumeEnhanceFlow";
import type { RefineryStudioToolbarPayload } from "@/components/onboarding/hub/RefineryPanel";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { profileStudioPersistErrors } from "@/lib/profile/profile-studio-persist";
import { studioSkillsFromForm } from "@/lib/profile/studio-form-db";
import { ValidationErrorsBanner } from "@/components/resume/ValidationErrorsBanner";
import { buildProfileStudioSectionExpansion } from "@/lib/resume/studio-editor-sections";
import { estimateYearsExperience } from "@/src/lib/ai/engine/candidate-context";
import {
  describeAutoPageLengthRecommendation,
  normalizePageLengthPreference,
  resolveResumePages,
  type PageLengthPreference,
} from "@/lib/resume/page-length-preference";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

type ResumeStudioEditorProps = {
  profileId: string;
  initialTargetTitle: string;
  initialForm: HubRefineryForm;
  rawResumeText?: string | null;
  enhanceWithAiEnabled?: boolean;
  dependentJobs?: Array<{ id: string; title: string; company: string | null }>;
  resumeRulesV2Enabled?: boolean;
};

export function ResumeStudioEditor({
  profileId,
  initialTargetTitle,
  initialForm,
  rawResumeText,
  enhanceWithAiEnabled = false,
  dependentJobs = [],
  resumeRulesV2Enabled = false,
}: ResumeStudioEditorProps) {
  const router = useRouter();
  const [targetRole, setTargetRole] = useState(initialTargetTitle);
  const [formValues, setFormValues] = useState<HubRefineryForm>(initialForm);
  const [pageLengthPreference, setPageLengthPreference] = useState<PageLengthPreference>(() =>
    normalizePageLengthPreference(initialForm.pageLengthPreference),
  );
  const [studioSkills, setStudioSkills] = useState(() => studioSkillsFromForm(initialForm));
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [saveDisabled, setSaveDisabled] = useState(true);
  const [formRevision, setFormRevision] = useState(0);
  const [sectionExpansion, setSectionExpansion] = useState<Record<string, boolean>>(() =>
    buildProfileStudioSectionExpansion(),
  );
  const [studioToolbar, setStudioToolbar] = useState<RefineryStudioToolbarPayload | null>(
    null,
  );

  const mergedFormValues = useMemo(
    (): HubRefineryForm => ({
      ...formValues,
      skillsText: studioSkills.join(", "),
      pageLengthPreference,
    }),
    [formValues, studioSkills, pageLengthPreference],
  );

  const yearsExperience = useMemo(
    () => estimateYearsExperience(mergedFormValues),
    [mergedFormValues],
  );

  const resolvedPageCount = useMemo(
    () => resolveResumePages(yearsExperience, targetRole, pageLengthPreference),
    [yearsExperience, targetRole, pageLengthPreference],
  );

  const autoPageLengthRecommendation = useMemo(
    () => describeAutoPageLengthRecommendation(yearsExperience, targetRole),
    [yearsExperience, targetRole],
  );

  const handlePageLengthPreferenceChange = useCallback((preference: PageLengthPreference) => {
    setPageLengthPreference(preference);
    setFormValues((current) => ({ ...current, pageLengthPreference: preference }));
    setSaveDisabled(false);
  }, []);

  const handleEnhanceApply = useCallback(
    (result: {
      form: HubRefineryForm;
      skills: string[];
      sectionExpansion: Record<string, boolean>;
    }) => {
      const nextPageLength = normalizePageLengthPreference(result.form.pageLengthPreference);
      setPageLengthPreference(nextPageLength);
      setFormValues({
        ...result.form,
        pageLengthPreference: nextPageLength,
      });
      setStudioSkills(result.skills);
      setSectionExpansion(result.sectionExpansion);
      setFormRevision((revision) => revision + 1);
    },
    [],
  );

  const { flowUi, headerButton } = useResumeEnhanceFlow({
    form: mergedFormValues,
    targetRole,
    profileId,
    rawResumeText,
    variant: "dashboard",
    registerHeader: false,
    enabled: enhanceWithAiEnabled,
    onApply: handleEnhanceApply,
    pageLengthPreference,
    onPageLengthPreferenceChange: handlePageLengthPreferenceChange,
    autoPageLengthRecommendation,
    resolvedPageCount,
    rulesV2Enabled: resumeRulesV2Enabled,
  });

  const handleSaveStateChange = useCallback((state: { disabled: boolean } | null) => {
    setSaveDisabled(state?.disabled ?? true);
  }, []);

  const saveButton = useMemo(
    () => (
      <DashboardHeaderHeroButton
        type="submit"
        form={STUDIO_PROFILE_FORM_ID}
        disabled={saveDisabled || isSaving}
        aria-label={isSaving ? "Saving profile" : "Save profile"}
        title={isSaving ? "Saving…" : "Save profile"}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : (
          "Save"
        )}
      </DashboardHeaderHeroButton>
    ),
    [isSaving, saveDisabled],
  );

  const resumePreview = useMemo((): PrimeResumeData => {
    return refineryFormToPrimeResume(mergedFormValues);
  }, [mergedFormValues]);

  const handleChange = useCallback((values: HubRefineryForm) => {
    setFormValues({
      ...values,
      pageLengthPreference,
    });
  }, [pageLengthPreference]);

  const handleFinalize = useCallback(
    async (values: HubRefineryForm) => {
      setIsSaving(true);
      setErrors(null);

      const form = {
        ...values,
        skillsText: studioSkills.join(", "),
      };
      const saveErrors = profileStudioPersistErrors(form, targetRole, studioSkills);
      if (saveErrors.length > 0) {
        setIsSaving(false);
        setErrors(saveErrors);
        return;
      }

      const result = await saveResumeProfileStudio({
        profileId,
        targetTitle: targetRole,
        form,
      });

      setIsSaving(false);

      if (!result.success) {
        setErrors([result.error]);
        return;
      }

      router.push("/dashboard/resume-profiles");
      router.refresh();
    },
    [profileId, router, studioSkills, targetRole],
  );

  const allExpanded = studioToolbar?.ui.allSectionsExpanded ?? false;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {flowUi}
      <div className="mb-3 shrink-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Resume Studio</h1>
        <div className="mt-1 flex items-center gap-3">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            {dependentJobs.length > 0 ? (
              <>
                Used by{" "}
                {dependentJobs.slice(0, 3).map((job, index) => (
                  <span key={job.id}>
                    {index > 0 ? ", " : ""}
                    <Link
                      href={`/dashboard/job-tracker/${job.id}/resume`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {job.title}{job.company ? ` @ ${job.company}` : ""}
                    </Link>
                  </span>
                ))}
                {dependentJobs.length > 3 ? ` +${dependentJobs.length - 3} more` : ""}
                {" — changes affect those resumes."}
              </>
            ) : (
              "Edit your base resume profile — changes apply to all jobs using it."
            )}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <DashboardExpandAllButton
              expanded={allExpanded}
              onToggle={() => studioToolbar?.actions.toggleAllSections()}
              disabled={!studioToolbar}
              placement="page"
            />
            {enhanceWithAiEnabled ? headerButton : null}
            {saveButton}
          </div>
        </div>
      </div>
      {errors?.length ? (
        <ValidationErrorsBanner errors={errors} className="mb-3" variant="dashboard" />
      ) : null}
      <ResumeStudioWorkbench
        variant="dashboard"
        monoClass={jetbrainsMono.className}
        className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border"
        studioTabs
        studioAnalyticsSurface="dashboard_studio"
        preview={
          <PrimeResume resume={resumePreview} variant="workbench" className="w-full" />
        }
        panel={
          <RefineryPanel
            key={formRevision}
            mode="profile"
            initialValues={mergedFormValues}
            monoClass={jetbrainsMono.className}
            onChange={handleChange}
            onFinalize={handleFinalize}
            finalizeLabel={isSaving ? "Saving…" : undefined}
            targetRole={targetRole}
            onTargetRoleChange={setTargetRole}
            studioSkills={studioSkills}
            onStudioSkillsChange={setStudioSkills}
            sectionExpansion={sectionExpansion}
            onSaveStateChange={handleSaveStateChange}
            onStudioToolbarChange={setStudioToolbar}
          />
        }
        panelScrolls
      />
    </div>
  );
}
