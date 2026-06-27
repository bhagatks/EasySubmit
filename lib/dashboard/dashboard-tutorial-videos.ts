import { buildYoutubeEmbedSrc, parseYoutubeVideoUrl } from "@/lib/dashboard/youtube-embed";
import {
  DASHBOARD_TUTORIAL_VIDEOS_DEFAULTS,
  resolveDashboardTutorialVideosConfig,
  type DashboardTutorialVideosConfig,
  type TutorialVideoConfigEntry,
} from "@/src/lib/services/dashboard-tutorial-videos-config";

export type DashboardTutorialVideo = {
  id: string;
  title: string;
  watchUrl: string;
  embedSrc: string;
};

function buildTutorialVideo(entry: TutorialVideoConfigEntry): DashboardTutorialVideo | null {
  const parsed = parseYoutubeVideoUrl(entry.watchUrl);
  if (!parsed) return null;

  return {
    id: entry.id ?? entry.title,
    title: entry.title,
    watchUrl: entry.watchUrl,
    embedSrc: buildYoutubeEmbedSrc(parsed),
  };
}

/** Map `app_config.dashboardTutorialVideos` entries to embed-ready cards. */
export function resolveDashboardTutorialVideos(
  config: unknown,
): DashboardTutorialVideo[] {
  const resolved = resolveDashboardTutorialVideosConfig(config);
  const videos = resolved.videos
    .map((entry) => buildTutorialVideo(entry))
    .filter((video): video is DashboardTutorialVideo => video !== null);

  if (videos.length > 0) {
    return videos;
  }

  return DASHBOARD_TUTORIAL_VIDEOS_DEFAULTS.videos
    .map((entry) => buildTutorialVideo(entry))
    .filter((video): video is DashboardTutorialVideo => video !== null);
}

export type { DashboardTutorialVideosConfig, TutorialVideoConfigEntry };
