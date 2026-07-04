import { describe, expect, it } from "vitest";
import { bustAvatarImageCache } from "@/lib/profile/avatar-cache-bust";

describe("bustAvatarImageCache", () => {
  it("appends cache-bust version query param", () => {
    expect(bustAvatarImageCache("https://cdn.example.com/avatar.png", 42)).toBe(
      "https://cdn.example.com/avatar.png?v=42",
    );
  });

  it("preserves existing query params", () => {
    expect(bustAvatarImageCache("https://cdn.example.com/avatar.png?size=lg", 7)).toBe(
      "https://cdn.example.com/avatar.png?size=lg&v=7",
    );
  });
});
