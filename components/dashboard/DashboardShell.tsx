"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Briefcase,
  FileText,
  Info,
  LayoutDashboard,
  LifeBuoy,
  PlayCircle,
  Puzzle,
  ScanLine,
  Settings,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { isPipelineDebugEnabled } from "@/src/shared/extension/pipeline-debug-gate";
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
  isPipelineDebugScreen,
  shouldShowDashboardByokKeyButton,
  shouldShowDashboardExtensionBadge,
  shouldShowDashboardOpenJobTracker,
  shouldShowDashboardProfileMenu,
  shouldShowDashboardSignOut,
} from "@/lib/dashboard/dashboard-header-controls";
import { parseJobReviewStudioJobId } from "@/lib/job-tracker/review-screen-ui";
import {
  DASHBOARD_TOPBAR_BORDER_CLASS,
  dashboardHeaderPrimaryPillClassName,
  dashboardHeaderPrimaryPillStyle,
  dashboardTopBarClassName,
} from "@/lib/dashboard/dashboard-header-chrome";
import { OverviewExtensionBadge } from "@/components/dashboard/overview/OverviewExtensionBadge";
import { getExtensionConnectionStatus } from "@/lib/extension/extension-dashboard-connection";
import { cn } from "@/lib/utils";

const workspaceNavItems = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Resume profiles", href: "/dashboard/resume-profiles", icon: FileText },
  { title: "Job Tracker", href: "/dashboard/job-tracker", icon: Briefcase },
  { title: "ATS Scores", href: "/dashboard/ats-scores", icon: ScanLine },
  { title: "ATS Guidelines", href: "/dashboard/ats-guidelines", icon: ShieldCheck },
  { title: "Video Tutorials", href: "/dashboard/tutorials", icon: PlayCircle },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
  { title: "About", href: "/dashboard/about", icon: Info },
  { title: "Help", href: "/dashboard/help", icon: LifeBuoy },
] as const;

const extensionNavItem = {
  title: "Extension",
  href: "/dashboard/extension",
  icon: Puzzle,
} as const;

const pipelineNavItem = {
  title: "Pipeline",
  href: "/dashboard/pipeline",
  icon: Workflow,
} as const;

type WorkspaceNavItem =
  | (typeof workspaceNavItems)[number]
  | typeof pipelineNavItem
  | typeof extensionNavItem;

function buildWorkspaceNavItems(
  extensionConnected: boolean | null,
): readonly WorkspaceNavItem[] {
  let items: WorkspaceNavItem[] = [...workspaceNavItems];
  if (isPipelineDebugEnabled()) {
    items = [...items.slice(0, 3), pipelineNavItem, ...items.slice(3)];
  }
  if (extensionConnected === true) {
    return items;
  }
  const extensionInsertAt = items.findIndex((item) => item.href === "/dashboard/ats-scores") + 1;
  return [
    ...items.slice(0, extensionInsertAt),
    extensionNavItem,
    ...items.slice(extensionInsertAt),
  ];
}

type DashboardShellProps = {
  children: React.ReactNode;
  vaultKeyId?: string | null;
  minVersion?: string;
};

function DashboardSidebar({ vaultKeyId }: { vaultKeyId?: string | null }) {
  const pathname = usePathname();
  const engineCold = !vaultKeyId;
  const [extensionConnected, setExtensionConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getExtensionConnectionStatus().then((status) => {
      if (!cancelled) {
        setExtensionConnected(status.state === "connected");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const navItems = useMemo(
    () => buildWorkspaceNavItems(extensionConnected),
    [extensionConnected],
  );

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
                    <Link
                      href={item.href}
                      className="flex w-full items-center gap-2"
                    >
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
  const isPipelineScreen = isPipelineDebugScreen(pathname);
  const lockViewport = isStudioEdit || isPipelineScreen;
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
        lockViewport ? "h-svh max-h-svh overflow-hidden" : "min-h-screen",
      )}
    >
      <DashboardSidebar vaultKeyId={vaultKeyId} />
      <div className={cn("flex min-h-0 flex-1 flex-col", lockViewport && "overflow-hidden")}>
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
                    className={dashboardHeaderPrimaryPillClassName("hover:brightness-110")}
                    style={dashboardHeaderPrimaryPillStyle}
                  >
                    <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    Open Job Tracker
                  </Link>
                ) : null}
                {showExtensionBadge ? <OverviewExtensionBadge /> : null}
                <DashboardHeaderExpandSlot />
                <DashboardHeaderActionsSlot />
                <BYOKStatusBadge vaultKeyId={vaultKeyId} />
                {showByokKeyButton ? <BYOKKeyButton /> : null}
                {showProfileMenu ? <NavbarProfileMenu /> : null}
                {showSignOut ? <SignOutButton variant="pill" /> : null}
              </div>
            </div>
            <AiHealthHeaderNotice />
          </header>
        </AiHealthAlertProvider>
        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            lockViewport ? "overflow-hidden p-4 md:p-5" : "p-6",
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
