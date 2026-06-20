"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  FileText,
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
import { BYOKInactiveNavBadge, BYOKStatusBadge } from "@/components/dashboard/BYOKStatus";
import { DashboardStudioSidebarEffect } from "@/components/dashboard/DashboardStudioSidebarEffect";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Resume profiles", href: "/dashboard/resume-profiles", icon: FileText },
  { title: "Applications", href: "/dashboard/applications", icon: Briefcase },
  { title: "AI Keys", href: "/dashboard/keys", icon: Key },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
] as const;

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
            easysubmit<span className="text-mint">.ai</span>
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

export function DashboardShell({ children, vaultKeyId }: DashboardShellProps) {
  const pathname = usePathname();
  const isStudioEdit =
    pathname.startsWith("/dashboard/resume-profiles/") &&
    pathname.endsWith("/edit");

  return (
    <SidebarProvider>
      <DashboardStudioSidebarEffect />
      <div
        className={cn(
          "flex w-full bg-background text-foreground",
          isStudioEdit ? "h-svh max-h-svh overflow-hidden" : "min-h-screen",
        )}
      >
        <DashboardSidebar vaultKeyId={vaultKeyId} />
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            isStudioEdit && "overflow-hidden",
          )}
        >
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4">
            <SidebarTrigger />
            <div className="text-sm text-muted-foreground">
              {isStudioEdit ? "Resume Studio" : "Dashboard"}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <BYOKStatusBadge vaultKeyId={vaultKeyId} />
              <SignOutButton variant="pill" />
            </div>
          </header>
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
    </SidebarProvider>
  );
}
