import { Suspense } from "react";
import ExtensionBridgeClient from "./ExtensionBridgeClient";

export default function ExtensionBridgePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ExtensionBridgeClient />
    </Suspense>
  );
}
