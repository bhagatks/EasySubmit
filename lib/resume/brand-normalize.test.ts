import { describe, expect, it } from "vitest";
import { normalizeBrandTokens } from "@/lib/resume/brand-normalize";

describe("normalizeBrandTokens", () => {
  it("fixes Git Hub Copilot spacing", () => {
    expect(normalizeBrandTokens("Git Hub Copilot and Git Hub")).toBe(
      "GitHub Copilot and GitHub",
    );
  });
});
