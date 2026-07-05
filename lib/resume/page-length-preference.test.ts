import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_LENGTH_PREFERENCE,
  describeAutoPageLengthRecommendation,
  inferAutoResumePages,
  normalizePageLengthPreference,
  resolveResumePages,
} from "@/lib/resume/page-length-preference";

describe("page-length-preference", () => {
  it("normalizes v2 page modes and legacy values", () => {
    expect(normalizePageLengthPreference(undefined)).toBe(DEFAULT_PAGE_LENGTH_PREFERENCE);
    expect(normalizePageLengthPreference("3")).toBe("3");
    expect(normalizePageLengthPreference("4+")).toBe("4+");
    expect(normalizePageLengthPreference("4")).toBe("4+");
    expect(normalizePageLengthPreference("bogus")).toBe(DEFAULT_PAGE_LENGTH_PREFERENCE);
  });

  it("infers auto pages from years and executive titles", () => {
    expect(inferAutoResumePages(3, "Software Engineer")).toBe(1);
    expect(inferAutoResumePages(12, "Software Engineer")).toBe(2);
    expect(inferAutoResumePages(4, "VP Engineering")).toBe(2);
  });

  it("honors manual overrides", () => {
    expect(resolveResumePages(15, "Director", "1")).toBe(1);
    expect(resolveResumePages(2, "Intern", "2")).toBe(2);
    expect(resolveResumePages(12, "Engineer", "auto")).toBe(2);
  });

  it("describes auto recommendation", () => {
    expect(describeAutoPageLengthRecommendation(12, "Engineer")).toContain("2 pages");
    expect(describeAutoPageLengthRecommendation(2, "Engineer")).toContain("1 page");
  });
});
