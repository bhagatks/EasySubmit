"use client";

import { FormProvider, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { RefineryEditorPanel } from "@/components/onboarding/RefineryStep";
import { GhostTypewriterResume } from "@/components/resume/GhostTypewriterResume";
import { PrimeResume } from "@/components/resume/PrimeResume";
import {
  toPrimeResumeData,
  type RefineryFormValues,
} from "@/lib/resume/refineryForm";

type RefinerySessionProps = {
  initialValues: RefineryFormValues;
  formKey: number;
};

export function RefinerySession({ initialValues, formKey }: RefinerySessionProps) {
  const [ghostComplete, setGhostComplete] = useState(false);
  const [ghostSnapshot, setGhostSnapshot] = useState(() =>
    toPrimeResumeData(initialValues),
  );
  const form = useForm<RefineryFormValues>({
    defaultValues: initialValues,
    mode: "onChange",
  });

  useEffect(() => {
    form.reset(initialValues);
    setGhostSnapshot(toPrimeResumeData(initialValues));
    setGhostComplete(false);
  }, [form, formKey, initialValues]);

  const liveCanvasData = toPrimeResumeData(form.watch());

  return (
    <FormProvider {...form}>
      <section
        aria-label="Resume canvas"
        className="relative min-h-0 w-[60%] shrink-0 overflow-y-auto bg-background px-6 py-10 sm:px-10"
      >
        <div className="mx-auto flex w-full max-w-[210mm] justify-center py-4">
          <div className="relative w-full">
            {!ghostComplete ? (
              <GhostTypewriterResume
                data={ghostSnapshot}
                onComplete={() => setGhostComplete(true)}
              />
            ) : (
              <PrimeResume data={liveCanvasData} />
            )}
          </div>
        </div>
      </section>

      <section
        aria-label="Engine tuning"
        className="flex min-h-0 w-[40%] shrink-0 flex-col border-l border-border bg-surface"
      >
        <header className="shrink-0 border-b border-white/10 px-6 py-5">
          <p
            className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
            style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
          >
            Engine Tuning
          </p>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
          <RefineryEditorPanel />
        </div>
      </section>
    </FormProvider>
  );
}
