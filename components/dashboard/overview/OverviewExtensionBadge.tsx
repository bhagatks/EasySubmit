"use client";

import { useEffect, useState } from "react";
import { getExtensionConnectionStatus, type ExtensionConnectionStatus } from "@/lib/extension/extension-dashboard-connection";
import { cn } from "@/lib/utils";
import {
  dashboardHeaderMintPillClassName,
  dashboardHeaderMintPillStyle,
  dashboardHeaderNeutralPillClassName,
  dashboardHeaderNeutralPillStyle,
} from "@/lib/dashboard/dashboard-header-chrome";
import { EXTENSION_STORE_URL } from "@/lib/brand";

type OverviewExtensionBadgeProps = {
  className?: string;
};

export function OverviewExtensionBadge({ className }: OverviewExtensionBadgeProps) {
  const [status, setStatus] = useState<ExtensionConnectionStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      getExtensionConnectionStatus().then((s) => {
        if (!cancelled) setStatus(s);
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") check();
    };

    check();
    const interval = window.setInterval(check, 5_000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  if (status === null) {
    return (
      <span
        className={cn(dashboardHeaderNeutralPillClassName("opacity-70"), className)}
        style={dashboardHeaderNeutralPillStyle}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-hidden="true" />
        Extension
      </span>
    );
  }

  if (status.state === "connected") {
    return (
      <span
        className={cn(dashboardHeaderMintPillClassName(), className)}
        style={dashboardHeaderMintPillStyle}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_oklch(0.82_0.16_165)]" aria-hidden="true" />
        Extension connected
      </span>
    );
  }

  const label = status.state === "not-installed" ? "Install extension" : "Extension offline";
  const href = status.state === "not-installed" ? EXTENSION_STORE_URL : "/dashboard/extension/bridge";
  const isExternal = status.state === "not-installed";

  return (
    <a
      href={href}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(dashboardHeaderNeutralPillClassName("hover:brightness-110"), className)}
      style={dashboardHeaderNeutralPillStyle}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden="true" />
      <span className="text-destructive">{label}</span>
    </a>
  );
}
