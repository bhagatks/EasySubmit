"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createResumeProfile,
  deleteResumeProfile,
  setDefaultResumeProfile,
  type ResumeProfileListItem,
} from "@/app/actions/resume-profiles";
import { Button } from "@/components/ui/button";
import { joinProfileName } from "@/lib/profile/name";

type ResumeProfilesListProps = {
  profiles: ResumeProfileListItem[];
  canDelete: boolean;
};

function personSubtitle(profile: ResumeProfileListItem): string {
  const name = joinProfileName(profile.firstName, profile.lastName);
  return name || "No contact name";
}

export function ResumeProfilesList({
  profiles,
  canDelete,
}: ResumeProfilesListProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSetDefault(profileId: string) {
    setPendingId(profileId);
    setError(null);
    const result = await setDefaultResumeProfile(profileId);
    setPendingId(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDelete(profileId: string) {
    setPendingId(profileId);
    setError(null);
    const result = await deleteResumeProfile(profileId);
    setPendingId(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {profiles.map((profile) => {
        const isPending = pendingId === profile.id;
        const primaryLabel = profile.targetTitle?.trim() || "Untitled role";
        const subtitle = personSubtitle(profile);

        return (
          <div
            key={profile.id}
            className="rounded-2xl border border-border bg-surface/60 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{primaryLabel}</p>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>
              {profile.isDefault ? (
                <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-medium text-mint">
                  Default
                </span>
              ) : null}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Last updated {new Date(profile.updatedAt).toLocaleDateString()}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="hero" size="sm" className="rounded-xl" asChild>
                <Link href={`/dashboard/resume-profiles/${profile.id}/edit`}>
                  Edit
                </Link>
              </Button>

              {!profile.isDefault ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={isPending}
                  onClick={() => void handleSetDefault(profile.id)}
                >
                  Set as default
                </Button>
              ) : null}

              {canDelete && !profile.isDefault ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-muted-foreground hover:text-destructive"
                  disabled={isPending}
                  onClick={() => void handleDelete(profile.id)}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
