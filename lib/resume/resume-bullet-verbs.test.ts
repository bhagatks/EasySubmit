import { describe, expect, it } from "vitest";
import {
  bulletHasStrongOpening,
  normalizeBulletOpeningVerb,
} from "@/lib/resume/resume-bullet-verbs";

describe("resume-bullet-verbs", () => {
  it("recognizes past-tense openings", () => {
    expect(bulletHasStrongOpening("Led platform migration")).toBe(true);
    expect(bulletHasStrongOpening("Built API services")).toBe(true);
  });

  it("recognizes base-form openings", () => {
    expect(bulletHasStrongOpening("Lead the delivery platform")).toBe(true);
    expect(bulletHasStrongOpening("Define technical direction")).toBe(true);
  });

  it("normalizes base forms without stacking verbs", () => {
    expect(normalizeBulletOpeningVerb("Lead the 7Now Delivery Platform")).toBe(
      "Led the 7Now Delivery Platform",
    );
    expect(normalizeBulletOpeningVerb("Define and implement technical direction")).toBe(
      "Defined and implement technical direction",
    );
  });

  it("does not stack on past-tense openings", () => {
    expect(normalizeBulletOpeningVerb("Led team of 12 engineers")).toBe(
      "Led team of 12 engineers",
    );
  });
});
