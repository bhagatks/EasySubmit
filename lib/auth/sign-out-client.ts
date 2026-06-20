import { signOut } from "next-auth/react";
import { useIgnitionStore } from "@/src/stores/use-ignition-store";
import { useOnboardingStore } from "@/stores/onboardingStore";

const ONBOARDING_STORAGE_KEY = "easysubmit-onboarding";
const IGNITION_PREFS_STORAGE_KEY = "easysubmit-ignition-prefs";

/** Clear persisted onboarding + BYOK client state before ending the session. */
export function clearClientSessionState(): void {
  useOnboardingStore.getState().resetStore();
  useIgnitionStore.getState().resetIgnition();

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(ONBOARDING_STORAGE_KEY);
  }

  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(IGNITION_PREFS_STORAGE_KEY);
  }
}

/** Sign out via NextAuth and return the user to `/login` (always stays on EasySubmit). */
export async function signOutUser(): Promise<void> {
  clearClientSessionState();
  await signOut({ redirect: false });
  window.location.assign("/login?signedOut=1");
}
