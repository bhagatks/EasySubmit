"use client";

import Link from "next/link";
import { Download, ExternalLink, Puzzle } from "lucide-react";
import { ExtensionCardMock } from "@/components/marketing/ExtensionCardMock";
import { GlossyModal } from "@/components/ui/glossy-modal";
import { Button } from "@/components/ui/button";
import { EXTENSION_STORE_URL } from "@/lib/brand";

type ExtensionInstallPromptModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ExtensionInstallPromptModal({
  open,
  onOpenChange,
}: ExtensionInstallPromptModalProps) {
  return (
    <GlossyModal
      open={open}
      onOpenChange={onOpenChange}
      title="Install extension"
      description="Save jobs from LinkedIn, Indeed, Workday, and 2,000+ portals — then tailor and apply from your browser."
      className="max-w-lg"
      zIndex={155}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
            Skip for now
          </Button>
          <Button variant="mint" className="flex-1 rounded-xl" asChild>
            <a href={EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" aria-hidden="true" />
              Install extension
              <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
            </a>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-border/80 bg-surface/40 p-3">
          <ExtensionCardMock />
        </div>

        <div className="rounded-xl border border-border/80 bg-surface/40 p-4">
          <div className="flex items-center gap-2 text-foreground">
            <Puzzle className="h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
            <p className="text-sm font-medium">After installing</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Open a job posting and click the EasySubmit icon in your toolbar, or{" "}
            <Link href="/extension/bridge" className="font-medium text-primary underline-offset-2 hover:underline">
              connect the extension
            </Link>{" "}
            to this account.
          </p>
        </div>
      </div>
    </GlossyModal>
  );
}
