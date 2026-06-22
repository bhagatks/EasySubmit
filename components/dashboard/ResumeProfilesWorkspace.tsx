"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import type { ResumeProfileListItem } from "@/app/actions/resume-profiles";
import { ResumeProfilesList } from "@/components/dashboard/ResumeProfilesList";
import {
  useDashboardExpandAllControl,
  useRegisterDashboardHeaderActions,
} from "@/components/dashboard/DashboardWorkspaceHeader";
import { StudioIconButton } from "@/components/resume/StudioIconButton";
import { Button } from "@/components/ui/button";

type ResumeProfilesWorkspaceProps = {
  profiles: ResumeProfileListItem[];
  canDelete: boolean;
};

export function ResumeProfilesWorkspace({
  profiles,
  canDelete,
}: ResumeProfilesWorkspaceProps) {
  const router = useRouter();
  const sectionIds = useMemo(() => profiles.map((profile) => profile.id), [profiles]);
  const { expanded, toggleSection } = useDashboardExpandAllControl(sectionIds, {
    disabled: profiles.length === 0,
  });

  const addProfileAction = useMemo(
    () => (
      <StudioIconButton
        type="button"
        tone="bordered"
        aria-label="Add resume profile"
        title="Add profile"
        onClick={() => router.push("/dashboard/resume-profiles/new")}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </StudioIconButton>
    ),
    [router],
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
    <ResumeProfilesList
      profiles={profiles}
      canDelete={canDelete}
      expanded={expanded}
      onToggleSection={toggleSection}
    />
  );
}
