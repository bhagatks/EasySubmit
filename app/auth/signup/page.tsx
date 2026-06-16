import { Suspense } from "react";
import SignupPage from "./SignupPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-simplifyBg">
          <p className="text-sm text-gray-500">Loading...</p>
        </main>
      }
    >
      <SignupPage />
    </Suspense>
  );
}
