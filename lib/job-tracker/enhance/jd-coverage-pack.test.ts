import { describe, expect, it } from "vitest";
import {
  applyJdCoverageWeave,
  weaveCompoundBullet,
} from "@/lib/job-tracker/enhance/jd-coverage-pack";
import type { JdAtom } from "@/lib/job-tracker/enhance/enhance-brief";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";

const ATOMS: JdAtom[] = [
  { id: "a1", label: "Python", tier: 1, tokens: ["python"] },
  { id: "a2", label: "AWS", tier: 1, tokens: ["aws"] },
];

describe("jd-coverage-pack", () => {
  it("weaveCompoundBullet appends JD phrases without duplicating existing terms", () => {
    const woven = weaveCompoundBullet("Built backend services.", ATOMS);
    expect(woven.toLowerCase()).toMatch(/python/);
    expect(woven.length).toBeGreaterThan("Built backend services.".length);
  });

  it("applyJdCoverageWeave returns unchanged form when brief has no JD", () => {
    const form = { experience: [] } as HubRefineryForm;
    const result = applyJdCoverageWeave(form, {
      jd: undefined,
    } as never);
    expect(result.form).toBe(form);
    expect(result.bulletsWoven).toBe(0);
  });
});
