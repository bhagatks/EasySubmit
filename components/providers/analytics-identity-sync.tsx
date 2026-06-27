"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  AnalyticsEvents,
  captureAnalyticsEvent,
  identifyAnalyticsUser,
  resetAnalyticsUser,
} from "@/src/shared/analytics";

const LOGIN_MARKER_PREFIX = "es-analytics-login-";

/** Identifies the signed-in user (id only) and emits login_completed once per browser session. */
export function AnalyticsIdentitySync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (status !== "authenticated" || !session?.user?.id) {
      if (status === "unauthenticated") {
        resetAnalyticsUser();
      }
      return;
    }

    const userId = session.user.id;
    identifyAnalyticsUser(userId);

    const marker = `${LOGIN_MARKER_PREFIX}${userId}`;
    if (typeof window !== "undefined" && !sessionStorage.getItem(marker)) {
      const provider =
        typeof session.lastAuthProvider === "string"
          ? session.lastAuthProvider
          : "unknown";
      captureAnalyticsEvent(AnalyticsEvents.LOGIN_COMPLETED, {
        provider,
        is_new_user: (session.user.onboardingStep ?? 0) === 0,
      });
      sessionStorage.setItem(marker, "1");
    }
  }, [session, status]);

  return null;
}
