import { describe, expect, it } from "vitest";
import { extractTrailingDateRange } from "@/lib/resume/dates";
import { splitPipeCompanyLocation } from "@/lib/resume/openResume/extract-resume-from-sections/lib/tab-line-headers";

/** Regression cases derived from ATS_Bhagath_Sample.pdf header lines. */
describe("Bhagath resume header parsing", () => {
  it("parses 7-Eleven company/location line without pipe characters", () => {
    expect(splitPipeCompanyLocation("7-Eleven Frisco/Dallas, TX")).toEqual({
      company: "7-Eleven",
      location: "Frisco/Dallas, TX",
    });
  });

  it("parses stacked title line with trailing year range", () => {
    expect(
      extractTrailingDateRange(
        "Senior Engineering Manager | Solution Architect - 7Now Delivery Platform 2024 – 2026",
      ),
    ).toEqual({
      title:
        "Senior Engineering Manager | Solution Architect - 7Now Delivery Platform",
      date: "2024 – 2026",
    });
  });

  it("parses CVS title and date range", () => {
    expect(
      extractTrailingDateRange(
        "Director | Engineering Manager - Digital Applications & Regulated Infrastructure 2014 – 2023",
      ),
    ).toMatchObject({
      date: "2014 – 2023",
    });
  });
});
