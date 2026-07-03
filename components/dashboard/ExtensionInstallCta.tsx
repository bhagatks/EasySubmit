"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PurposeButton } from "@/components/ui/purpose-button";
import { EXTENSION_STORE_URL } from "@/lib/brand";
import { shouldShowExtensionInstallCta } from "@/lib/extension/extension-install-cta";
import { useDashboardExtensionConnected } from "@/lib/hooks/useDashboardExtensionConnected";
import { cn } from "@/lib/utils";

type ExtensionInstallCtaProps = {
  variant: "tracker-button" | "overview-link" | "inline-link";
  className?: string;
  linkClassName?: string;
};

export function ExtensionInstallCta({
  variant,
  className,
  linkClassName,
}: ExtensionInstallCtaProps) {
  const extensionConnected = useDashboardExtensionConnected();
  if (!shouldShowExtensionInstallCta(extensionConnected)) return null;

  if (variant === "tracker-button") {
    return (
      <Button variant="mintOutline" asChild className={className}>
        <a
          href={EXTENSION_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1"
        >
          Add extension <ArrowUpRight className="h-4 w-4" />
        </a>
      </Button>
    );
  }

  if (variant === "overview-link") {
    return (
      <PurposeButton purpose="secondary" size="sm" className={cn("rounded-xl", className)} asChild>
        <Link href="/dashboard/extension">Get the extension</Link>
      </PurposeButton>
    );
  }

  return (
    <a
      href={EXTENSION_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("font-semibold underline", linkClassName)}
    >
      Get extension
    </a>
  );
}
