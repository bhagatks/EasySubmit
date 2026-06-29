import { describe, expect, it } from "vitest";
import {
  buildInitialStudioSectionState,
  buildOnboardingStudioSectionExpansion,
  buildProfileStudioSectionExpansion,
  defaultStudioSectionExpanded,
  PROFILE_MANDATORY_SECTIONS,
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

  it("expands profile mandatory sections in profile studio", () => {
    for (const id of PROFILE_MANDATORY_SECTIONS) {
      expect(defaultStudioSectionExpanded(id, "profile")).toBe(true);
    }
    expect(defaultStudioSectionExpanded("professionalSummary", "profile")).toBe(false);
    expect(defaultStudioSectionExpanded("education", "profile")).toBe(false);
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

  it("buildOnboardingStudioSectionExpansion expands all mandatory sections", () => {
    const state = buildOnboardingStudioSectionExpansion();
    for (const id of STUDIO_MANDATORY_SECTIONS) {
      expect(state[id]).toBe(true);
    }
    expect(state.professionalSummary).toBe(false);
    expect(state.education).toBe(false);
  });

  it("buildProfileStudioSectionExpansion expands profile role and mandatory sections", () => {
    const state = buildProfileStudioSectionExpansion();
    for (const id of PROFILE_MANDATORY_SECTIONS) {
      expect(state[id]).toBe(true);
    }
    expect(state.professionalSummary).toBe(false);
    expect(state.education).toBe(false);
  });
});
