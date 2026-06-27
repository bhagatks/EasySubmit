"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { useState } from "react";
import {
  deleteResumeProfile,
  setDefaultResumeProfile,
  type ResumeProfileListItem,
} from "@/app/actions/resume-profiles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {profiles.map((profile) => {
        const isPending = pendingId === profile.id;
        const primaryLabel = profile.targetTitle?.trim() || "Untitled role";
        const subtitle = personSubtitle(profile);
        const updatedLabel = new Date(profile.updatedAt).toLocaleDateString();

        return (
          <section
            key={profile.id}
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            <div className="flex items-center gap-2 px-3 py-3">
              <div className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                  {primaryLabel}
                  {profile.isDefault ? (
                    <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-medium text-mint">
                      Default
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {subtitle} · Updated {updatedLabel}
                </span>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
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

                <Link
                  href={`/dashboard/resume-profiles/${profile.id}/edit`}
                  aria-label={`Edit ${primaryLabel}`}
                  title="Edit profile"
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition-colors hover:border-mint/40",
                  )}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
