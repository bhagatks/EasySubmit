"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/ui/logo";
import { deliverTokenToExtension } from "@/lib/extension/deliver-token-to-extension";
import { storeExtensionIdForDashboard } from "@/lib/extension/start-job-apply-from-dashboard";

type BridgeState = "loading" | "success" | "error" | "no-extension-id";

export default function ExtensionBridgeClient() {
  const searchParams = useSearchParams();
  const extensionId = searchParams.get("extensionId") ?? "";
  const [state, setState] = useState<BridgeState>(
    extensionId ? "loading" : "no-extension-id",
  );
  const [message, setMessage] = useState("Connecting extension to your account…");

  useEffect(() => {
    if (extensionId) {
      storeExtensionIdForDashboard(extensionId);
    }
  }, [extensionId]);

  useEffect(() => {
    if (!extensionId) return;

    void (async () => {
      try {
        const res = await fetch("/api/extension/auth/token", {
          method: "POST",
          credentials: "include",
        });
        const data = (await res.json()) as {
          success?: boolean;
          token?: string;
          email?: string | null;
          error?: string;
        };

        if (!res.ok || !data.success || !data.token) {
          setState("error");
          if (res.status === 403 && data.error?.includes("onboarding")) {
            setMessage("Finish onboarding first, then return to this page to connect the extension.");
          } else if (res.status === 401) {
            setMessage("Sign in to connect the extension.");
          } else {
            setMessage(data.error ?? "Could not issue extension token. Sign in and try again.");
          }
          return;
        }

        const result = await deliverTokenToExtension(data.token, extensionId);
        if (!result.success) {
          setState("error");
          setMessage(
            result.error ??
              "Could not connect the extension. Reload it at chrome://extensions and try again.",
          );
          return;
        }

        setState("success");
        setMessage(
          data.email
            ? `Extension connected as ${data.email}. You can close this tab and save jobs from any supported site.`
            : "Extension connected. You can close this tab and save jobs from any supported site.",
        );
      } catch {
        setState("error");
        setMessage("Network error while connecting the extension.");
      }
    })();
  }, [extensionId]);

  const bridgeHref = extensionId
    ? `/extension/bridge?extensionId=${encodeURIComponent(extensionId)}`
    : "/extension/bridge";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface/80 p-8 text-center shadow-sm">
        <LogoIcon className="mx-auto h-12 w-12" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Connect extension</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>

        {state === "success" ? (
          <Button variant="mint" className="mt-6" asChild>
            <Link href="/dashboard/job-tracker">Open Job Tracker</Link>
          </Button>
        ) : null}

        {state === "error" || state === "no-extension-id" ? (
          <div className="mt-6 flex flex-col gap-2">
            {state === "error" ? (
              <Button variant="mint" onClick={() => window.location.reload()}>
                Try again
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href={`/login?callbackUrl=${encodeURIComponent(bridgeHref)}`}>Sign in</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/extension">Extension setup</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
