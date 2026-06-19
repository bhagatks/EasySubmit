"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { completeOnboarding } from "@/app/actions/onboarding";
import { LogoIcon } from "@/components/ui/logo";
import { splitLocationField } from "@/lib/resume/extractSections";
import { useOnboardingStore } from "@/stores/onboardingStore";

const CALIBRATION_MS = 4200;
const PRIME_HOLD_MS = 1800;
const SCAN_CYCLE_S = 2.4;

const ELECTRIC = "oklch(0.62 0.21 265)";
const MINT = "oklch(0.82 0.16 165)";

type CalibrationPhase = "calibrating" | "prime";

type DataNode = {
  id: string;
  label: string;
  startX: number;
  startY: number;
  delay: number;
};

function buildDataNodes(
  skills: string[],
  competencies: string[],
  role: string | null,
): DataNode[] {
  const labels = Array.from(
    new Set(
      [
        role,
        ...competencies.slice(0, 4),
        ...skills.slice(0, 8),
        "React",
        "TypeScript",
        "Senior Dev",
      ].filter((value): value is string => Boolean(value?.trim())),
    ),
  ).slice(0, 10);

  return labels.map((label, index) => {
    const angle = (index / labels.length) * Math.PI * 2 - Math.PI / 2;
    const radius = 38 + (index % 3) * 4;

    return {
      id: `node-${index}-${label}`,
      label,
      startX: 50 + Math.cos(angle) * radius,
      startY: 50 + Math.sin(angle) * radius,
      delay: 0.35 + index * 0.18,
    };
  });
}

function CalibrationBeam() {
  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 z-20 h-24 -translate-y-1/2"
        style={{
          background: `linear-gradient(180deg, transparent, ${ELECTRIC}33, transparent)`,
        }}
        initial={{ top: "-12%" }}
        animate={{ top: "112%" }}
        transition={{
          duration: SCAN_CYCLE_S,
          ease: "linear",
          repeat: Infinity,
        }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 z-30 h-px -translate-y-1/2"
        style={{
          background: `linear-gradient(90deg, transparent, ${ELECTRIC}, transparent)`,
          boxShadow: `0 0 16px 3px ${ELECTRIC}cc, 0 0 40px 8px ${ELECTRIC}44`,
        }}
        initial={{ top: "-12%" }}
        animate={{ top: "112%" }}
        transition={{
          duration: SCAN_CYCLE_S,
          ease: "linear",
          repeat: Infinity,
        }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 z-20 h-20 -translate-y-1/2"
        style={{
          background: `linear-gradient(180deg, transparent, ${MINT}22, transparent)`,
        }}
        initial={{ top: "112%" }}
        animate={{ top: "-12%" }}
        transition={{
          duration: SCAN_CYCLE_S * 1.35,
          ease: "linear",
          repeat: Infinity,
        }}
      />
    </>
  );
}

function FlyingDataNode({
  node,
  active,
}: {
  node: DataNode;
  active: boolean;
}) {
  return (
    <motion.span
      className="pointer-events-none absolute z-20 whitespace-nowrap rounded-xl border border-white/15 bg-surface/80 px-3 py-1.5 font-body text-xs font-semibold text-foreground shadow-elevated backdrop-blur-xl"
      style={{
        left: `${node.startX}%`,
        top: `${node.startY}%`,
        translateX: "-50%",
        translateY: "-50%",
      }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={
        active
          ? {
              left: "50%",
              top: "50%",
              opacity: [0, 1, 1, 0],
              scale: [0.85, 1, 0.72, 0.2],
            }
          : { opacity: 0, scale: 0.85 }
      }
      transition={{
        duration: 1.35,
        delay: node.delay,
        ease: [0.22, 0.61, 0.36, 1],
      }}
    >
      {node.label}
    </motion.span>
  );
}

function SystemsPrime() {
  return (
    <motion.div
      key="systems-prime"
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center justify-center py-8 text-center"
    >
      <motion.div
        aria-hidden="true"
        className="absolute h-56 w-56 rounded-full"
        style={{
          background: `radial-gradient(circle, ${MINT}44 0%, transparent 70%)`,
        }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.div
        className="relative grid h-28 w-28 place-items-center rounded-full border-2 bg-surface/80 shadow-elevated backdrop-blur-2xl"
        style={{ borderColor: `${MINT}88` }}
        initial={{ scale: 0.85 }}
        animate={{ scale: [0.85, 1.06, 1] }}
        transition={{ duration: 0.65, ease: "easeOut" }}
      >
        <LogoIcon className="h-16 w-16" aria-hidden="true" />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.4 }}
        className="mt-8 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
      >
        Systems Prime
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.4 }}
        className="mt-3 font-body text-sm text-muted-foreground"
      >
        Engine locked — entering your command center…
      </motion.p>
    </motion.div>
  );
}

export default function StepCalibration() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const setIsMapping = useOnboardingStore((s) => s.setIsMapping);
  const selectedRole = useOnboardingStore((s) => s.selectedRole);
  const minSalary = useOnboardingStore((s) => s.minSalary);
  const workMode = useOnboardingStore((s) => s.workMode);
  const parsedResumeData = useOnboardingStore((s) => s.parsedResumeData);
  const resumePreviewUrl = useOnboardingStore((s) => s.resumePreviewUrl);
  const refineryDraft = useOnboardingStore((s) => s.refineryDraft);

  const [phase, setPhase] = useState<CalibrationPhase>("calibrating");
  const finalizeStarted = useRef(false);

  const dataNodes = useMemo(
    () =>
      buildDataNodes(
        refineryDraft?.technicalSkills ?? parsedResumeData?.skills ?? [],
        refineryDraft?.coreCompetencies ?? [],
        selectedRole,
      ),
    [parsedResumeData?.skills, refineryDraft, selectedRole],
  );

  useEffect(() => {
    setIsMapping(true);
    return () => setIsMapping(false);
  }, [setIsMapping]);

  useEffect(() => {
    if (finalizeStarted.current) return;
    finalizeStarted.current = true;

    let cancelled = false;

    const locationParts = refineryDraft?.location
      ? splitLocationField(refineryDraft.location)
      : { city: "", country: "" };

    const animationDone = new Promise<void>((resolve) => {
      window.setTimeout(resolve, CALIBRATION_MS);
    });

    const persistProfile = completeOnboarding({
      targetTitle: selectedRole,
      minSalary,
      workMode,
      fullName: refineryDraft?.fullName,
      email: refineryDraft?.email,
      phone: refineryDraft?.phone ?? parsedResumeData?.phone ?? undefined,
      city: locationParts.city || undefined,
      country: locationParts.country || undefined,
      coreCompetencies: refineryDraft?.coreCompetencies,
      skills: refineryDraft?.technicalSkills ?? parsedResumeData?.skills,
      resumeRawText: parsedResumeData?.rawText,
      parsedData: refineryDraft
        ? {
            email: refineryDraft.email,
            phone: refineryDraft.phone || null,
            linkedIn: parsedResumeData?.linkedIn ?? null,
            experiences: refineryDraft.experiences,
            projects: refineryDraft.projects,
            skills: refineryDraft.technicalSkills,
            previewUrl: resumePreviewUrl,
          }
        : parsedResumeData
          ? {
              email: parsedResumeData.email,
              phone: parsedResumeData.phone,
              linkedIn: parsedResumeData.linkedIn,
              skills: parsedResumeData.skills,
              previewUrl: resumePreviewUrl,
            }
          : undefined,
    });

    void Promise.all([animationDone, persistProfile])
      .then(async ([, result]) => {
        if (cancelled) return;

        await updateSession({ onboardingStep: result.onboardingStep });
        setPhase("prime");

        window.setTimeout(() => {
          if (!cancelled) {
            router.push("/dashboard");
          }
        }, PRIME_HOLD_MS);
      })
      .catch((error) => {
        console.error("StepCalibration completeOnboarding failed:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [
    minSalary,
    parsedResumeData,
    refineryDraft,
    resumePreviewUrl,
    router,
    selectedRole,
    updateSession,
    workMode,
  ]);

  return (
    <div className="flex w-full flex-col">
      <AnimatePresence mode="wait">
        {phase === "calibrating" ? (
          <motion.div
            key="calibrating"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
            transition={{ duration: 0.4 }}
          >
            <p className="font-body text-xs font-medium uppercase tracking-[0.18em] text-[oklch(0.82_0.16_165)]">
              Final calibration
            </p>
            <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Locking engine coordinates
            </h1>
            <p className="mt-2 font-body text-sm text-muted-foreground">
              Profile pillars are streaming into the core while we finalize your
              workspace.
            </p>

            <div className="relative mt-8 h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-surface/60 shadow-elevated backdrop-blur-2xl sm:h-[460px]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `linear-gradient(${ELECTRIC}18 1px, transparent 1px), linear-gradient(90deg, ${ELECTRIC}18 1px, transparent 1px)`,
                  backgroundSize: "28px 28px",
                }}
              />

              <CalibrationBeam />

              <div className="relative z-10 flex h-full items-center justify-center">
                <motion.div
                  className="relative z-30 grid h-32 w-32 place-items-center rounded-full border-2 bg-surface/70 shadow-elevated backdrop-blur-xl"
                  style={{ borderColor: `${ELECTRIC}88` }}
                  animate={{
                    boxShadow: [
                      `0 0 0px ${ELECTRIC}00`,
                      `0 0 48px ${ELECTRIC}55`,
                      `0 0 32px ${MINT}44`,
                    ],
                    scale: [1, 1.04, 1],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <LogoIcon className="h-[4.5rem] w-[4.5rem]" aria-hidden="true" />
                </motion.div>

                {dataNodes.map((node) => (
                  <FlyingDataNode key={node.id} node={node} active={phase === "calibrating"} />
                ))}
              </div>

              <motion.p
                className="absolute bottom-5 left-0 right-0 z-40 text-center font-body text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground"
                animate={{ opacity: [0.45, 1, 0.45] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              >
                Calibrating profile matrix…
              </motion.p>
            </div>
          </motion.div>
        ) : (
          <SystemsPrime />
        )}
      </AnimatePresence>
    </div>
  );
}
