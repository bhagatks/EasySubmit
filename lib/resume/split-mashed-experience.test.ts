import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import {
  findEmbeddedExperienceHeaderInBullet,
  splitMashedExperienceInForm,
} from "@/lib/resume/split-mashed-experience";

describe("split-mashed-experience", () => {
  it("detects embedded CVS header inside a bullet", () => {
    const bullet =
      "Achieved 99% crash-free mobile apps and optimized startup and load performance. CVS Health Sep2014–Dec2023 Director | Engineering Manager";

    const found = findEmbeddedExperienceHeaderInBullet(bullet);
    expect(found).toMatchObject({
      trimmedBullet:
        "Achieved 99% crash-free mobile apps and optimized startup and load performance",
      company: "CVS Health",
      title: "Director | Engineering Manager",
    });
    expect(found?.dateRange).toContain("2014");
  });

  it("splits mashed experience into a new role entry", () => {
    const form = {
      ...emptyHubRefineryForm(),
      experience: [
        {
          id: "exp-0",
          title: "Head of Engineering",
          company: "7-Eleven",
          location: "",
          startMonth: "Jan",
          startYear: "2024",
          endMonth: "",
          endYear: "Present",
          bullets: [
            "Led platform delivery",
            "Achieved 99% crash-free mobile apps and optimized startup and load performance. CVS Health Sep2014–Dec2023 Director | Engineering Manager",
            "Delivered CVS COVID Scheduler project",
          ].join("\n"),
          hidden: false,
        },
      ],
    };

    const split = splitMashedExperienceInForm(form);
    expect(split.experience).toHaveLength(2);
    expect(split.experience[0]?.bullets).toContain("Achieved 99% crash-free");
    expect(split.experience[0]?.bullets).not.toContain("CVS Health");
    expect(split.experience[1]).toMatchObject({
      company: "CVS Health",
      title: "Director | Engineering Manager",
    });
    expect(split.experience[1]?.bullets).toContain("Delivered CVS COVID Scheduler project");
  });
});
