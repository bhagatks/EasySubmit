"use client";

import Link from "next/link";
import { JetBrains_Mono } from "next/font/google";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { saveResumeProfileStudio } from "@/app/actions/resume-profiles";
import { RefineryPanel, STUDIO_PROFILE_FORM_ID } from "@/components/onboarding/hub/RefineryPanel";
import {
  PrimeResume,
  type PrimeResumeData,
} from "@/components/onboarding/PrimeResume";
import { ResumeStudioWorkbench } from "@/components/resume/ResumeStudioWorkbench";
import { StudioIconButton } from "@/components/resume/StudioIconButton";
import {
  useDashboardExpandControlFromState,
  useRegisterDashboardHeaderActions,
} from "@/components/dashboard/DashboardWorkspaceHeader";
import { useRegisterStudioHeaderCenter } from "@/components/resume/StudioHeaderCenter";
import { useResumeEnhanceFlow } from "@/components/resume/useResumeEnhanceFlow";
import type { RefineryStudioToolbarPayload } from "@/components/onboarding/hub/RefineryPanel";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { studioSkillsFromForm } from "@/lib/profile/studio-form-db";
import { InlineAlert } from "@/components/ui/inline-alert";

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
};

export function ResumeStudioEditor({
  profileId,
  initialTargetTitle,
  initialForm,
  rawResumeText,
  enhanceWithAiEnabled = false,
  dependentJobs = [],
}: ResumeStudioEditorProps) {
  const router = useRouter();
  const [targetRole, setTargetRole] = useState(initialTargetTitle);
  const [formValues, setFormValues] = useState<HubRefineryForm>(initialForm);
  const [studioSkills, setStudioSkills] = useState(() => studioSkillsFromForm(initialForm));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveDisabled, setSaveDisabled] = useState(true);
  const [formRevision, setFormRevision] = useState(0);
  const [sectionExpansion, setSectionExpansion] = useState<Record<string, boolean> | null>(
    null,
  );
  const [studioToolbar, setStudioToolbar] = useState<RefineryStudioToolbarPayload | null>(
    null,
  );

  const mergedFormValues = useMemo(
    (): HubRefineryForm => ({
      ...formValues,
      skillsText: studioSkills.join(", "),
    }),
    [formValues, studioSkills],
  );

  const handleEnhanceApply = useCallback(
    (result: {
      form: HubRefineryForm;
      skills: string[];
      sectionExpansion: Record<string, boolean>;
    }) => {
      setFormValues(result.form);
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
  });

  const handleSaveStateChange = useCallback((state: { disabled: boolean } | null) => {
    setSaveDisabled(state?.disabled ?? true);
  }, []);

  const saveButton = useMemo(
    () => (
      <StudioIconButton
        type="submit"
        form={STUDIO_PROFILE_FORM_ID}
        tone="bordered"
        disabled={saveDisabled || isSaving}
        aria-label={isSaving ? "Saving profile" : "Save profile"}
        title={isSaving ? "Saving…" : "Save profile"}
      >
        {isSaving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </StudioIconButton>
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
    setFormValues(values);
  }, []);

  const handleFinalize = useCallback(
    async (values: HubRefineryForm) => {
      setIsSaving(true);
      setError(null);

      const result = await saveResumeProfileStudio({
        profileId,
        targetTitle: targetRole,
        form: {
          ...values,
          skillsText: studioSkills.join(", "),
        },
      });

      setIsSaving(false);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/dashboard/resume-profiles");
      router.refresh();
    },
    [profileId, router, studioSkills, targetRole],
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {flowUi}
      {dependentJobs.length > 0 ? (
        <InlineAlert variant="warning" className="mb-3 shrink-0">
          {dependentJobs.length === 1
            ? "1 job application"
            : `${dependentJobs.length} job applications`}{" "}
          use this profile as its base resume. Changes here will affect merged resumes for:{" "}
          {dependentJobs.slice(0, 3).map((job, index) => (
            <span key={job.id}>
              {index > 0 ? ", " : ""}
              <Link
                href={`/dashboard/job-tracker/${job.id}/resume`}
                className="font-medium underline-offset-2 hover:underline"
              >
                {job.title}
                {job.company ? ` @ ${job.company}` : ""}
              </Link>
            </span>
          ))}
          {dependentJobs.length > 3 ? ` and ${dependentJobs.length - 3} more` : ""}.
        </InlineAlert>
      ) : null}
      {error ? (
        <p className="mb-3 shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <ResumeStudioWorkbench
        variant="dashboard"
        monoClass={jetbrainsMono.className}
        className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border"
        studioTabs
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
