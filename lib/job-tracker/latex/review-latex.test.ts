import { describe, expect, it } from "vitest";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";
import { buildCoverLetterContext } from "@/lib/job-tracker/cover-letter";
import {
  compileLatexPreview,
  generateCoverLatex,
  generateResumeLatex,
  validateLatexSource,
} from "@/lib/job-tracker/latex/review-latex";

describe("generateResumeLatex", () => {
  it("wraps merged form in a document environment", () => {
    const form = {
      ...emptyHubRefineryForm(),
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      professionalSummary: "Builder of algorithms.",
      skillsText: "TypeScript, LaTeX",
      experience: [
        {
          id: "1",
          hidden: false,
          title: "Engineer",
          company: "Acme",
          location: "",
          startMonth: "",
          startYear: "",
          endMonth: "",
          endYear: "",
          bullets: "- Shipped features\n- Mentored interns",
        },
      ],
    };

    const latex = generateResumeLatex(form, "Senior Engineer");
    expect(latex).toContain("\\begin{document}");
    expect(latex).toContain("\\end{document}");
    expect(latex).toContain("Ada Lovelace");
    expect(latex).toContain("Senior Engineer");
    expect(latex).toContain("Shipped features");
  });

  it("escapes TeX special characters in names", () => {
    const form = {
      ...emptyHubRefineryForm(),
      firstName: "A&B",
      lastName: "100%",
    };
    const latex = generateResumeLatex(form, "Role");
    expect(latex).toContain("\\&");
    expect(latex).toContain("\\%");
  });
});

describe("generateCoverLatex", () => {
  it("embeds escaped plain cover text", () => {
    const ctx = buildCoverLetterContext({
      firstName: "Ada",
      lastName: "Lovelace",
      jobTitle: "Engineer",
      company: "Acme",
      body: "Dear team,\n\nI am interested.",
    });
    const latex = generateCoverLatex(ctx);
    expect(latex).toContain("\\begin{document}");
    expect(latex).toContain("Dear team");
  });
});

describe("validateLatexSource", () => {
  it("rejects empty source", () => {
    expect(validateLatexSource("   ")).toEqual({
      ok: false,
      errors: ["LaTeX source is empty."],
    });
  });

  it("rejects missing begin or end", () => {
    const onlyBegin = validateLatexSource("\\begin{document}\nhello");
    expect(onlyBegin.ok).toBe(false);
    if (!onlyBegin.ok) {
      expect(onlyBegin.errors).toContain("Missing \\end{document}.");
    }
  });

  it("rejects mismatched begin/end counts", () => {
    const result = validateLatexSource(
      "\\begin{document}\n\\end{document}\n\\end{document}",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain(
        "\\begin{document} and \\end{document} counts do not match.",
      );
    }
  });

  it("accepts well-formed minimal document", () => {
    expect(validateLatexSource("\\begin{document}\nHi\n\\end{document}")).toEqual({
      ok: true,
    });
  });
});

describe("compileLatexPreview", () => {
  it("returns validation errors without preview", () => {
    const result = compileLatexPreview({
      latex: "broken",
      previewHtml: "<p>ignored</p>",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("passes through HTML preview when valid", () => {
    const result = compileLatexPreview({
      latex: "\\begin{document}\n\\end{document}",
      previewHtml: "<article>Preview</article>",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.previewHtml).toBe("<article>Preview</article>");
      expect(result.validatedAt).toMatch(/^\d{4}-/);
    }
  });
});
