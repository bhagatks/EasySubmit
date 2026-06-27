export type ParsedYoutubeVideo = {
  videoId: string;
  startSeconds: number;
};

/** Parse watch, youtu.be, or embed URLs into embed-ready parts. */
export function parseYoutubeVideoUrl(url: string): ParsedYoutubeVideo | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed, "https://www.youtube.com");
    const host = parsed.hostname.replace(/^www\./, "");

    let videoId: string | null = null;

    if (host === "youtu.be") {
      videoId = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (host.endsWith("youtube.com")) {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v");
      } else if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/")[2] ?? null;
      } else if (parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/")[2] ?? null;
      }
    }

    if (!videoId) return null;

    const startSeconds = parseYoutubeStartSeconds(parsed.searchParams.get("t"));
    return { videoId, startSeconds };
  } catch {
    if (/^[\w-]{11}$/.test(trimmed)) {
      return { videoId: trimmed, startSeconds: 0 };
    }
    return null;
  }
}

function parseYoutubeStartSeconds(raw: string | null): number {
  if (!raw) return 0;
  const value = raw.trim().toLowerCase();
  if (!value) return 0;

  if (/^\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }

  const match = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (!match) return 0;

  const hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  const seconds = Number.parseInt(match[3] ?? "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export function buildYoutubeEmbedSrc(video: ParsedYoutubeVideo): string {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
  });
  if (video.startSeconds > 0) {
    params.set("start", String(video.startSeconds));
  }
  return `https://www.youtube.com/embed/${encodeURIComponent(video.videoId)}?${params.toString()}`;
}
