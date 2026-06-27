import { signOut } from "next-auth/react";
import { clearEasySubmitClientStorage } from "@/lib/auth/client-storage";

/**
 * Clear client-side auth state before NextAuth sign-out.
 *
 * Clears all EasySubmit web client storage: Zustand stores, workbench resume draft,
 * BYOK session vault, onboarding/ignition prefs, studio UI prefs, and related caches.
 *
 * Server data (profiles, job tracker, vaulted BYOK refs) is unchanged.
 * Chrome extension storage is unchanged — extension handles its own auth lifecycle.
 */
export function clearClientSessionState(): void {
  clearEasySubmitClientStorage();
}

/** Sign out via NextAuth and return the user to `/login` (always stays on EasySubmit). */
export async function signOutUser(): Promise<void> {
  clearClientSessionState();

  const callbackUrl = "/login?signedOut=1";

  try {
    // Let NextAuth finish clearing httpOnly cookies before landing on /login.
    // Manual `location.assign` raced ahead of cookie deletion and left users signed in.
    await signOut({ callbackUrl });
  } catch {
    window.location.assign(
      `/api/auth/signout?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    );
  }
}
