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

  it("parses /embed/ URLs", () => {
    expect(parseYoutubeVideoUrl("https://www.youtube.com/embed/IvjkGXZcnvc")).toEqual({
      videoId: "IvjkGXZcnvc",
      startSeconds: 0,
    });
  });

  it("parses /shorts/ URLs", () => {
    expect(parseYoutubeVideoUrl("https://www.youtube.com/shorts/IvjkGXZcnvc")).toEqual({
      videoId: "IvjkGXZcnvc",
      startSeconds: 0,
    });
  });

  it("returns null for empty string", () => {
    expect(parseYoutubeVideoUrl("")).toBeNull();
  });

  it("returns null for unrecognized URLs", () => {
    expect(parseYoutubeVideoUrl("https://vimeo.com/12345")).toBeNull();
  });

  it("returns null for /watch URL without v param", () => {
    expect(parseYoutubeVideoUrl("https://www.youtube.com/watch")).toBeNull();
  });

  it("parses t param in h/m/s format", () => {
    expect(
      parseYoutubeVideoUrl("https://www.youtube.com/watch?v=IvjkGXZcnvc&t=1h2m3s"),
    ).toEqual({ videoId: "IvjkGXZcnvc", startSeconds: 3723 });
  });

  it("parses t param as raw seconds", () => {
    expect(
      parseYoutubeVideoUrl("https://www.youtube.com/watch?v=IvjkGXZcnvc&t=90"),
    ).toEqual({ videoId: "IvjkGXZcnvc", startSeconds: 90 });
  });

  it("builds embed src with start param", () => {
    const parsed = parseYoutubeVideoUrl("https://www.youtube.com/watch?v=IvjkGXZcnvc&t=4s");
    expect(parsed).not.toBeNull();
    expect(buildYoutubeEmbedSrc(parsed!)).toBe(
      "https://www.youtube.com/embed/IvjkGXZcnvc?rel=0&modestbranding=1&start=4",
    );
  });

  it("builds embed src without start param when startSeconds is 0", () => {
    expect(buildYoutubeEmbedSrc({ videoId: "IvjkGXZcnvc", startSeconds: 0 })).toBe(
      "https://www.youtube.com/embed/IvjkGXZcnvc?rel=0&modestbranding=1",
    );
  });
});
