"use client";

import Link from "next/link";
import { Suspense, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Briefcase,
  FileText,
  Info,
  LayoutDashboard,
  PlayCircle,
  Puzzle,
  ScanLine,
  Settings,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { NavbarProfileMenu } from "@/components/nav/NavbarProfileMenu";
import { LogoIcon } from "@/components/ui/logo";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import {
  BYOKInactiveNavBadge,
  BYOKKeyButton,
  BYOKStatusBadge,
} from "@/components/dashboard/BYOKStatus";
import {
  AiHealthAlertProvider,
  AiHealthHeaderNotice,
} from "@/components/dashboard/AiHealthAlert";
import { DashboardStudioSidebarEffect } from "@/components/dashboard/DashboardStudioSidebarEffect";
import { ReviewStudioPageHeader } from "@/components/dashboard/review/ReviewStudioPageHeader";
import { StudioHeaderCenterProvider, StudioHeaderCenterSlot } from "@/components/resume/StudioHeaderCenter";
import {
  DashboardHeaderActionsSlot,
  DashboardHeaderExpandSlot,
  DashboardWorkspaceHeaderProvider,
} from "@/components/dashboard/DashboardWorkspaceHeader";
import {
  getDashboardHeaderLabel,
  isDashboardDetailScreen,
  isJobReviewStudioScreen,
  shouldShowDashboardByokKeyButton,
  shouldShowDashboardExtensionBadge,
  shouldShowDashboardOpenJobTracker,
  shouldShowDashboardProfileMenu,
  shouldShowDashboardSignOut,
} from "@/lib/dashboard/dashboard-header-controls";
import { parseJobReviewStudioJobId } from "@/lib/job-tracker/review-screen-ui";
import { DASHBOARD_TOPBAR_BORDER_CLASS, dashboardTopBarClassName } from "@/lib/dashboard/dashboard-header-chrome";
import { OverviewExtensionBadge } from "@/components/dashboard/overview/OverviewExtensionBadge";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Resume profiles", href: "/dashboard/resume-profiles", icon: FileText },
  { title: "Job Tracker", href: "/dashboard/job-tracker", icon: Briefcase },
  { title: "ATS Scores", href: "/dashboard/ats-scores", icon: ScanLine },
  { title: "ATS Guidelines", href: "/dashboard/ats-guidelines", icon: ShieldCheck },
  { title: "Extension", href: "/dashboard/extension", icon: Puzzle },
  { title: "Video Tutorials", href: "/dashboard/tutorials", icon: PlayCircle },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
  { title: "About", href: "/dashboard/about", icon: Info },
] as const;

type DashboardShellProps = {
  children: React.ReactNode;
  vaultKeyId?: string | null;
  minVersion?: string;
};

function DashboardSidebar({ vaultKeyId }: { vaultKeyId?: string | null }) {
  const pathname = usePathname();
  const engineCold = !vaultKeyId;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader
        className={cn(
          dashboardTopBarClassName(),
          "flex-row items-center gap-0 p-0 px-2 group-data-[collapsible=icon]:justify-center",
        )}
      >
        <Link
          href="/"
          className="flex h-full w-full items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0"
        >
          <LogoIcon className="h-8 w-8 shrink-0" aria-hidden="true" />
          <span className="font-display text-base font-semibold group-data-[collapsible=icon]:hidden">
            <BrandWordmark
              nameClassName="text-foreground"
              suffixClassName="text-mint"
            />
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={
                      item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname.startsWith(item.href)
                    }
                  >
                    <Link href={item.href} className="flex w-full items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.title}</span>
                      {item.href === "/dashboard/settings" && engineCold ? (
                        <BYOKInactiveNavBadge className="group-data-[collapsible=icon]:hidden" />
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}

type DashboardShellFrameProps = DashboardShellProps & {
  fromParam: string | null;
};

function DashboardShellFrame({ children, vaultKeyId, minVersion, fromParam }: DashboardShellFrameProps) {
  const pathname = usePathname();
  const isReviewStudio = isJobReviewStudioScreen(pathname, fromParam);
  const reviewStudioJobId = isReviewStudio ? parseJobReviewStudioJobId(pathname) : null;
  const isStudioEdit = isDashboardDetailScreen(pathname, fromParam);
  const showProfileMenu = shouldShowDashboardProfileMenu(pathname, fromParam);
  const showSignOut = shouldShowDashboardSignOut(pathname);
  const showByokKeyButton = shouldShowDashboardByokKeyButton(pathname, vaultKeyId);
  const showExtensionBadge = shouldShowDashboardExtensionBadge(pathname);
  const showOpenJobTracker = shouldShowDashboardOpenJobTracker(pathname);

  if (isReviewStudio && reviewStudioJobId) {
    return (
      <div className="flex h-svh max-h-svh w-full flex-col overflow-hidden bg-[oklch(0.16_0.04_268)] text-foreground">
        <ReviewStudioPageHeader jobId={reviewStudioJobId} />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-0.5 pb-0.5">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full bg-background text-foreground",
        isStudioEdit ? "h-svh max-h-svh overflow-hidden" : "min-h-screen",
      )}
    >
      <DashboardSidebar vaultKeyId={vaultKeyId} />
      <div className={cn("flex min-h-0 flex-1 flex-col", isStudioEdit && "overflow-hidden")}>
        <AiHealthAlertProvider>
          <header className={cn("relative z-30 shrink-0", DASHBOARD_TOPBAR_BORDER_CLASS)}>
            <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center px-4">
              <div className="flex h-full items-center gap-3 justify-self-start">
                <SidebarTrigger />
                <div className="text-sm leading-none text-muted-foreground">
                  {getDashboardHeaderLabel(pathname, isStudioEdit)}
                </div>
              </div>
              {isStudioEdit ? (
                <div className="flex h-full items-center justify-center justify-self-center">
                  <StudioHeaderCenterSlot />
                </div>
              ) : (
                <div />
              )}
              <div className="flex h-full items-center justify-end gap-2 justify-self-end">
                {showOpenJobTracker ? (
                  <Link
                    href="/dashboard/job-tracker"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-medium text-primary transition hover:brightness-110"
                  >
                    Open Job Tracker
                  </Link>
                ) : null}
                {showExtensionBadge ? <OverviewExtensionBadge /> : null}
                <DashboardHeaderExpandSlot />
                <DashboardHeaderActionsSlot />
                <div className="relative">
                  <BYOKStatusBadge vaultKeyId={vaultKeyId} />
                  {showByokKeyButton ? <BYOKKeyButton /> : null}
                  <AiHealthHeaderNotice />
                </div>
                {showProfileMenu ? <NavbarProfileMenu /> : null}
                {showSignOut ? <SignOutButton variant="pill" /> : null}
              </div>
            </div>
          </header>
        </AiHealthAlertProvider>
        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            isStudioEdit ? "overflow-hidden p-4 md:p-5" : "p-6",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function DashboardShellInner(props: DashboardShellProps) {
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");

  return (
    <>
      <DashboardStudioSidebarEffect />
      <DashboardShellFrame {...props} fromParam={fromParam} />
    </>
  );
}

function DashboardShellFallback(props: DashboardShellProps) {
  const fromReviewRef = useRef<string | null>(null);
  if (typeof window !== "undefined") {
    fromReviewRef.current = new URLSearchParams(window.location.search).get("from");
  }

  return (
    <>
      <DashboardStudioSidebarEffect />
      <DashboardShellFrame {...props} fromParam={fromReviewRef.current} />
    </>
  );
}

export function DashboardShell(props: DashboardShellProps) {
  return (
    <SidebarProvider>
      <StudioHeaderCenterProvider>
        <DashboardWorkspaceHeaderProvider>
          <Suspense fallback={<DashboardShellFallback {...props} />}>
            <DashboardShellInner {...props} />
          </Suspense>
        </DashboardWorkspaceHeaderProvider>
      </StudioHeaderCenterProvider>
    </SidebarProvider>
  );
}
