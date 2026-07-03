const OAUTH_REDIRECT_PENDING_KEY = "easysubmit-oauth-redirect-pending";
const LOGIN_TERMS_ACCEPTED_KEY = "easysubmit-login-terms-accepted";

export function markOAuthRedirectPending(provider: string): void {
  try {
    sessionStorage.setItem(OAUTH_REDIRECT_PENDING_KEY, provider);
  } catch {
    /* sessionStorage unavailable */
  }
}

export function clearOAuthRedirectPending(): void {
  try {
    sessionStorage.removeItem(OAUTH_REDIRECT_PENDING_KEY);
  } catch {
    /* sessionStorage unavailable */
  }
}

/** True when the user returned from an in-flight provider redirect (e.g. browser Back). */
export function consumeOAuthRedirectPending(): boolean {
  try {
    const pending = sessionStorage.getItem(OAUTH_REDIRECT_PENDING_KEY);
    if (!pending) return false;
    sessionStorage.removeItem(OAUTH_REDIRECT_PENDING_KEY);
    return true;
  } catch {
    return false;
  }
}

/** True while a provider redirect was started but the user may have navigated back. */
export function hasOAuthRedirectPending(): boolean {
  try {
    return sessionStorage.getItem(OAUTH_REDIRECT_PENDING_KEY) !== null;
  } catch {
    return false;
  }
}

export function markLoginTermsAccepted(): void {
  try {
    sessionStorage.setItem(LOGIN_TERMS_ACCEPTED_KEY, "1");
  } catch {
    /* sessionStorage unavailable */
  }
}

export function clearLoginTermsAccepted(): void {
  try {
    sessionStorage.removeItem(LOGIN_TERMS_ACCEPTED_KEY);
  } catch {
    /* sessionStorage unavailable */
  }
}

export function readLoginTermsAccepted(): boolean {
  try {
    return sessionStorage.getItem(LOGIN_TERMS_ACCEPTED_KEY) === "1";
  } catch {
    return false;
  }
}
