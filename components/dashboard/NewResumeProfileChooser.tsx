"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createResumeProfile } from "@/app/actions/resume-profiles";
import { DashboardWorkspacePage } from "@/components/dashboard/DashboardWorkspacePage";
import { Button } from "@/components/ui/button";

type NewResumeProfileChooserProps = {
  profileCount: number;
  maxProfiles: number;
};

export function NewResumeProfileChooser({
  profileCount,
  maxProfiles,
}: NewResumeProfileChooserProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          disabled={isCreating}
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
          disabled={isCreating}
          onClick={() => void start(false)}
          className="rounded-2xl border border-dashed border-border p-5 text-left transition-colors hover:border-mint/40 hover:bg-surface/40"
        >
          <p className="text-sm font-semibold text-foreground">Start blank</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Empty Studio — useful for a different person or a fresh role track.
          </p>
        </button>
      </div>

      <Button
        variant="ghost"
        className="rounded-xl"
        disabled={isCreating}
        onClick={() => router.push("/dashboard/resume-profiles")}
      >
        Back to profiles
      </Button>
    </DashboardWorkspacePage>
  );
}
