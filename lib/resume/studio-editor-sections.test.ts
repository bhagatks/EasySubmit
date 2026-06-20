import { describe, expect, it } from "vitest";
import {
  buildInitialStudioSectionState,
  defaultStudioSectionExpanded,
  STUDIO_MANDATORY_SECTIONS,
} from "./studio-editor-sections";

describe("studio-editor-sections", () => {
  it("expands mandatory sections during onboarding only", () => {
    for (const id of STUDIO_MANDATORY_SECTIONS) {
      expect(defaultStudioSectionExpanded(id, "onboarding")).toBe(true);
      expect(defaultStudioSectionExpanded(id, "dashboard")).toBe(false);
    }
    expect(defaultStudioSectionExpanded("education", "onboarding")).toBe(false);
    expect(defaultStudioSectionExpanded("education", "dashboard")).toBe(false);
  });

  it("builds initial expand map from section ids", () => {
    const state = buildInitialStudioSectionState(
      ["header", "skills", "education"],
      "onboarding",
    );
    expect(state.header).toBe(true);
    expect(state.skills).toBe(true);
    expect(state.education).toBe(false);
  });
});
