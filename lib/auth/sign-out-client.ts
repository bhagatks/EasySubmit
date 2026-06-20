import { signOut } from "next-auth/react";
import { clearSessionApiKeyVault } from "@/src/lib/ai/session-key-vault";
import { useIgnitionStore } from "@/src/stores/use-ignition-store";
import { useOnboardingStore } from "@/stores/onboardingStore";

const ONBOARDING_STORAGE_KEY = "easysubmit-onboarding";
const IGNITION_PREFS_STORAGE_KEY = "easysubmit-ignition-prefs";

/**
 * Clear client-side auth state before NextAuth sign-out.
 *
 * Cleared: Zustand onboarding + ignition stores, session BYOK cipher/vault keys,
 * onboarding sessionStorage draft, ignition provider/model prefs in localStorage.
 *
 * Kept: server data (profiles, applications, vaulted BYOK refs), NextAuth until
 * signOut completes, and non-sensitive UI prefs (studio zoom, page size, fonts).
 */
export function clearClientSessionState(): void {
  useOnboardingStore.getState().resetStore();
  useIgnitionStore.getState().resetIgnition();
  clearSessionApiKeyVault();

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
