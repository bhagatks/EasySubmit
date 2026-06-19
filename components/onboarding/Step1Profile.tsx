"use client";

import { motion } from "framer-motion";
import { Briefcase, DollarSign } from "lucide-react";
import { useSession } from "next-auth/react";
import { type FormEvent, useEffect, useState } from "react";
import { completeStep } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/stores/onboardingStore";

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground transition-colors focus:border-mint/50 focus:outline-none focus:ring-1 focus:ring-mint/40";

interface Step1ProfileProps {
  onNext?: () => void;
  hideSubmitButton?: boolean;
  formId?: string;
  onValidityChange?: (valid: boolean) => void;
}

export default function Step1Profile({
  onNext,
  hideSubmitButton = false,
  formId,
  onValidityChange,
}: Step1ProfileProps) {
  const { update: updateSession } = useSession();
  const setSelectedRole = useOnboardingStore((s) => s.setSelectedRole);
  const setMinSalary = useOnboardingStore((s) => s.setMinSalary);

  const [targetJobTitle, setTargetJobTitle] = useState("");
  const [minimumSalary, setMinimumSalary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedSalary = Number(minimumSalary.replace(/,/g, ""));
  const isValid =
    targetJobTitle.trim().length > 0 &&
    Number.isFinite(parsedSalary) &&
    parsedSalary >= 30_000;

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const role = targetJobTitle.trim();
    const minSalaryThousands = Math.round(parsedSalary / 1000);

    try {
      const result = await completeStep(1, {
        selectedRole: role,
        minSalary: minSalaryThousands,
      });

      await updateSession({ onboardingStep: result.onboardingStep });

      setSelectedRole(role);
      setMinSalary(minSalaryThousands);
      onNext?.();
    } catch {
      setError("We couldn't save your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-1 flex-col"
    >
      <p className="font-body text-xs font-medium uppercase tracking-[0.18em] text-mint">
        Step 1 · Profile
      </p>
      <h1 className="mt-3 font-display text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl">
        Tell us what you&apos;re aiming for
      </h1>
      <p className="mt-2 max-w-md font-body text-sm leading-relaxed text-muted-foreground">
        We&apos;ll use your target role and salary floor to personalize matches from day one.
      </p>

      <form
        id={formId}
        onSubmit={handleSubmit}
        className="mt-8 flex flex-1 flex-col"
      >
        <div className="rounded-xl border border-white/10 bg-surface/60 p-6 shadow-elevated backdrop-blur-xl">
          <div className="space-y-5">
            <div>
              <label
                htmlFor="target-job-title"
                className="mb-2 flex items-center gap-2 font-body text-sm font-medium text-foreground"
              >
                <Briefcase className="h-4 w-4 text-mint" aria-hidden="true" />
                Target Job Title
              </label>
              <input
                id="target-job-title"
                type="text"
                value={targetJobTitle}
                onChange={(event) => setTargetJobTitle(event.target.value)}
                placeholder="e.g. Senior Product Manager"
                autoComplete="organization-title"
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="minimum-salary"
                className="mb-2 flex items-center gap-2 font-body text-sm font-medium text-foreground"
              >
                <DollarSign className="h-4 w-4 text-mint" aria-hidden="true" />
                Desired Salary
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-body text-sm text-mint">
                  $
                </span>
                <input
                  id="minimum-salary"
                  type="text"
                  inputMode="numeric"
                  value={minimumSalary}
                  onChange={(event) =>
                    setMinimumSalary(event.target.value.replace(/[^\d,]/g, ""))
                  }
                  placeholder="85,000"
                  className={`${inputClassName} pl-8`}
                />
              </div>
              <p className="mt-2 font-body text-xs text-muted-foreground">
                USD per year · minimum $30,000
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
          >
            {error}
          </p>
        )}

        {!hideSubmitButton && (
          <div className="mt-auto pt-10">
            <Button
              type="submit"
              variant="hero"
              size="xl"
              disabled={!isValid || isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? "Saving…" : "Continue"}
            </Button>
          </div>
        )}
      </form>
    </motion.div>
  );
}
