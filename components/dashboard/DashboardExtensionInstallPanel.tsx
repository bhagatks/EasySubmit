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
import { EXTENSION_STORE_URL } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function DashboardExtensionInstallPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const welcomeAppliedRef = useRef(false);
  const [extensionConnected, setExtensionConnected] = useState(false);

  const isWelcome = searchParams.get("welcome") === "1";

  useEffect(() => {
    void (async () => {
      setExtensionConnected(await isExtensionConnectedForDashboard());
    })();
  }, []);

  useEffect(() => {
    if (!isWelcome || welcomeAppliedRef.current) return;
    welcomeAppliedRef.current = true;
    router.replace("/dashboard/extension", { scroll: false });
  }, [isWelcome, router]);

  const handleContinue = () => {
    router.push("/dashboard");
  };

  return (
    <DashboardWorkspacePage
      title="Install extension"
      description="Save jobs from LinkedIn, Indeed, Workday, and 2,000+ portals — then tailor and apply from your browser."
      aside={
        <Button variant="outline" size="sm" className="rounded-xl" onClick={handleContinue}>
          Continue to dashboard
        </Button>
      }
    >
      <DashboardWorkspaceStack className="space-y-4">
        {isWelcome ? (
          <div className="rounded-xl border border-mint/30 bg-mint/5 px-4 py-3 text-sm text-foreground">
            Your resume profile is ready. Install the Chrome extension to capture jobs and autofill
            applications in one click.
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-border bg-surface/60 p-4 sm:p-6">
          <ExtensionCardMock />
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
                <Button variant="hero" size="sm" className="rounded-xl" asChild>
                  <a href={EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Add to Chrome
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                  </a>
                </Button>
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
                {extensionConnected ? (
                  <p
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium",
                      "text-mint",
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Extension connected on this browser
                  </p>
                ) : null}
              </div>
            </li>
          </ol>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button variant="mint" className="flex-1 rounded-xl" onClick={handleContinue}>
              Continue to dashboard
            </Button>
            <Button variant="outline" className="flex-1 rounded-xl" asChild>
              <Link href="/extension/bridge">Connect extension</Link>
            </Button>
          </div>
        </div>
      </DashboardWorkspaceStack>
    </DashboardWorkspacePage>
  );
}
