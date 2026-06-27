const WATCH_URL =
  "https://www.youtube.com/watch?v=IvjkGXZcnvc&t=4s" as const;

export type DashboardTutorialVideo = {
  id: string;
  title: string;
  watchUrl: string;
};

export const DASHBOARD_TUTORIAL_VIDEOS: DashboardTutorialVideo[] = Array.from(
  { length: 6 },
  (_, index) => ({
    id: `tutorial-${index + 1}`,
    title: `Title${index + 1}`,
    watchUrl: WATCH_URL,
  }),
);

export function parseYoutubeStartSeconds(raw: string | null): number | undefined {
  if (!raw?.trim()) return undefined;
  const value = raw.trim();
  if (/^\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/i);
  if (!match) return undefined;
  const hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  const seconds = Number.parseInt(match[3] ?? "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/** Convert a YouTube watch URL to an embed src (supports `t=` start offset). */
export function youtubeWatchUrlToEmbedSrc(watchUrl: string): string | null {
  try {
    const url = new URL(watchUrl);
    let videoId: string | null = null;

    if (url.hostname.includes("youtu.be")) {
      videoId = url.pathname.replace(/^\//, "") || null;
    } else if (url.pathname.startsWith("/embed/")) {
      videoId = url.pathname.split("/")[2] ?? null;
    } else {
      videoId = url.searchParams.get("v");
    }

    if (!videoId) return null;

    const start =
      parseYoutubeStartSeconds(url.searchParams.get("t")) ??
      parseYoutubeStartSeconds(url.searchParams.get("start"));

    const embed = new URL(`https://www.youtube.com/embed/${videoId}`);
    embed.searchParams.set("rel", "0");
    if (start !== undefined && start > 0) {
      embed.searchParams.set("start", String(start));
    }
    return embed.toString();
  } catch {
    return null;
  }
}
