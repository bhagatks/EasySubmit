import { afterEach, describe, expect, it } from "vitest";
import { getPublicSiteUrl } from "@/lib/seo/public-site-url";

describe("getPublicSiteUrl", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalAuthUrl = process.env.NEXTAUTH_URL;

  afterEach(() => {
    if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    if (originalAuthUrl === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = originalAuthUrl;
  });

  it("prefers NEXT_PUBLIC_APP_URL and strips trailing slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com/";
    delete process.env.NEXTAUTH_URL;
    expect(getPublicSiteUrl()).toBe("https://app.example.com");
  });

  it("falls back to NEXTAUTH_URL", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXTAUTH_URL = "https://auth.example.com";
    expect(getPublicSiteUrl()).toBe("https://auth.example.com");
  });

  it("uses production default when env is unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXTAUTH_URL;
    expect(getPublicSiteUrl()).toBe("https://easysubmit.ai");
  });
});
