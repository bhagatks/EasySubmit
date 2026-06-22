"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteResumeProfile,
  setDefaultResumeProfile,
  type ResumeProfileListItem,
} from "@/app/actions/resume-profiles";
import { StudioCollapsibleSection } from "@/components/resume/StudioCollapsibleSection";
import { Button } from "@/components/ui/button";
import { joinProfileName } from "@/lib/profile/name";

type ResumeProfilesListProps = {
  profiles: ResumeProfileListItem[];
  canDelete: boolean;
  expanded: Record<string, boolean>;
  onToggleSection: (sectionId: string) => void;
};

function personSubtitle(profile: ResumeProfileListItem): string {
  const name = joinProfileName(profile.firstName, profile.lastName);
  return name || "No contact name";
}

export function ResumeProfilesList({
  profiles,
  canDelete,
  expanded,
  onToggleSection,
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
          <StudioCollapsibleSection
            key={profile.id}
            title={
              <span className="flex flex-wrap items-center gap-2">
                {primaryLabel}
                {profile.isDefault ? (
                  <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-medium text-mint">
                    Default
                  </span>
                ) : null}
              </span>
            }
            description={`${subtitle} · Updated ${updatedLabel}`}
            expanded={Boolean(expanded[profile.id])}
            onToggle={() => onToggleSection(profile.id)}
            variant="dashboard"
            showDragHandle={false}
          >
            <div className="flex flex-wrap gap-2">
              <Button variant="hero" size="sm" className="rounded-xl" asChild>
                <Link href={`/dashboard/resume-profiles/${profile.id}/edit`}>Edit</Link>
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
          </StudioCollapsibleSection>
        );
      })}
    </div>
  );
}
