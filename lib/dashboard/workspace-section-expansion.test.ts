import { describe, expect, it } from "vitest";
import { buildWorkspaceExpansionState } from "@/lib/dashboard/use-workspace-section-expansion";

describe("buildWorkspaceExpansionState", () => {
  it("defaults all sections to collapsed", () => {
    expect(buildWorkspaceExpansionState(["a", "b"])).toEqual({ a: false, b: false });
  });

  it("honors defaultExpanded", () => {
    expect(buildWorkspaceExpansionState(["a"], true)).toEqual({ a: true });
  });

  it("applies per-section overrides", () => {
    expect(buildWorkspaceExpansionState(["a", "b"], false, { b: true })).toEqual({
      a: false,
      b: true,
    });
  });
});
