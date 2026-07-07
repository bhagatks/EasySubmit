import { describe, expect, it } from "vitest";
import { ENHANCE_QA_BASE_FORM } from "@/lib/job-tracker/enhance/enhance-qa-fixtures";
import { suggestAlternativeTargetRoles } from "@/lib/job-tracker/enhance/suggest-target-roles";

describe("suggestAlternativeTargetRoles", () => {
  it("returns experience titles on extreme cross-domain mismatch", () => {
    const roles = suggestAlternativeTargetRoles({
      form: ENHANCE_QA_BASE_FORM,
      jdTargetRole: "Director, Procurement",
      isCrossDomain: true,
      overlapScore: 0.04,
    });
    expect(roles.length).toBeGreaterThan(0);
    expect(roles.some((r) => /engineering|head/i.test(r))).toBe(true);
    expect(roles.some((r) => /procurement/i.test(r))).toBe(false);
  });

  it("returns empty when overlap is high enough", () => {
    expect(
      suggestAlternativeTargetRoles({
        form: ENHANCE_QA_BASE_FORM,
        jdTargetRole: "Senior Manager, Software Engineering",
        isCrossDomain: false,
        overlapScore: 0.45,
      }),
    ).toEqual([]);
  });
});
