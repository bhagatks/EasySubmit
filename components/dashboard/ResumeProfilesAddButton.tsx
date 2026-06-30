"use client";

import { useRouter } from "next/navigation";
import { DashboardHeaderHeroButton } from "@/components/dashboard/DashboardWorkspaceHeader";

type ResumeProfilesAddButtonProps = {
  canCreate: boolean;
  maxProfiles: number;
};

export function ResumeProfilesAddButton({ canCreate, maxProfiles }: ResumeProfilesAddButtonProps) {
  const router = useRouter();

  return (
    <DashboardHeaderHeroButton
      type="button"
      aria-label="Add new resume profile"
      title={canCreate ? "Add new resume profile" : `Profile limit reached (${maxProfiles})`}
      disabled={!canCreate}
      onClick={() => {
        if (canCreate) {
          router.push("/dashboard/resume-profiles/new");
        }
      }}
    >
      Add new
    </DashboardHeaderHeroButton>
  );
}
