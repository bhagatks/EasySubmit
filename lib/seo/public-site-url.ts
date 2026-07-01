/** Canonical public site origin for SEO metadata (sitemap, robots). */
export function getPublicSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "https://easysubmit.ai"
  ).replace(/\/$/, "");
}
