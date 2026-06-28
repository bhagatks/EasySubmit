import { describe, expect, it } from "vitest";
import {
  emptyRefineryForm,
  toPrimeResumeData,
  toRefineryForm,
} from "@/lib/resume/refineryForm";
import type { StructuredResume } from "@/lib/resume/heuristicParser";

const PARSED: StructuredResume = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "+1 415 555 0100",
  location: "San Francisco, CA",
  linkedIn: null,
  summary: "Engineer",
  experience: [
    {
      role: "Engineer",
      company: "Acme",
      date: "2020 – Present",
      description: ["Built APIs"],
    },
  ],
  education: [{ school: "UC Berkeley", degree: "B.S.", date: "2016" }],
  skills: ["TypeScript", "React"],
  certifications: [],
  projects: [],
  languages: [],
};

describe("refineryForm", () => {
  it("toRefineryForm maps parsed resume with hidden defaults", () => {
    const form = toRefineryForm(PARSED, "Senior Engineer");
    expect(form.name).toBe("Jane Doe");
    expect(form.jobTitle).toBe("Senior Engineer");
    expect(form.experience[0].hidden).toBe(false);
    expect(form.skills).toEqual(["TypeScript", "React"]);
  });

  it("toPrimeResumeData omits hidden experience", () => {
    const form = toRefineryForm(PARSED);
    form.experience[0].hidden = true;
    const prime = toPrimeResumeData(form);
    expect(prime.experience).toHaveLength(0);
  });

  it("emptyRefineryForm returns blank structure", () => {
    const form = emptyRefineryForm("Target Role");
    expect(form.jobTitle).toBe("Target Role");
    expect(form.experience).toEqual([]);
    expect(form.skills).toEqual([]);
  });
});
