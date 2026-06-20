import { Suspense } from "react";
import SignupPage from "./SignupPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </main>
      }
    >
      <SignupPage />
    </Suspense>
  );
}
