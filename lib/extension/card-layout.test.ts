import { describe, expect, it } from "vitest";
import {
  buildJobDetailFields,
  dashboardPanelForCardView,
  isExpandableCardView,
  shouldShowReviewRow,
  shouldShowSavedMetaRow,
} from "@/src/shared/extension/card-layout";

describe("card-layout", () => {
  it("hides saved meta row until the job is saved", () => {
    expect(shouldShowSavedMetaRow(false)).toBe(false);
    expect(shouldShowSavedMetaRow(true)).toBe(true);
  });

  it("shows review row from RESUME_READY onward", () => {
    expect(
      shouldShowReviewRow({ saved: true, status: "CAPTURED", stage: 1 }),
    ).toBe(false);
    expect(
      shouldShowReviewRow({ saved: true, status: "RESUME_READY", stage: 1 }),
    ).toBe(true);
    expect(
      shouldShowReviewRow({ saved: true, status: "READY_TO_APPLY", stage: 2 }),
    ).toBe(true);
    expect(
      shouldShowReviewRow({ saved: true, status: "APPLIED", stage: 3 }),
    ).toBe(true);
    expect(
      shouldShowReviewRow({ saved: true, status: "APPLIED", stage: "error" }),
    ).toBe(false);
  });

  it("orders job detail fields with description last", () => {
    const { fields, description } = buildJobDetailFields({
      company: "Acme",
      location: "Remote",
      salaryText: "$120k",
      description: "Long JD",
      platform: "greenhouse",
      jsonLdFields: { qualifications: "5+ years" },
    });

    expect(fields.map((field) => field.label)).toEqual([
      "Company",
      "Location",
      "Salary",
      "Platform",
      "Qualifications",
    ]);
    expect(description).toBe("Long JD");
  });

  it("maps expandable views to dashboard panels", () => {
    expect(dashboardPanelForCardView("resume-preview")).toBe("resume");
    expect(dashboardPanelForCardView("cover-preview")).toBe("cover");
    expect(dashboardPanelForCardView("job-detail")).toBe("job");
    expect(dashboardPanelForCardView("summary")).toBeNull();
  });

  it("flags inline panel views as expandable", () => {
    expect(isExpandableCardView("summary")).toBe(false);
    expect(isExpandableCardView("job-detail")).toBe(true);
    expect(isExpandableCardView("resume-preview")).toBe(true);
    expect(isExpandableCardView("cover-preview")).toBe(true);
  });
});
