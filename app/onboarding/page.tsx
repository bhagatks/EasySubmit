"use client";

import { JetBrains_Mono } from "next/font/google";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { completeOnboarding, completeStep } from "@/app/actions/onboarding";
import { getLoginIdentity, getProfileIdentity } from "@/app/actions/profile";
import { IdentityCanvasGhost } from "@/components/onboarding/hub/IdentityCanvasGhost";
import { SynthesisTransition } from "@/components/onboarding/SynthesisTransition";
import {
  CoordinatesPanel,
  type CoordinatesValues,
} from "@/components/onboarding/hub/CoordinatesPanel";
import { FuelPanel } from "@/components/onboarding/hub/FuelPanel";
import { RefineryPanel } from "@/components/onboarding/hub/RefineryPanel";
import { SystemStatusBreadcrumb } from "@/components/onboarding/hub/SystemStatusBreadcrumb";
import { SignOutButton } from "@/components/auth/SignOutButton";
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
import { useOnboardingStore } from "@/stores/onboardingStore";
import { isIdentityPhaseComplete } from "@/lib/onboarding/identity";
import { formatLanguagesForResume } from "@/lib/onboarding/languages";
import { parseProfileName } from "@/lib/profile/name";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const TOTAL_PHASES = 3;

const CANVAS_BG = "oklch(0.16 0.04 268)";
const PRIMARY = "oklch(0.62 0.21 265)";

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

function PhaseProgressBar({ phase }: { phase: number }) {
  const progress = (phase / TOTAL_PHASES) * 100;

  return (
    <div
      className="h-1 w-full shrink-0 overflow-hidden bg-white/10"
      role="progressbar"
      aria-valuenow={phase}
      aria-valuemin={1}
      aria-valuemax={TOTAL_PHASES}
      aria-label={`Onboarding progress: phase ${phase} of ${TOTAL_PHASES}`}
    >
      <motion.div
        className="h-full"
        style={{ backgroundColor: PRIMARY }}
        initial={false}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      />
    </div>
  );
}

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
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();

  const [phase, setPhase] = useState(1);
  const [direction, setDirection] = useState(1);
  const [resumeData, setResumeData] = useState<PrimeResumeData>(EMPTY_RESUME);
  const [coordinates, setCoordinates] = useState<CoordinatesValues>(
    emptyCoordinatesValues(),
  );
  const [refineryInitial, setRefineryInitial] =
    useState<HubRefineryForm>(emptyHubRefineryForm());
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
  const calibrationRanRef = useRef(false);

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
    if (status === "loading") return;

    const sessionStep = session?.user?.onboardingStep ?? 0;

    if (sessionStep >= 4) {
      router.replace("/dashboard");
    }
  }, [router, session?.user?.onboardingStep, status]);

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
    ({ data, rawText }: { data: StructuredResume; rawText: string }) => {
      const form = mergeParsedWithCoordinates(data, coordinates);
      const parsedSkills =
        data.skills.length > 0 ? [...data.skills] : parseSkillsText(form.skillsText);

      setParsedStructured(data);
      setRawResumeText(rawText);
      setCoordinates(hubFormToCoordinates(form));
      setRefineryInitial(form);
      setStudioSkills(parsedSkills);
      setResumeData(refineryFormToPrimeResume(form));
      setIsScanning(false);
      goToPhase(3);
    },
    [coordinates, goToPhase, setStudioSkills],
  );

  const handleRefineryChange = useCallback((form: HubRefineryForm) => {
    setResumeData(refineryFormToPrimeResume(form));
  }, []);

  const handleSynthesizeArchitecture = useCallback(
    (form: HubRefineryForm) => {
      if (calibrationRanRef.current || isSynthesizing) return;

      setResumeData(refineryFormToPrimeResume(form));
      calibrationRanRef.current = true;
      setIsSynthesizing(true);

      const { city, country } = parseCityState(form.cityState);
      const skills = parseSkillsText(form.skillsText);
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
        } catch {
          calibrationRanRef.current = false;
          setIsSynthesizing(false);
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
            monoClass={jetbrainsMono.className}
            onChange={handleCoordinatesChange}
            onContinue={(values) => void handleCoordinatesContinue(values)}
          />
        );
      case 2:
        return (
          <FuelPanel
            monoClass={jetbrainsMono.className}
            coordinates={coordinates}
            onParsed={handleFuelParsed}
            onScanningChange={setIsScanning}
          />
        );
      case 3:
        return (
          <RefineryPanel
            initialValues={refineryInitial}
            rawText={rawResumeText}
            monoClass={jetbrainsMono.className}
            onChange={handleRefineryChange}
            onFinalize={handleSynthesizeArchitecture}
            onBack={handleRefineryBack}
          />
        );
      default:
        return null;
    }
  };

  if (status === "loading") {
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
      <PhaseProgressBar phase={phase} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ResumeStudioWorkbench
          variant="onboarding"
          monoClass={jetbrainsMono.className}
          className="min-h-0 flex-1"
          panelScrolls={false}
          previewPrefix={phase === 1 ? <IdentityCanvasGhost monoClass={jetbrainsMono.className} /> : null}
          preview={
            <motion.div
              className="relative w-full"
              initial={false}
              animate={{
                opacity: phase === 1 && !roleLocked ? 0 : 1,
                scale: phase === 1 && roleLocked ? 1 : phase === 1 ? 0.98 : 1,
              }}
              transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <PrimeResume
                resume={resumeData}
                showTargetRole={phase < 3}
                languageEntries={phase >= 3 ? languages : []}
                variant="workbench"
                className="w-full"
              />
            </motion.div>
          }
          previewOverlay={<ScanningBeam active={isScanning} />}
          panel={
            <div className="flex h-full min-h-0 flex-col">
              <header className="shrink-0 border-b border-white/10">
                <div className="flex items-stretch">
                  <SystemStatusBreadcrumb
                    currentStep={phase}
                    isSynthesizing={isSynthesizing}
                    minNavigablePhase={minNavigablePhase}
                    isPhaseComplete={isPhaseComplete}
                    onNavigate={handleBreadcrumbNavigate}
                  />
                  <div className="flex shrink-0 items-center border-l border-white/10 px-2 sm:px-3">
                    <SignOutButton iconOnly />
                  </div>
                </div>
              </header>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6 py-6">
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
