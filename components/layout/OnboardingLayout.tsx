"use client";

import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import FormSection from "@/components/layout/FormSection";
import VisualSection from "@/components/layout/VisualSection";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  direction?: number;
  /** Progress fill percentage (0–100) for the top bar */
  progress?: number;
}

const layoutSpring = {
  type: "spring" as const,
  stiffness: 260,
  damping: 32,
  mass: 0.85,
};

const contentVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 28 : -28,
    filter: "blur(3px)",
  }),
  center: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -20 : 20,
    filter: "blur(3px)",
  }),
};

export default function OnboardingLayout({
  children,
  currentStep,
  direction = 1,
  progress = 25,
}: OnboardingLayoutProps) {
  /** Even steps (2, 4, 6…): form column on the right */
  const isRightAligned = currentStep % 2 === 0;

  return (
    <div className="relative min-h-screen bg-background">
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-gray-200">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <LayoutGroup>
        <motion.div
          layout
          className="mx-auto flex min-h-screen max-w-[1440px] flex-col gap-4 p-4 lg:flex-row lg:gap-5 lg:p-6"
          transition={{ layout: layoutSpring }}
        >
          <motion.div
            layout
            layoutId="onboarding-form-column"
            transition={{ layout: layoutSpring }}
            className={[
              "flex min-h-[480px] flex-1 flex-col lg:min-h-[calc(100vh-3rem)]",
              isRightAligned ? "lg:order-2" : "lg:order-1",
            ].join(" ")}
          >
            <div className="flex flex-1 flex-col overflow-hidden rounded-[12px] border border-brand-border bg-card shadow-card">
              <FormSection>
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentStep}
                    custom={direction}
                    variants={contentVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      duration: 0.38,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    className="flex w-full flex-1 flex-col"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </FormSection>
            </div>
          </motion.div>

          <motion.div
            layout
            layoutId="onboarding-visual-column"
            transition={{ layout: layoutSpring }}
            className={[
              "hidden min-h-0 flex-1 flex-col lg:flex lg:min-h-[calc(100vh-3rem)]",
              isRightAligned ? "lg:order-1" : "lg:order-2",
            ].join(" ")}
          >
            <VisualSection currentStep={currentStep} direction={direction} />
          </motion.div>
        </motion.div>
      </LayoutGroup>
    </div>
  );
}
