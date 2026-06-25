"use client";

import Link from "next/link";
import { Suspense, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Briefcase,
  FileText,
  FlaskConical,
  Key,
  LayoutDashboard,
  Puzzle,
  Settings,
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
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/ui/logo";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import {
  BYOKInactiveNavBadge,
  BYOKKeyButton,
  BYOKStatusBadge,
} from "@/components/dashboard/BYOKStatus";
import {
  AiHealthAlertBanner,
  AiHealthAlertIcon,
  AiHealthAlertProvider,
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
  isDashboardDetailScreen,
  isJobReviewStudioScreen,
  shouldShowDashboardByokKeyButton,
  shouldShowDashboardSignOut,
} from "@/lib/dashboard/dashboard-header-controls";
import { parseJobReviewStudioJobId } from "@/lib/job-tracker/review-screen-ui";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Resume profiles", href: "/dashboard/resume-profiles", icon: FileText },
  { title: "Job Tracker", href: "/dashboard/job-tracker", icon: Briefcase },
  { title: "AI Keys", href: "/dashboard/keys", icon: Key },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
] as const;

const devNavItems =
  process.env.NODE_ENV === "development"
    ? [{ title: "Testing Resume", href: "/dashboard/testing-resume", icon: FlaskConical }]
    : [];

type DashboardShellProps = {
  children: React.ReactNode;
  vaultKeyId?: string | null;
};

function DashboardSidebar({ vaultKeyId }: { vaultKeyId?: string | null }) {
  const pathname = usePathname();
  const engineCold = !vaultKeyId;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/"
          className="flex w-full items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0"
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
                      {item.href === "/dashboard/keys" && engineCold ? (
                        <BYOKInactiveNavBadge className="group-data-[collapsible=icon]:hidden" />
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {devNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Dev</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {devNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={pathname.startsWith(item.href)}
                    >
                      <Link href={item.href} className="flex w-full items-center gap-2">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <div className="rounded-lg border border-border bg-surface p-3 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 text-foreground">
            <Puzzle className="h-3.5 w-3.5 text-mint" />
            <span className="font-medium">Install extension</span>
          </div>
          <p className="mt-1.5">Autofill any application in one click.</p>
          <Button variant="mint" size="sm" className="mt-2 w-full" asChild>
            <Link href="/extension">Get it</Link>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

type DashboardShellFrameProps = DashboardShellProps & {
  fromParam: string | null;
};

function DashboardShellFrame({ children, vaultKeyId, fromParam }: DashboardShellFrameProps) {
  const pathname = usePathname();
  const isReviewStudio = isJobReviewStudioScreen(pathname, fromParam);
  const reviewStudioJobId = isReviewStudio ? parseJobReviewStudioJobId(pathname) : null;
  const isStudioEdit = isDashboardDetailScreen(pathname, fromParam);
  const showSignOut = shouldShowDashboardSignOut(pathname);
  const showByokKeyButton = shouldShowDashboardByokKeyButton(pathname, vaultKeyId);

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
          <header className="relative shrink-0 border-b border-border/60">
            <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center px-4">
              <div className="flex items-center gap-3 justify-self-start">
                <SidebarTrigger />
                <div className="text-sm text-muted-foreground">
                  {isStudioEdit ? "Resume Studio" : "Dashboard"}
                </div>
              </div>
              {isStudioEdit ? (
                <div className="flex justify-center justify-self-center">
                  <StudioHeaderCenterSlot />
                </div>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2 justify-self-end">
                <DashboardHeaderActionsSlot />
                <DashboardHeaderExpandSlot />
                <BYOKStatusBadge vaultKeyId={vaultKeyId} />
                {showByokKeyButton ? <BYOKKeyButton /> : null}
                {showSignOut ? <SignOutButton variant="pill" /> : null}
                <AiHealthAlertIcon />
              </div>
            </div>
            <AiHealthAlertBanner />
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
