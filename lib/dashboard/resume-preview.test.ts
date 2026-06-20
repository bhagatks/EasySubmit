import { describe, expect, it } from "vitest";
import { buildResumePreviewFromSources } from "@/lib/dashboard/resume-preview";

describe("buildResumePreviewFromSources", () => {
  it("maps profile and architecture JSON into PrimeResumeData", () => {
    const preview = buildResumePreviewFromSources(
      {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phone: "+1 555-0100",
        city: "London",
        country: "UK",
        summary: "Systems thinker.",
        skills: ["TypeScript"],
        targetTitle: "Staff Engineer",
      },
      {
        skills: ["React", "Node"],
        experiences: [
          {
            title: "Engineer",
            company: "Analytical Engines Ltd",
            location: "London",
            dateRange: "Jan 2020 – Present",
            bullets: ["Built parsers"],
          },
        ],
        education: [
          {
            degree: "BSc Mathematics",
            school: "Cambridge",
            location: "Cambridge",
            date: "2016 – 2020",
          },
        ],
        certifications: ["AWS SA"],
        projects: ["Career OS"],
        languages: ["English — Native"],
      },
      "Staff Engineer",
    );

    expect(preview.fullName).toBe("Ada Lovelace");
    expect(preview.location).toBe("London, UK");
    expect(preview.skills).toEqual(["React", "Node"]);
    expect(preview.experience?.[0]?.title).toBe("Engineer");
    expect(preview.experience?.[0]?.startDate).toBe("Jan 2020 – Present");
    expect(preview.education?.[0]?.school).toBe("Cambridge");
    expect(preview.certifications).toEqual(["AWS SA"]);
    expect(preview.profile?.targetRole).toBe("Staff Engineer");
  });

  it("returns empty preview when profile and content are missing", () => {
    const preview = buildResumePreviewFromSources(null, null, null);
    expect(preview.fullName).toBeNull();
    expect(preview.skills).toEqual([]);
    expect(preview.experience).toEqual([]);
  });
});
