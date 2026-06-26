/** Append a cache-busting query param so re-uploads to a stable path refresh in the browser. */
export function bustAvatarImageCache(url: string, version: number = Date.now()): string {
  const [base, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.set("v", String(version));
  return `${base}?${params.toString()}`;
}
