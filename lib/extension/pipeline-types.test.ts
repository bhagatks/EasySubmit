import { describe, expect, it } from "vitest";
import { isOneClickPlatform } from "@/lib/extension/pipeline-types";

describe("pipeline-types", () => {
  it("recognizes Workday as one-click platform", () => {
    expect(isOneClickPlatform("workday")).toBe(true);
    expect(isOneClickPlatform("WORKDAY")).toBe(true);
    expect(isOneClickPlatform("linkedin")).toBe(false);
    expect(isOneClickPlatform(null)).toBe(false);
  });
});
