import { describe, expect, it } from "vitest";
import {
  DASHBOARD_TUTORIAL_VIDEOS,
  youtubeWatchUrlToEmbedSrc,
} from "@/lib/dashboard/tutorial-videos";

describe("tutorial-videos", () => {
  it("defines six placeholder tutorials", () => {
    expect(DASHBOARD_TUTORIAL_VIDEOS).toHaveLength(6);
    expect(DASHBOARD_TUTORIAL_VIDEOS[0]?.title).toBe("Title1");
    expect(DASHBOARD_TUTORIAL_VIDEOS[5]?.title).toBe("Title6");
  });

  it("builds embed src with start offset", () => {
    expect(
      youtubeWatchUrlToEmbedSrc("https://www.youtube.com/watch?v=IvjkGXZcnvc&t=4s"),
    ).toBe("https://www.youtube.com/embed/IvjkGXZcnvc?rel=0&start=4");
  });
});
