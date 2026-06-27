"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { ResumeProfileListItem } from "@/app/actions/resume-profiles";
import { ResumeProfilesList } from "@/components/dashboard/ResumeProfilesList";
import { useRegisterDashboardHeaderActions, DashboardHeaderHeroButton } from "@/components/dashboard/DashboardWorkspaceHeader";
import { Button } from "@/components/ui/button";

type ResumeProfilesWorkspaceProps = {
  profiles: ResumeProfileListItem[];
  canDelete: boolean;
  profileCount: number;
  maxProfiles: number;
  canCreate: boolean;
};

export function ResumeProfilesWorkspace({
  profiles,
  canDelete,
  profileCount,
  maxProfiles,
  canCreate,
}: ResumeProfilesWorkspaceProps) {
  const router = useRouter();

  const addProfileAction = useMemo(
    () => (
      <DashboardHeaderHeroButton
        type="button"
        aria-label="Add new resume profile"
        title={
          canCreate
            ? "Add new resume profile"
            : `Profile limit reached (${maxProfiles})`
        }
        disabled={!canCreate}
        onClick={() => {
          if (canCreate) {
            router.push("/dashboard/resume-profiles/new");
          }
        }}
      >
        Add new
      </DashboardHeaderHeroButton>
    ),
    [canCreate, maxProfiles, router],
  );

  useRegisterDashboardHeaderActions(addProfileAction);

  if (profiles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No resume profile yet. Complete onboarding to create your default profile.
        </p>
        <Button variant="hero" className="mt-4 rounded-xl" asChild>
          <Link href="/onboarding">Continue onboarding</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {profileCount} of {maxProfiles} profiles
        {!canCreate ? " — delete a profile to add another." : ""}
      </p>
      <ResumeProfilesList profiles={profiles} canDelete={canDelete} />
    </div>
  );
}
