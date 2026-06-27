/** `app_config` row key — dashboard Video Tutorials page YouTube entries. */
export const DASHBOARD_TUTORIAL_VIDEOS_CONFIG_KEY = "dashboardTutorialVideos";

const PLACEHOLDER_WATCH_URL = "https://www.youtube.com/watch?v=IvjkGXZcnvc&t=4s";

export type TutorialVideoConfigEntry = {
  id?: string;
  title: string;
  watchUrl: string;
};

export type DashboardTutorialVideosConfig = {
  videos: TutorialVideoConfigEntry[];
};

export const DASHBOARD_TUTORIAL_VIDEOS_DEFAULTS: DashboardTutorialVideosConfig = {
  videos: Array.from({ length: 6 }, (_, index) => ({
    id: `tutorial-${index + 1}`,
    title: `Title${index + 1}`,
    watchUrl: PLACEHOLDER_WATCH_URL,
  })),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseVideoEntry(value: unknown, index: number): TutorialVideoConfigEntry | null {
  if (!isRecord(value)) return null;

  const title = typeof value.title === "string" ? value.title.trim() : "";
  const watchUrl = typeof value.watchUrl === "string" ? value.watchUrl.trim() : "";
  if (!title || !watchUrl) return null;

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : `tutorial-${index + 1}`;

  return { id, title, watchUrl };
}

export function parseDashboardTutorialVideosConfig(
  value: unknown,
): DashboardTutorialVideosConfig | null {
  if (!isRecord(value)) return null;

  const rawVideos = value.videos;
  if (!Array.isArray(rawVideos) || rawVideos.length === 0) return null;

  const videos = rawVideos
    .map((entry, index) => parseVideoEntry(entry, index))
    .filter((entry): entry is TutorialVideoConfigEntry => entry !== null);

  if (videos.length === 0) return null;

  return { videos };
}

export function resolveDashboardTutorialVideosConfig(
  value: unknown,
): DashboardTutorialVideosConfig {
  return parseDashboardTutorialVideosConfig(value) ?? DASHBOARD_TUTORIAL_VIDEOS_DEFAULTS;
}
