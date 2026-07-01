import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveSafeCallbackUrl } from "@/lib/auth/safe-callback-url";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/terms",
  "/privacy",
  "/pricing",
  "/help",
  "/support",
] as const;
const PUBLIC_PREFIXES = ["/auth/"] as const;
const ONBOARDING_PATH = "/onboarding";
const PLAN_PATH = "/select-plan";
const DASHBOARD_PATH = "/dashboard";
const COMPLETED_ONBOARDING_STEP = 4;

function matchesPath(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/extension") {
    return true;
  }

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return PUBLIC_PATHS.some(
    (path) => pathname === path || (path !== "/" && matchesPath(pathname, path)),
  );
}

function isLoginReauthPath(pathname: string, searchParams: URLSearchParams): boolean {
  return pathname === "/login" && searchParams.get("signedOut") === "1";
}

function isAuthApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/auth");
}

function isResumeApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/resume");
}

function isExtensionApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/extension");
}

function isProfileApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/profile");
}

function isSeoMetadataPath(pathname: string): boolean {
  return pathname === "/sitemap.xml" || pathname === "/robots.txt";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isSeoMetadataPath(pathname)) {
    return NextResponse.next();
  }

  if (
    isAuthApiPath(pathname) ||
    isResumeApiPath(pathname) ||
    isExtensionApiPath(pathname) ||
    isProfileApiPath(pathname)
  ) {
    return NextResponse.next();
  }

  if (
    isLoginReauthPath(pathname, request.nextUrl.searchParams) ||
    pathname.startsWith("/auth/")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isLoggedIn = Boolean(token);

  if (!isLoggedIn) {
    if (isPublicPath(pathname)) {
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", request.url);
    const returnPath = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("callbackUrl", returnPath);
    return NextResponse.redirect(loginUrl);
  }

  const planConfirmedAt = token?.planConfirmedAt as string | null | undefined;
  const planConfirmed = Boolean(planConfirmedAt);

  // Plan gate — runs on every launch for every authenticated user.
  // Users land here until they explicitly select a plan.
  if (!planConfirmed && pathname !== PLAN_PATH && !pathname.startsWith("/extension/bridge")) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL(PLAN_PATH, request.url));
    }
    // Allow public paths and /api routes through — gate only protected routes.
    if (!isPublicPath(pathname)) {
      return NextResponse.redirect(new URL(PLAN_PATH, request.url));
    }
  }

  const onOnboarding = matchesPath(pathname, ONBOARDING_PATH);
  const onDashboard = matchesPath(pathname, DASHBOARD_PATH);

  // Hub routes use DB-backed gates in layouts (requireDashboardSession / onboarding layout).
  // JWT onboardingStep alone caused /dashboard <-> /onboarding redirect loops.
  if (onOnboarding || onDashboard) {
    const requestHeaders = new Headers(request.headers);
    if (onOnboarding && request.nextUrl.searchParams.get("ignition") === "1") {
      requestHeaders.set("x-easysubmit-onboarding-ignition", "1");
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const onboardingStep =
    typeof token?.onboardingStep === "number" ? token.onboardingStep : 0;
  const onboardingComplete = onboardingStep >= COMPLETED_ONBOARDING_STEP;

  if (onboardingComplete) {
    if (pathname === "/login") {
      const callbackUrl = resolveSafeCallbackUrl(
        request.nextUrl.searchParams.get("callbackUrl"),
        DASHBOARD_PATH,
      );
      return NextResponse.redirect(new URL(callbackUrl, request.url));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/extension/bridge") || pathname === PLAN_PATH) {
    return NextResponse.next();
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
  }

  return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
