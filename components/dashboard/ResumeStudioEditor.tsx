"use client";

import { JetBrains_Mono } from "next/font/google";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { saveResumeProfileStudio } from "@/app/actions/resume-profiles";
import { RefineryPanel } from "@/components/onboarding/hub/RefineryPanel";
import {
  PrimeResume,
  type PrimeResumeData,
} from "@/components/onboarding/PrimeResume";
import { ResumeStudioWorkbench } from "@/components/resume/ResumeStudioWorkbench";
import { useResumeEnhanceFlow } from "@/components/resume/useResumeEnhanceFlow";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { studioSkillsFromForm } from "@/lib/profile/studio-form-db";

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
};

export function ResumeStudioEditor({
  profileId,
  initialTargetTitle,
  initialForm,
  rawResumeText,
  enhanceWithAiEnabled = false,
}: ResumeStudioEditorProps) {
  const router = useRouter();
  const [targetRole, setTargetRole] = useState(initialTargetTitle);
  const [formValues, setFormValues] = useState<HubRefineryForm>(initialForm);
  const [studioSkills, setStudioSkills] = useState(() => studioSkillsFromForm(initialForm));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formRevision, setFormRevision] = useState(0);
  const [sectionExpansion, setSectionExpansion] = useState<Record<string, boolean> | null>(
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

  const { flowUi } = useResumeEnhanceFlow({
    form: mergedFormValues,
    targetRole,
    profileId,
    rawResumeText,
    variant: "dashboard",
    registerHeader: true,
    enabled: enhanceWithAiEnabled,
    onApply: handleEnhanceApply,
  });

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
          />
        }
        panelScrolls
      />
    </div>
  );
}
