import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login"] as const;
const ONBOARDING_PATH = "/onboarding";
const DASHBOARD_PATH = "/dashboard";
const COMPLETED_ONBOARDING_STEP = 4;

function matchesPath(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || (path !== "/" && matchesPath(pathname, path)),
  );
}

function isAuthApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/auth");
}

function isResumeApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/resume");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAuthApiPath(pathname) || isResumeApiPath(pathname)) {
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
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const onboardingStep =
    typeof token?.onboardingStep === "number" ? token.onboardingStep : 0;

  const onOnboarding = matchesPath(pathname, ONBOARDING_PATH);
  const onDashboard = matchesPath(pathname, DASHBOARD_PATH);
  const onboardingComplete = onboardingStep >= COMPLETED_ONBOARDING_STEP;

  if (onboardingComplete) {
    if (onOnboarding) {
      return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
    }

    if (pathname === "/login") {
      return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
    }

    return NextResponse.next();
  }

  if (onOnboarding) {
    return NextResponse.next();
  }

  if (onDashboard) {
    return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
  }

  return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
