"use client";

import { JetBrains_Mono } from "next/font/google";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { completeOnboarding, completeStep } from "@/app/actions/onboarding";
import { CalibrationPanel } from "@/components/onboarding/hub/CalibrationPanel";
import { CalibrationPulse } from "@/components/onboarding/hub/CalibrationPulse";
import {
  CoordinatesPanel,
  type CoordinatesValues,
} from "@/components/onboarding/hub/CoordinatesPanel";
import { FuelPanel } from "@/components/onboarding/hub/FuelPanel";
import { RefineryPanel } from "@/components/onboarding/hub/RefineryPanel";
import { SystemStatusBreadcrumb } from "@/components/onboarding/hub/SystemStatusBreadcrumb";
import {
  PrimeResume,
  type PrimeResumeData,
} from "@/components/onboarding/PrimeResume";
import { ScanningBeam } from "@/components/resume/ScanningBeam";
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

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const TOTAL_PHASES = 4;
const CALIBRATION_MS = 2500;

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
  const [finalForm, setFinalForm] = useState<HubRefineryForm | null>(null);
  const [parsedStructured, setParsedStructured] = useState<StructuredResume | null>(
    null,
  );
  const [rawResumeText, setRawResumeText] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [calibrationStarted, setCalibrationStarted] = useState(false);
  const calibrationRanRef = useRef(false);

  const sessionName = session?.user?.name ?? "";
  const sessionEmail = session?.user?.email ?? "";

  useEffect(() => {
    const sessionStep = session?.user?.onboardingStep ?? 0;
    if (sessionStep >= 4) {
      router.replace("/dashboard");
    }
  }, [session?.user?.onboardingStep, router]);

  const goToPhase = useCallback((next: number, dir: 1 | -1 = 1) => {
    setDirection(dir);
    setPhase(next);
  }, []);

  const handleCoordinatesChange = useCallback((values: CoordinatesValues) => {
    setCoordinates(values);
    setResumeData(coordinatesToPrimeResume(values));
  }, []);

  const handleCoordinatesContinue = useCallback(
    async (values: CoordinatesValues) => {
      setCoordinates(values);
      setResumeData(coordinatesToPrimeResume(values));

      const { city, country } = parseCityState(values.cityState);
      const fullName = [values.firstName, values.lastName].filter(Boolean).join(" ");

      try {
        const result = await completeStep(1, {
          fullName,
          email: values.email,
          phone: formatFullPhone(values.phoneDialCode, values.phone),
          city,
          country,
        });
        await updateSession({ onboardingStep: result.onboardingStep });
      } catch {
        // Local advance still works if persistence fails transiently.
      }

      goToPhase(2);
    },
    [goToPhase, updateSession],
  );

  const handleFuelParsed = useCallback(
    ({ data, rawText }: { data: StructuredResume; rawText: string }) => {
      const form = mergeParsedWithCoordinates(data, coordinates);
      const mergedCoordinates = hubFormToCoordinates(form);

      setParsedStructured(data);
      setRawResumeText(rawText);
      setCoordinates(mergedCoordinates);
      setRefineryInitial(form);
      setResumeData(refineryFormToPrimeResume(form));
      setIsScanning(false);
      goToPhase(3);
    },
    [coordinates, goToPhase],
  );

  const handleRefineryChange = useCallback((form: HubRefineryForm) => {
    setResumeData(refineryFormToPrimeResume(form));
  }, []);

  const handleFinalizeEngine = useCallback(
    (form: HubRefineryForm) => {
      setFinalForm(form);
      setResumeData(refineryFormToPrimeResume(form));
      goToPhase(4);
    },
    [goToPhase],
  );

  const handleRefineryBack = useCallback(() => {
    goToPhase(2, -1);
  }, [goToPhase]);

  useEffect(() => {
    if (phase !== 4 || !finalForm || calibrationRanRef.current) return;

    calibrationRanRef.current = true;
    setCalibrationStarted(true);

    const { city, country } = parseCityState(finalForm.cityState);
    const skills = parseSkillsText(finalForm.skillsText);

    void (async () => {
      try {
        await completeOnboarding({
          fullName: formFullName(finalForm),
          email: finalForm.email,
          phone: finalForm.phone,
          city,
          country,
          summary: finalForm.professionalSummary,
          skills,
          resumeRawText: rawResumeText,
          parsedData: {
            experiences: finalForm.experience
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
            education: finalForm.education
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
            certifications: finalForm.certifications
              .filter((entry) => !entry.hidden)
              .map((entry) => entry.text.trim())
              .filter(Boolean),
            projects: finalForm.projects
              .filter((entry) => !entry.hidden)
              .map((entry) => entry.text.trim())
              .filter(Boolean),
            languages: finalForm.languages
              .filter((entry) => !entry.hidden)
              .map((entry) => entry.text.trim())
              .filter(Boolean),
            skills,
            structured: parsedStructured,
          },
        });

        await new Promise((resolve) => window.setTimeout(resolve, CALIBRATION_MS));
        await updateSession({ onboardingStep: 4 });
        router.push("/dashboard");
      } catch {
        calibrationRanRef.current = false;
        setCalibrationStarted(false);
        goToPhase(3, -1);
      }
    })();
  }, [finalForm, goToPhase, parsedStructured, phase, rawResumeText, router, updateSession]);

  const handleBreadcrumbNavigate = useCallback(
    (targetPhase: number) => {
      if (targetPhase >= phase || phase === 4) return;
      goToPhase(targetPhase, -1);
    },
    [goToPhase, phase],
  );

  const isCalibrating = phase === 4 && calibrationStarted;
  const minNavigablePhase = phase >= 2 ? 2 : 1;
  const calibrationTitle = formFullName(finalForm ?? refineryInitial) || "Your profile";

  const renderPhasePanel = () => {
    switch (phase) {
      case 1:
        return (
          <CoordinatesPanel
            initialFullName={sessionName}
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
            onFinalize={handleFinalizeEngine}
            onBack={handleRefineryBack}
          />
        );
      case 4:
        return (
          <CalibrationPanel
            targetTitle={calibrationTitle}
            monoClass={jetbrainsMono.className}
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

      <div className="flex min-h-0 flex-1">
        <section
          aria-label="Resume canvas"
          className="relative hidden min-h-0 w-[60%] shrink-0 overflow-y-auto lg:block"
          style={{ backgroundColor: CANVAS_BG }}
        >
          <div className="mx-auto flex min-h-full w-full max-w-4xl justify-center px-6 py-10 sm:px-10">
            <div className="relative w-full max-w-[min(100%,32rem)]">
              <PrimeResume resume={resumeData} className="min-h-[520px]" />
              <ScanningBeam active={isScanning} />
              <CalibrationPulse active={isCalibrating} targetTitle={calibrationTitle} />
            </div>
          </div>
        </section>

        <section
          aria-label="Onboarding panel"
          className="flex min-h-0 w-full shrink-0 flex-col border-white/10 bg-surface lg:w-[40%] lg:border-l"
        >
          <header className="shrink-0 border-b border-white/10 px-6 py-5">
            <SystemStatusBreadcrumb
              currentStep={phase}
              monoClass={jetbrainsMono.className}
              isCalibrating={phase === 4}
              minNavigablePhase={minNavigablePhase}
              onNavigate={handleBreadcrumbNavigate}
            />
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
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
        </section>
      </div>
    </div>
  );
}
