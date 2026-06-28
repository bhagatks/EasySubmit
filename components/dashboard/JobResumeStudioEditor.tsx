"use client";

import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { saveJobResumeStudio } from "@/app/actions/job-resume-tailor";
import { RefineryPanel, STUDIO_PROFILE_FORM_ID } from "@/components/onboarding/hub/RefineryPanel";
import {
  PrimeResume,
  type PrimeResumeData,
} from "@/components/onboarding/PrimeResume";
import { ResumeStudioWorkbench } from "@/components/resume/ResumeStudioWorkbench";
import {
  DashboardHeaderHeroButton,
  useDashboardExpandControlFromState,
  useRegisterDashboardHeaderActions,
} from "@/components/dashboard/DashboardWorkspaceHeader";
import { useRegisterStudioHeaderCenter } from "@/components/resume/StudioHeaderCenter";
import { useResumeEnhanceFlow } from "@/components/resume/useResumeEnhanceFlow";
import type { RefineryStudioToolbarPayload } from "@/components/onboarding/hub/RefineryPanel";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import {
  isJobReviewStudioContext,
  jobTrackerReviewScreenUrl,
} from "@/lib/job-tracker/review-screen-ui";
import { studioSkillsFromForm } from "@/lib/profile/studio-form-db";
import { InlineAlert } from "@/components/ui/inline-alert";
import { ValidationErrorsBanner } from "@/components/resume/ValidationErrorsBanner";
import {
  collectValidationErrorMessages,
  validateResume,
} from "@/lib/resume/validation";
import { estimateYearsExperience } from "@/src/lib/ai/engine/candidate-context";
import {
  describeAutoPageLengthRecommendation,
  normalizePageLengthPreference,
  resolveResumePages,
  type PageLengthPreference,
} from "@/lib/resume/page-length-preference";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

type JobResumeStudioEditorProps = {
  jobId: string;
  jobTitle: string;
  sourceProfileId: string;
  sourceProfileName: string;
  initialTargetTitle: string;
  initialForm: HubRefineryForm;
  rawResumeText?: string | null;
  enhanceWithAiEnabled?: boolean;
};

export function JobResumeStudioEditor({
  jobId,
  jobTitle,
  sourceProfileId,
  sourceProfileName,
  initialTargetTitle,
  initialForm,
  rawResumeText,
  enhanceWithAiEnabled = false,
}: JobResumeStudioEditorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isReviewContext = isJobReviewStudioContext(pathname, searchParams.get("from"));
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
  const [sectionExpansion, setSectionExpansion] = useState<Record<string, boolean> | null>(null);
  const [studioToolbar, setStudioToolbar] = useState<RefineryStudioToolbarPayload | null>(null);

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

  const handleEnhanceApply = useCallback(
    (result: {
      form: HubRefineryForm;
      skills: string[];
      sectionExpansion: Record<string, boolean>;
    }) => {
      setFormValues({
        ...result.form,
        pageLengthPreference,
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
    profileId: sourceProfileId,
    rawResumeText,
    variant: "dashboard",
    analyticsSurface: "job_studio",
    registerHeader: false,
    enabled: enhanceWithAiEnabled,
    onApply: handleEnhanceApply,
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
        aria-label={isSaving ? "Saving tailored resume" : "Save tailored resume"}
        title={isSaving ? "Saving…" : "Save tailored resume"}
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

  useRegisterDashboardHeaderActions(saveButton);

  useDashboardExpandControlFromState({
    allExpanded: studioToolbar?.ui.allSectionsExpanded ?? false,
    onToggle: () => studioToolbar?.actions.toggleAllSections(),
    disabled: !studioToolbar,
  });

  useRegisterStudioHeaderCenter(enhanceWithAiEnabled ? headerButton : null);

  const resumePreview = useMemo((): PrimeResumeData => {
    return refineryFormToPrimeResume(mergedFormValues);
  }, [mergedFormValues]);

  const handleChange = useCallback((values: HubRefineryForm) => {
    setFormValues({
      ...values,
      pageLengthPreference,
    });
  }, [pageLengthPreference]);

  const handlePageLengthPreferenceChange = useCallback((preference: PageLengthPreference) => {
    setPageLengthPreference(preference);
    setFormValues((current) => ({ ...current, pageLengthPreference: preference }));
    setSaveDisabled(false);
  }, []);

  const handleFinalize = useCallback(
    async (values: HubRefineryForm) => {
      setIsSaving(true);
      setErrors(null);

      const form = {
        ...values,
        skillsText: studioSkills.join(", "),
      };
      const gate = validateResume(form, targetRole, { summaryRequired: true });
      if (!gate.canFinalize) {
        setIsSaving(false);
        setErrors(collectValidationErrorMessages(gate));
        return;
      }

      const result = await saveJobResumeStudio({
        jobId,
        targetTitle: targetRole,
        form,
      });

      setIsSaving(false);

      if (!result.success) {
        setErrors([result.error]);
        return;
      }

      router.push(
        isReviewContext
          ? jobTrackerReviewScreenUrl(jobId, "resume")
          : "/dashboard/job-tracker",
      );
      router.refresh();
    },
    [isReviewContext, jobId, router, studioSkills, targetRole],
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {flowUi}
      {!isReviewContext ? (
        <InlineAlert variant="info" className="mb-3 shrink-0">
          Tailored for <strong>{jobTitle}</strong>. Unchanged sections come from your{" "}
          <Link
            href={`/dashboard/resume-profiles/${sourceProfileId}/edit`}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {sourceProfileName}
          </Link>{" "}
          profile — edits here save only for this job.
        </InlineAlert>
      ) : null}
      {errors?.length ? (
        <ValidationErrorsBanner
          errors={errors}
          className={cn(isReviewContext ? "mx-0.5 mb-0.5" : "mb-3")}
          variant="dashboard"
        />
      ) : null}
      <ResumeStudioWorkbench
        variant="dashboard"
        monoClass={jetbrainsMono.className}
        className={cn(
          "min-h-0 flex-1 overflow-hidden",
          isReviewContext
            ? "rounded-xl border border-[oklch(0.62_0.21_265_/_0.28)]"
            : "rounded-2xl border border-border",
        )}
        studioTabs
        studioAnalyticsSurface="job_studio"
        pageLengthPreference={pageLengthPreference}
        onPageLengthPreferenceChange={handlePageLengthPreferenceChange}
        autoPageLengthRecommendation={autoPageLengthRecommendation}
        resolvedPageCount={resolvedPageCount}
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
