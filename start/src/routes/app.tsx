import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  FileText,
  Briefcase,
  LayoutDashboard,
  Key,
  Settings,
  Puzzle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/ui/logo";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Dashboard · EasySubmit.ai" },
      { name: "description", content: "Your resume library and job application tracker." },
    ],
  }),
  component: AppShell,
});

const items = [
  { title: "Overview", url: "/app", icon: LayoutDashboard },
  { title: "Resumes", url: "/app/resumes", icon: FileText },
  { title: "Applications", url: "/app/applications", icon: Briefcase },
  { title: "AI Keys", url: "/app/keys", icon: Key },
  { title: "Settings", url: "/app/settings", icon: Settings },
];

function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-2">
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
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="rounded-lg border border-border bg-surface p-3 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 text-foreground">
            <Puzzle className="h-3.5 w-3.5 text-mint" />
            <span className="font-medium">Install extension</span>
          </div>
          <p className="mt-1.5">Autofill any application in one click.</p>
          <Link to="/extension">
            <Button variant="mint" size="sm" className="mt-2 w-full">Get it</Button>
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function AppShell() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-3 border-b border-border/60 px-4">
            <SidebarTrigger />
            <div className="text-sm text-muted-foreground">Dashboard</div>
            <div className="ml-auto flex items-center gap-2">
              <span className="rounded-full border border-mint/40 bg-mint/10 px-2 py-0.5 text-xs text-mint">
                BYOK active
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                AR
              </div>
            </div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
