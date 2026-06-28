import { describe, expect, it } from "vitest";
import {
  canonicalizeJdSkillLabel,
  dedupeRelatedSkillLabels,
  filterJdSkillLabels,
  filterReportableMissingKeywords,
  filterSkillsRequiringExperienceAnchor,
} from "@/lib/job-tracker/jd/jd-skill-filter";

describe("jd-skill-filter", () => {
  it("rejects marketing fragment tokens", () => {
    expect(canonicalizeJdSkillLabel("BIG")).toBeNull();
    expect(canonicalizeJdSkillLabel("Annual")).toBeNull();
    expect(canonicalizeJdSkillLabel("First")).toBeNull();
  });

  it("accepts canonical procurement skills", () => {
    expect(canonicalizeJdSkillLabel("procurement")).toBe("Procurement");
    expect(canonicalizeJdSkillLabel("Risk Management")).toBe("Risk Management");
    expect(canonicalizeJdSkillLabel("ISO 13485")).toBe("ISO 13485");
  });

  it("dedupes patient vs patient care", () => {
    expect(dedupeRelatedSkillLabels(["Patient", "Patient Care", "Python"])).toEqual([
      "Patient Care",
      "Python",
    ]);
  });

  it("filters junk from mixed list", () => {
    expect(
      filterJdSkillLabels([
        "Procurement",
        "BIG",
        "Risk Management",
        "CARE",
        "ISO 13485",
      ]),
    ).toEqual(["Procurement", "Risk Management", "ISO 13485"]);
  });

  it("drops Patient Care without clinical experience anchor", () => {
    const engBlob = "Head of Engineering 7Now Delivery Platform Swift Kotlin API";
    expect(
      filterSkillsRequiringExperienceAnchor(
        ["Procurement", "Patient Care", "ISO 13485"],
        engBlob,
      ),
    ).toEqual(["Procurement", "ISO 13485"]);
  });

  it("filters junk from missing keyword chips", () => {
    expect(
      filterReportableMissingKeywords(
        ["influence", "Strategic Alliances", "BIG", "patient care"],
        "Head of Engineering platform API",
      ),
    ).toEqual(["Strategic Alliances"]);
  });
});
