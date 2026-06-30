"use client";

import Link from "next/link";
import { Briefcase } from "lucide-react";
import { useRegisterDashboardHeaderActions } from "@/components/dashboard/DashboardWorkspaceHeader";
import { OverviewExtensionBadge } from "@/components/dashboard/overview/OverviewExtensionBadge";
import {
  dashboardHeaderPrimaryPillClassName,
  dashboardHeaderPrimaryPillStyle,
} from "@/lib/dashboard/dashboard-header-chrome";

export function OverviewHeaderActions() {
  useRegisterDashboardHeaderActions(
    <>
      <Link
        href="/dashboard/job-tracker"
        className={dashboardHeaderPrimaryPillClassName("hover:brightness-110")}
        style={dashboardHeaderPrimaryPillStyle}
      >
        <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Open Job Tracker
      </Link>
      <OverviewExtensionBadge />
    </>,
  );

  return null;
}
