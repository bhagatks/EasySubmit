"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  DashboardWorkspacePage,
  DashboardWorkspaceStack,
} from "@/components/dashboard/DashboardWorkspacePage";
import { Button } from "@/components/ui/button";
import type { DashboardTutorialVideo } from "@/lib/dashboard/dashboard-tutorial-videos";

type DashboardVideoTutorialsPanelProps = {
  videos: DashboardTutorialVideo[];
};

export function DashboardVideoTutorialsPanel({ videos }: DashboardVideoTutorialsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const welcomeAppliedRef = useRef(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (searchParams.get("welcome") !== "1") return;
    setShowWelcome(true);
    if (welcomeAppliedRef.current) return;
    welcomeAppliedRef.current = true;
    router.replace("/dashboard/tutorials", { scroll: false });
  }, [router, searchParams]);

  return (
    <DashboardWorkspacePage
      title="Video Tutorials"
      description="Learn EasySubmit in a few minutes — watch these walkthroughs at your own pace."
      aside={
        showWelcome ? (
          <Button variant="mint" size="sm" className="rounded-xl" asChild>
            <Link href="/dashboard">Continue to dashboard</Link>
          </Button>
        ) : null
      }
    >
      <DashboardWorkspaceStack className="space-y-4">
        {showWelcome ? (
          <div className="rounded-xl border border-mint/30 bg-mint/5 px-4 py-3 text-sm text-foreground">
            You&apos;re almost set. Watch a quick tutorial, then continue to your dashboard.
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {videos.map((video) => (
            <article
              key={video.id}
              className="overflow-hidden rounded-2xl border border-border bg-surface/60"
            >
              <div className="relative aspect-video w-full bg-black/40">
                <iframe
                  title={video.title}
                  src={video.embedSrc}
                  className="absolute inset-0 h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
              <div className="space-y-2 p-4">
                <h2 className="font-display text-sm font-semibold text-foreground">{video.title}</h2>
                <Button variant="outline" size="sm" className="rounded-xl" asChild>
                  <a href={video.watchUrl} target="_blank" rel="noopener noreferrer">
                    Open on YouTube
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                  </a>
                </Button>
              </div>
            </article>
          ))}
        </div>

        {showWelcome ? (
          <div className="flex justify-end pt-2">
            <Button variant="mint" className="rounded-xl" asChild>
              <Link href="/dashboard">Continue to dashboard</Link>
            </Button>
          </div>
        ) : null}
      </DashboardWorkspaceStack>
    </DashboardWorkspacePage>
  );
}
