"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, ExternalLink, Puzzle } from "lucide-react";
import { ExtensionCardMock } from "@/components/marketing/ExtensionCardMock";
import {
  DashboardWorkspacePage,
  DashboardWorkspaceStack,
} from "@/components/dashboard/DashboardWorkspacePage";
import { Button } from "@/components/ui/button";
import { isExtensionConnectedForDashboard } from "@/lib/extension/extension-dashboard-connection";
import { shouldShowExtensionInstallCta } from "@/lib/extension/extension-install-cta";
import { EXTENSION_STORE_URL } from "@/lib/brand";
import { extensionBridgeHref } from "@/lib/dashboard/dashboard-extension-links";
import { readExtensionIdForDashboard } from "@/lib/extension/start-job-apply-from-dashboard";
import { cn } from "@/lib/utils";

type DashboardExtensionInstallPanelProps = {
  storeUrl?: string;
};

export function DashboardExtensionInstallPanel({
  storeUrl = EXTENSION_STORE_URL,
}: DashboardExtensionInstallPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const welcomeAppliedRef = useRef(false);
  const [extensionConnected, setExtensionConnected] = useState<boolean | null>(null);

  const isWelcome = searchParams.get("welcome") === "1";

  useEffect(() => {
    void isExtensionConnectedForDashboard().then(setExtensionConnected);
  }, []);

  useEffect(() => {
    if (!isWelcome || welcomeAppliedRef.current) return;
    welcomeAppliedRef.current = true;
    router.replace("/dashboard/extension", { scroll: false });
  }, [isWelcome, router]);

  return (
    <DashboardWorkspacePage
      title="Install extension"
      description="Save jobs from LinkedIn, Indeed, Workday, and 2,000+ portals — then tailor and apply from your browser."
      aside={null}
    >
      <DashboardWorkspaceStack className="space-y-4">
        {isWelcome ? (
          <div className="rounded-xl border border-mint/30 bg-mint/5 px-4 py-3 text-sm text-foreground">
            Your resume profile is ready. Install the Chrome extension to capture jobs and autofill
            applications in one click.
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface/60 p-6">
            <div className="w-full max-w-sm">
              <ExtensionCardMock size="default" />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface/60 p-5">
            <div className="flex items-center gap-2 text-foreground">
              <Puzzle className="h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
                Setup steps
              </h2>
            </div>

            <ol className="mt-4 space-y-4">
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  1
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-sm font-medium text-foreground">Add EasySubmit to Chrome</p>
                  <p className="text-sm text-muted-foreground">
                    Works on Chrome, Edge, Brave, and Arc. Your account stays signed in after install.
                  </p>
                  {shouldShowExtensionInstallCta(extensionConnected) ? (
                    <Button variant="hero" size="sm" className="rounded-xl" asChild>
                      <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Add to Chrome
                        <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </li>

              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  2
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium text-foreground">Open a job posting</p>
                  <p className="text-sm text-muted-foreground">
                    Click the EasySubmit icon in your toolbar, save the role, and sync it back to Job
                    Tracker.
                  </p>
                  {extensionConnected === true ? (
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-mint">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Extension connected on this browser
                    </p>
                  ) : null}
                </div>
              </li>
            </ol>

            <div className="mt-6 space-y-2">
              <p className="text-xs text-muted-foreground">
                Signed in on this browser? The extension syncs automatically when the dashboard account changes.
              </p>
              <Button variant="outline" className="w-full rounded-xl" asChild>
                <Link href={extensionBridgeHref(readExtensionIdForDashboard())}>Connect extension</Link>
              </Button>
            </div>
          </div>
        </div>
      </DashboardWorkspaceStack>
    </DashboardWorkspacePage>
  );
}
