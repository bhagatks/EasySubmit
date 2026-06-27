import { describe, expect, it } from "vitest";
import { buildYoutubeEmbedSrc, parseYoutubeVideoUrl } from "@/lib/dashboard/youtube-embed";

describe("parseYoutubeVideoUrl", () => {
  it("parses watch URLs with start time", () => {
    expect(parseYoutubeVideoUrl("https://www.youtube.com/watch?v=IvjkGXZcnvc&t=4s")).toEqual({
      videoId: "IvjkGXZcnvc",
      startSeconds: 4,
    });
  });

  it("parses youtu.be links", () => {
    expect(parseYoutubeVideoUrl("https://youtu.be/IvjkGXZcnvc")).toEqual({
      videoId: "IvjkGXZcnvc",
      startSeconds: 0,
    });
  });

  it("builds embed src with start param", () => {
    const parsed = parseYoutubeVideoUrl("https://www.youtube.com/watch?v=IvjkGXZcnvc&t=4s");
    expect(parsed).not.toBeNull();
    expect(buildYoutubeEmbedSrc(parsed!)).toBe(
      "https://www.youtube.com/embed/IvjkGXZcnvc?rel=0&modestbranding=1&start=4",
    );
  });
});
