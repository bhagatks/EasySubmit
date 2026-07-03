"use client";

import { useEffect, useState } from "react";
import { Download, Puzzle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getExtensionConnectionStatus } from "@/lib/extension/extension-dashboard-connection";
import { isSemverBelowMinimum } from "@/src/shared/extension/semver";
import { EXTENSION_STORE_URL } from "@/lib/brand";
import { extensionBridgeHref } from "@/lib/dashboard/dashboard-extension-links";
import { readExtensionIdForDashboard } from "@/lib/extension/start-job-apply-from-dashboard";

type ExtensionStatusButtonProps = {
  minVersion?: string;
};

type ButtonState =
  | { kind: "hidden" }
  | { kind: "install" }
  | { kind: "reconnect" }
  | { kind: "update" };

export function ExtensionStatusButton({ minVersion }: ExtensionStatusButtonProps) {
  const [btnState, setBtnState] = useState<ButtonState>({ kind: "hidden" });

  useEffect(() => {
    getExtensionConnectionStatus().then((status) => {
      if (status.state === "not-installed") {
        setBtnState({ kind: "install" });
      } else if (status.state === "offline") {
        setBtnState({ kind: "reconnect" });
      } else if (minVersion && isSemverBelowMinimum(status.version, minVersion)) {
        setBtnState({ kind: "update" });
      } else {
        setBtnState({ kind: "hidden" });
      }
    });
  }, [minVersion]);

  if (btnState.kind === "hidden") return null;

  if (btnState.kind === "install") {
    return (
      <Button size="sm" className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0" asChild>
        <a href={EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer">
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Get the extension
        </a>
      </Button>
    );
  }

  if (btnState.kind === "reconnect") {
    return (
      <Button size="sm" className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0" asChild>
        <a href={extensionBridgeHref(readExtensionIdForDashboard())}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Connect extension
        </a>
      </Button>
    );
  }

  return (
    <Button size="sm" className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0" asChild>
      <a href={EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer">
        <Puzzle className="h-3.5 w-3.5" aria-hidden="true" />
        Update extension
      </a>
    </Button>
  );
}
