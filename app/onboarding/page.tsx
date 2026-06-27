"use client";

import { JetBrains_Mono } from "next/font/google";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { completeOnboarding, completeStep } from "@/app/actions/onboarding";
import { enhanceResumeOnboarding } from "@/app/actions/ai/enhance-resume";
import { getLoginIdentity, getProfileIdentity } from "@/app/actions/profile";
import { IdentityCanvasGhost } from "@/components/onboarding/hub/IdentityCanvasGhost";
import { SynthesisTransition } from "@/components/onboarding/SynthesisTransition";
import {
  CoordinatesPanel,
  type CoordinatesValues,
} from "@/components/onboarding/hub/CoordinatesPanel";
import { FuelPanel } from "@/components/onboarding/hub/FuelPanel";
import {
  RefineryPanel,
  type RefineryStudioToolbarPayload,
  type RefineryStudioToolbarUi,
} from "@/components/onboarding/hub/RefineryPanel";
import { OnboardingWorkbenchChrome } from "@/components/onboarding/hub/OnboardingWorkbenchChrome";
import { AtsSamplePreviewLinks } from "@/components/onboarding/hub/AtsSamplePreviewLinks";
import {
  onboardingHeaderBackClass,
  onboardingHeaderLinkClass,
  ONBOARDING_HEADER_PRIMARY,
} from "@/components/onboarding/hub/onboarding-header-styles";
import {
  PrimeResume,
  type PrimeResumeData,
} from "@/components/onboarding/PrimeResume";
import { ScanningBeam } from "@/components/resume/ScanningBeam";
import { ResumeStudioWorkbench } from "@/components/resume/ResumeStudioWorkbench";
import {
  coordinatesToPrimeResume,
  emptyCoordinatesValues,
  emptyHubRefineryForm,
  formFullName,
  hubFormToCoordinates,
  mergeParsedWithCoordinates,
  refineryFormToPrimeResume,
  type HubRefineryForm,
} from "@/lib/onboarding/hubResume";
import { formatFullPhone } from "@/lib/phone/phone";
import type { StructuredResume } from "@/lib/resume/heuristicParser";
import { formatDateRangeParts } from "@/lib/resume/dates";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/src/stores/onboarding-store";
import { isIdentityPhaseComplete } from "@/lib/onboarding/identity";
import { getWorkbenchPhase } from "@/lib/onboarding/workbenchPhases";
import {
  clearWorkbenchSession,
  readWorkbenchSession,
  writeWorkbenchSession,
} from "@/lib/onboarding/workbench-session";
import { formatLanguagesForResume } from "@/lib/onboarding/languages";
import { parseProfileName } from "@/lib/profile/name";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const CANVAS_BG = "oklch(0.16 0.04 268)";

const EMPTY_RESUME: PrimeResumeData = {};

const stepMotion = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 28 : -28,
    filter: "blur(6px)",
  }),
  animate: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -20 : 20,
    filter: "blur(4px)",
  }),
};

const stepTransition = {
  duration: 0.42,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

function parseCityState(cityState: string): { city: string; country: string } {
  const trimmed = cityState.trim();
  if (!trimmed) return { city: "", country: "" };

  const parts = trimmed.split(",").map((part) => part.trim());
  if (parts.length >= 2) {
    return { city: parts[0], country: parts.slice(1).join(", ") };
  }

  return { city: trimmed, country: "" };
}

function parseSkillsText(skillsText: string): string[] {
  return skillsText
    .split(/[,;|•·\/]|\n/)
    .map((skill) => skill.trim())
    .filter(Boolean);
}

export default function OnboardingPage() {
  const { data: session, status, update: updateSession } = useSession();

  const [phase, setPhase] = useState(1);
  const [direction, setDirection] = useState(1);
  const [resumeData, setResumeData] = useState<PrimeResumeData>(EMPTY_RESUME);
  const [coordinates, setCoordinates] = useState<CoordinatesValues>(
    emptyCoordinatesValues(),
  );
  const [refineryInitial, setRefineryInitial] =
    useState<HubRefineryForm>(emptyHubRefineryForm());
  const [refineryForm, setRefineryForm] =
    useState<HubRefineryForm>(emptyHubRefineryForm());
  const [refineryRevision, setRefineryRevision] = useState(0);
  const [sectionExpansion, setSectionExpansion] = useState<Record<string, boolean> | null>(
    null,
  );
  const [parsedStructured, setParsedStructured] = useState<StructuredResume | null>(
    null,
  );
  const [rawResumeText, setRawResumeText] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [loginFirstName, setLoginFirstName] = useState("");
  const [loginLastName, setLoginLastName] = useState("");
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [studioToolbarUi, setStudioToolbarUi] = useState<RefineryStudioToolbarUi | null>(
    null,
  );
  const studioToolbarActionsRef = useRef<
    RefineryStudioToolbarPayload["actions"] | null
  >(null);
  const calibrationRanRef = useRef(false);
  const [workbenchReady, setWorkbenchReady] = useState(false);

  const sessionNameParts = parseProfileName(session?.user?.name);
  const sessionFirstName =
    session?.user?.firstName ??
    loginFirstName ??
    profileFirstName ??
    sessionNameParts.firstName ??
    "";
  const sessionLastName =
    session?.user?.lastName ??
    loginLastName ??
    profileLastName ??
    sessionNameParts.lastName ??
    "";
  const sessionEmail = session?.user?.email ?? "";
  const identity = useOnboardingStore((state) => state.identity);
  const identityPhaseComplete = useOnboardingStore(
    (state) => state.identityPhaseComplete,
  );
  const setStudioSkills = useOnboardingStore((state) => state.setStudioSkills);
  const studioSkills = useOnboardingStore((state) => state.studio.skills);
  const languages = useOnboardingStore((state) => state.languages);
  const roleLocked = identity.targetRole.trim().length > 0;

  useEffect(() => {
    void getLoginIdentity().then((login) => {
      if (!login) return;
      setLoginFirstName(login.firstName ?? "");
      setLoginLastName(login.lastName ?? "");
    });

    void getProfileIdentity().then((profile) => {
      if (!profile) return;
      setProfileFirstName(profile.firstName ?? "");
      setProfileLastName(profile.lastName ?? "");
    });
  }, []);


  useEffect(() => {
    const saved = readWorkbenchSession();
    if (saved) {
      setPhase(saved.phase);
      setDirection(1);
      setCoordinates(saved.coordinates);
      setRefineryInitial(saved.refineryInitial);
      setRefineryForm(saved.refineryForm);
      setRefineryRevision(saved.refineryRevision);
      setSectionExpansion(saved.sectionExpansion);
      setParsedStructured(saved.parsedStructured);
      setRawResumeText(saved.rawResumeText);
      setResumeData(saved.resumeData);

      const skills = parseSkillsText(saved.refineryForm.skillsText);
      if (skills.length > 0) {
        setStudioSkills(skills);
      }

      if (saved.phase >= 2 && isIdentityPhaseComplete(useOnboardingStore.getState().identity)) {
        useOnboardingStore.getState().markIdentityPhaseComplete();
      }
    }

    setWorkbenchReady(true);
  }, [setStudioSkills]);

  useEffect(() => {
    if (!workbenchReady || isSynthesizing) {
      return;
    }

    writeWorkbenchSession({
      version: 1,
      phase,
      coordinates,
      refineryForm,
      refineryInitial,
      refineryRevision,
      rawResumeText,
      parsedStructured,
      resumeData,
      sectionExpansion,
    });
  }, [
    workbenchReady,
    isSynthesizing,
    phase,
    coordinates,
    refineryForm,
    refineryInitial,
    refineryRevision,
    rawResumeText,
    parsedStructured,
    resumeData,
    sectionExpansion,
  ]);

  const goToPhase = useCallback((next: number, dir: 1 | -1 = 1) => {
    setDirection(dir);
    setPhase(next);
  }, []);

  const handleCoordinatesChange = useCallback((values: CoordinatesValues) => {
    setCoordinates(values);
    setResumeData(coordinatesToPrimeResume(values, identity));
  }, [identity]);

  useEffect(() => {
    if (phase >= 3) return;

    setResumeData((current) => {
      const targetRole = identity.targetRole.trim();
      if (
        targetRole === (current.headline?.trim() ?? "") &&
        targetRole === (current.profile?.targetRole?.trim() ?? "")
      ) {
        return current;
      }

      return {
        ...current,
        headline: targetRole || null,
        profile: {
          ...current.profile,
          targetRole: targetRole || null,
        },
      };
    });
  }, [identity.targetRole, phase]);

  const handleCoordinatesContinue = useCallback(
    async (values: CoordinatesValues) => {
      setCoordinates(values);
      setResumeData(coordinatesToPrimeResume(values, identity));

      const { city, country } = parseCityState(values.cityState);
      const fullName = [values.firstName, values.lastName].filter(Boolean).join(" ");

      try {
        const result = await completeStep(1, {
          firstName: values.firstName,
          lastName: values.lastName,
          fullName,
          email: values.email,
          phone: formatFullPhone(values.phoneDialCode, values.phone),
          city,
          country,
          targetTitle: identity.targetRole.trim() || undefined,
        });
        await updateSession({ onboardingStep: result.onboardingStep });
      } catch {
        // Local advance still works if persistence fails transiently.
      }

      goToPhase(2);
    },
    [goToPhase, identity, updateSession],
  );

  const handleFuelParsed = useCallback(
    async ({ data, rawText }: { data: StructuredResume; rawText: string }) => {
      const form = mergeParsedWithCoordinates(data, coordinates);
      const parsedSkills =
        data.skills.length > 0 ? [...data.skills] : parseSkillsText(form.skillsText);

      setParsedStructured(data);
      setRawResumeText(rawText);
      setCoordinates(hubFormToCoordinates(form));
      setRefineryInitial(form);
      setRefineryForm(form);
      setStudioSkills(parsedSkills);
      setResumeData(refineryFormToPrimeResume(form));
      setIsScanning(false);

      try {
        const enhanced = await enhanceResumeOnboarding({
          form,
          targetRole: useOnboardingStore.getState().identity.targetRole.trim(),
        });
        if (enhanced.success) {
          const enhancedSkills = parseSkillsText(enhanced.form.skillsText);
          setRefineryInitial(enhanced.form);
          setRefineryForm(enhanced.form);
          setStudioSkills(enhancedSkills);
          setResumeData(refineryFormToPrimeResume(enhanced.form));
        }
      } catch {
        // pipeline failure is non-fatal — user sees raw parsed form
      }

      goToPhase(3);
    },
    [coordinates, goToPhase, setStudioSkills],
  );

  const handleRefineryChange = useCallback((form: HubRefineryForm) => {
    setRefineryForm(form);
  }, []);

  const mergedRefineryForm = useMemo((): HubRefineryForm => {
    const skillsText =
      studioSkills.length > 0 ? studioSkills.join(", ") : refineryForm.skillsText;
    return { ...refineryForm, skillsText };
  }, [refineryForm, studioSkills]);

  const studioPreview = useMemo(() => {
    const skillsText =
      studioSkills.length > 0
        ? studioSkills.join(", ")
        : refineryForm.skillsText;
    return refineryFormToPrimeResume({
      ...refineryForm,
      skillsText,
    });
  }, [refineryForm, studioSkills]);

  const previewResume = useMemo(() => {
    if (phase < 3) return resumeData;

    const hasStudioContent =
      Boolean(studioPreview.fullName?.trim()) ||
      Boolean(studioPreview.summary?.trim()) ||
      (studioPreview.experience?.length ?? 0) > 0 ||
      (studioPreview.skills?.length ?? 0) > 0;

    return hasStudioContent ? studioPreview : resumeData;
  }, [phase, resumeData, studioPreview]);

  const handleSynthesizeArchitecture = useCallback(
    (form: HubRefineryForm) => {
      if (calibrationRanRef.current || isSynthesizing) return;

      setFinalizeError(null);

      const skills =
        useOnboardingStore.getState().studio.skills.length > 0
          ? useOnboardingStore.getState().studio.skills
          : parseSkillsText(form.skillsText);

      setRefineryForm(form);
      setResumeData(
        refineryFormToPrimeResume({
          ...form,
          skillsText: skills.join(", "),
        }),
      );
      calibrationRanRef.current = true;
      setIsSynthesizing(true);

      const { city, country } = parseCityState(form.cityState);
      const resumeLanguages = formatLanguagesForResume(
        useOnboardingStore.getState().languages,
      );

      void (async () => {
        try {
          await completeOnboarding({
            firstName: form.firstName,
            lastName: form.lastName,
            fullName: formFullName(form),
            email: form.email,
            phone: form.phone,
            city,
            country,
            targetTitle: useOnboardingStore.getState().identity.targetRole.trim() || undefined,
            summary: form.professionalSummary,
            skills,
            resumeRawText: rawResumeText,
            parsedData: {
              experiences: form.experience
                .filter((entry) => !entry.hidden)
                .map((entry) => ({
                  title: entry.title,
                  company: entry.company,
                  location: entry.location,
                  dateRange: formatDateRangeParts({
                    start: { month: entry.startMonth, year: entry.startYear },
                    end: { month: entry.endMonth, year: entry.endYear },
                  }),
                  bullets: entry.bullets
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean),
                })),
              education: form.education
                .filter((entry) => !entry.hidden)
                .map((entry) => ({
                  degree: entry.degree,
                  school: entry.school,
                  location: entry.location,
                  date: formatDateRangeParts({
                    start: { month: entry.startMonth, year: entry.startYear },
                    end: { month: entry.endMonth, year: entry.endYear },
                  }),
                })),
              certifications: form.certifications
                .filter((entry) => !entry.hidden)
                .map((entry) => entry.text.trim())
                .filter(Boolean),
              projects: form.projects
                .filter((entry) => !entry.hidden)
                .map((entry) => entry.text.trim())
                .filter(Boolean),
              languages: resumeLanguages,
              skills,
              structured: parsedStructured,
            },
          });

          await updateSession({ onboardingStep: 4 });
          clearWorkbenchSession();
        } catch (err) {
          calibrationRanRef.current = false;
          setIsSynthesizing(false);
          setFinalizeError(
            err instanceof Error
              ? err.message
              : "Could not save your profile. Please try again.",
          );
        }
      })();
    },
    [isSynthesizing, parsedStructured, rawResumeText, updateSession],
  );

  const handleRefineryBack = useCallback(() => {
    goToPhase(2, -1);
  }, [goToPhase]);

  const handleBreadcrumbNavigate = useCallback(
    (targetPhase: number) => {
      if (targetPhase >= phase || isSynthesizing) return;
      goToPhase(targetPhase, -1);
    },
    [goToPhase, isSynthesizing, phase],
  );

  const isPhaseComplete = useCallback(
    (phaseId: number, activeStep: number) => {
      if (phaseId === 1) {
        return (
          identityPhaseComplete &&
          isIdentityPhaseComplete(identity) &&
          phaseId < activeStep
        );
      }
      return phaseId < activeStep;
    },
    [identity, identityPhaseComplete],
  );

  const minNavigablePhase = phase >= 2 ? 2 : 1;

  const handleStudioToolbarChange = useCallback(
    (payload: RefineryStudioToolbarPayload | null) => {
      studioToolbarActionsRef.current = payload?.actions ?? null;
      setStudioToolbarUi((previous) => {
        if (!payload) return null;
        const { ui } = payload;
        if (
          previous &&
          previous.showRawText === ui.showRawText &&
          previous.allSectionsExpanded === ui.allSectionsExpanded &&
          previous.hasRawText === ui.hasRawText
        ) {
          return previous;
        }
        return ui;
      });
    },
    [],
  );

  useEffect(() => {
    if (phase !== 3) {
      studioToolbarActionsRef.current = null;
      setStudioToolbarUi(null);
    }
  }, [phase]);

  const headerActions = useMemo(() => {
    const monoClass = jetbrainsMono.className;

    if (phase === 2) {
      return (
        <AtsSamplePreviewLinks
          monoClass={monoClass}
          linkClassName={onboardingHeaderLinkClass}
          linkColor={ONBOARDING_HEADER_PRIMARY}
        />
      );
    }

    if (phase === 3) {
      const backLabel = getWorkbenchPhase(2)?.label ?? "Import";

      return (
        <button
          type="button"
          onClick={handleRefineryBack}
          className={cn(monoClass, onboardingHeaderBackClass)}
          style={{ color: "oklch(0.98 0.01 268)" }}
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          {backLabel}
        </button>
      );
    }

    return null;
  }, [phase, handleRefineryBack]);

  const renderPhasePanel = () => {
    switch (phase) {
      case 1:
        return (
          <CoordinatesPanel
            key={`${sessionFirstName}|${sessionLastName}|${sessionEmail}`}
            initialFirstName={sessionFirstName}
            initialLastName={sessionLastName}
            initialFullName={session?.user?.name ?? ""}
            initialEmail={sessionEmail}
            initialImage={session?.user?.image ?? null}
            monoClass={jetbrainsMono.className}
            onChange={handleCoordinatesChange}
            onContinue={(values) => void handleCoordinatesContinue(values)}
            hidePhaseIntro
          />
        );
      case 2:
        return (
          <FuelPanel
            monoClass={jetbrainsMono.className}
            coordinates={coordinates}
            onParsed={handleFuelParsed}
            onScanningChange={setIsScanning}
            hidePhaseIntro
          />
        );
      case 3:
        return (
          <RefineryPanel
            key={refineryRevision}
            initialValues={mergedRefineryForm}
            rawText={rawResumeText}
            monoClass={jetbrainsMono.className}
            onChange={handleRefineryChange}
            onFinalize={handleSynthesizeArchitecture}
            onBack={handleRefineryBack}
            sectionExpansion={sectionExpansion}
            hidePhaseIntro
            onStudioToolbarChange={handleStudioToolbarChange}
          />
        );
      default:
        return null;
    }
  };

  if (status === "loading" || !workbenchReady) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ backgroundColor: CANVAS_BG }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <motion.div
            aria-hidden="true"
            className="h-10 w-10 rounded-full border-2 border-[oklch(0.62_0.21_265_/_0.3)] border-t-[oklch(0.62_0.21_265)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          />
          <p
            className={cn(jetbrainsMono.className, "text-sm uppercase tracking-[0.14em]")}
            style={{ color: "oklch(0.45 0.02 268)" }}
          >
            Loading engine…
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen min-h-0 flex-col overflow-hidden"
      style={{ backgroundColor: CANVAS_BG }}
    >
      <OnboardingWorkbenchChrome
        phase={phase}
        monoClass={jetbrainsMono.className}
        headerActions={headerActions}
        isSynthesizing={isSynthesizing}
        minNavigablePhase={minNavigablePhase}
        isPhaseComplete={isPhaseComplete}
        onNavigate={handleBreadcrumbNavigate}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ResumeStudioWorkbench
          variant="onboarding"
          monoClass={jetbrainsMono.className}
          className="min-h-0 flex-1"
          panelScrolls={false}
          previewLayoutKey={phase}
          focusPreviewOnLayoutKey={phase >= 3 ? phase : undefined}
          previewPrefix={phase === 1 ? <IdentityCanvasGhost monoClass={jetbrainsMono.className} /> : null}
          preview={
            <div
              className={cn(
                "relative w-full transition-opacity duration-300",
                phase === 1 && !roleLocked && "pointer-events-none opacity-0",
              )}
            >
              <PrimeResume
                resume={previewResume}
                showTargetRole={phase < 3}
                languageEntries={phase >= 3 ? languages : []}
                variant="workbench"
                className="w-full"
              />
            </div>
          }
          previewOverlay={<ScanningBeam active={isScanning} />}
          panel={
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6 py-6">
                {finalizeError ? (
                  <p
                    className="mb-4 shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                    role="alert"
                  >
                    {finalizeError}
                  </p>
                ) : null}
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={phase}
                    custom={direction}
                    variants={stepMotion}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={stepTransition}
                    className="flex flex-1 flex-col"
                  >
                    {renderPhasePanel()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          }
        />
      </div>

      <SynthesisTransition
        active={isSynthesizing}
        resume={resumeData}
        redirectTo="/dashboard/keys"
        durationMs={5000}
      />
    </div>
  );
}
