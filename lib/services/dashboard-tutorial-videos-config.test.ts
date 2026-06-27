import { describe, expect, it } from "vitest";
import { resolveDashboardTutorialVideos } from "@/lib/dashboard/dashboard-tutorial-videos";
import {
  DASHBOARD_TUTORIAL_VIDEOS_DEFAULTS,
  parseDashboardTutorialVideosConfig,
  resolveDashboardTutorialVideosConfig,
} from "@/src/lib/services/dashboard-tutorial-videos-config";

describe("dashboardTutorialVideos app_config", () => {
  it("parses videos array from config", () => {
    expect(
      parseDashboardTutorialVideosConfig({
        videos: [{ title: "Intro", watchUrl: "https://www.youtube.com/watch?v=IvjkGXZcnvc" }],
      }),
    ).toEqual({
      videos: [{ id: "tutorial-1", title: "Intro", watchUrl: "https://www.youtube.com/watch?v=IvjkGXZcnvc" }],
    });
  });

  it("falls back to defaults when config is invalid", () => {
    expect(resolveDashboardTutorialVideosConfig(null)).toEqual(DASHBOARD_TUTORIAL_VIDEOS_DEFAULTS);
  });

  it("builds embed-ready tutorial cards", () => {
    const videos = resolveDashboardTutorialVideos({
      videos: [{ title: "Title1", watchUrl: "https://www.youtube.com/watch?v=IvjkGXZcnvc&t=4s" }],
    });

    expect(videos).toHaveLength(1);
    expect(videos[0]?.embedSrc).toContain("IvjkGXZcnvc");
    expect(videos[0]?.embedSrc).toContain("start=4");
  });
});
