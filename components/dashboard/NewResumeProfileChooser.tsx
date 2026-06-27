"use client";

import { JetBrains_Mono } from "next/font/google";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { useCallback, useState } from "react";
import {
  createResumeProfile,
  createResumeProfileFromParsed,
} from "@/app/actions/resume-profiles";
import { FuelPanel } from "@/components/onboarding/hub/FuelPanel";
import { DashboardWorkspacePage } from "@/components/dashboard/DashboardWorkspacePage";
import { Button } from "@/components/ui/button";
import {
  emptyCoordinatesValues,
  mergeParsedWithCoordinates,
} from "@/lib/onboarding/hubResume";
import type { StructuredResume } from "@/lib/resume/heuristicParser";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

type NewResumeProfileChooserProps = {
  profileCount: number;
  maxProfiles: number;
};

type ChooserStep = "choose" | "upload";

export function NewResumeProfileChooser({
  profileCount,
  maxProfiles,
}: NewResumeProfileChooserProps) {
  const router = useRouter();
  const [step, setStep] = useState<ChooserStep>("choose");
  const [isCreating, setIsCreating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = isCreating || isScanning;

  async function start(copyFromDefault: boolean) {
    setIsCreating(true);
    setError(null);

    const result = await createResumeProfile({ copyFromDefault });

    setIsCreating(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push(`/dashboard/resume-profiles/${result.profileId}/edit`);
    router.refresh();
  }

  const handleFuelParsed = useCallback(
    async ({ data, rawText }: { data: StructuredResume; rawText: string }) => {
      setIsCreating(true);
      setError(null);

      const form = mergeParsedWithCoordinates(data, emptyCoordinatesValues());
      const result = await createResumeProfileFromParsed({
        form,
        rawResumeText: rawText,
      });

      setIsCreating(false);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(`/dashboard/resume-profiles/${result.profileId}/edit`);
      router.refresh();
    },
    [router],
  );

  if (step === "upload") {
    return (
      <DashboardWorkspacePage
        title="Upload resume"
        description="PDF or DOCX — we'll parse it and open Resume Studio with your sections prefilled."
      >
        {error ? (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <FuelPanel
          monoClass={jetbrainsMono.className}
          coordinates={emptyCoordinatesValues()}
          onParsed={(payload) => void handleFuelParsed(payload)}
          onScanningChange={setIsScanning}
          hidePhaseIntro
          successAdvanceLabel="Opening Resume Studio…"
        />

        <Button
          variant="ghost"
          className="mt-4 rounded-xl"
          disabled={busy}
          onClick={() => {
            setError(null);
            setStep("choose");
          }}
        >
          Back
        </Button>
      </DashboardWorkspacePage>
    );
  }

  return (
    <DashboardWorkspacePage
      title="New resume profile"
      description={`Pick a target role in Studio — profile ${profileCount + 1} of ${maxProfiles} max.`}
    >
      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void start(true)}
          className="rounded-2xl border border-border bg-surface/60 p-5 text-left transition-colors hover:border-mint/40 hover:bg-surface"
        >
          <p className="text-sm font-semibold text-foreground">Copy from default</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Start with your default profile&apos;s contact, experience, and skills — set a new role name.
          </p>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void start(false)}
          className="rounded-2xl border border-dashed border-border p-5 text-left transition-colors hover:border-mint/40 hover:bg-surface/40"
        >
          <p className="text-sm font-semibold text-foreground">Start blank</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Empty Studio — useful for a different person or a fresh role track.
          </p>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setError(null);
            setStep("upload");
          }}
          className="rounded-2xl border border-border bg-surface/60 p-5 text-left transition-colors hover:border-mint/40 hover:bg-surface"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileUp className="h-4 w-4 text-primary" aria-hidden="true" />
            Upload resume
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Import a PDF or DOCX — same parser as onboarding — then refine in Studio.
          </p>
        </button>
      </div>

      <Button
        variant="ghost"
        className="rounded-xl"
        disabled={busy}
        onClick={() => router.push("/dashboard/resume-profiles")}
      >
        Back to profiles
      </Button>
    </DashboardWorkspacePage>
  );
}
