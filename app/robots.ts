import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/seo/public-site-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/onboarding/", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
