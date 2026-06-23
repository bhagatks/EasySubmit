import { describe, expect, it } from "vitest";
import { getAvatarGradient } from "@/lib/profile/avatar-gradient";

describe("getAvatarGradient", () => {
  it("returns stable gradients for the same seed", () => {
    expect(getAvatarGradient("alex@example.com")).toEqual(getAvatarGradient("alex@example.com"));
  });

  it("falls back for empty seed", () => {
    expect(getAvatarGradient("")).toMatchObject({ from: expect.any(String), to: expect.any(String) });
  });
});
