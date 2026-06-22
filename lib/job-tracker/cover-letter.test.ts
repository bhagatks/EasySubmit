import { describe, expect, it } from "vitest";
import {
  buildCoverLetterContext,
  buildCoverLetterDateLabel,
  buildCoverLetterHtml,
  buildCoverLetterPlainText,
  coverLetterDisplayName,
} from "@/lib/job-tracker/cover-letter";

describe("buildCoverLetterContext", () => {
  it("normalizes blanks and defaults company", () => {
    const ctx = buildCoverLetterContext({
      firstName: "  Ada ",
      lastName: null,
      email: "ada@example.com",
      phone: "",
      company: null,
      jobTitle: " Engineer ",
      body: "  Hello ",
      now: new Date("2026-06-22T12:00:00Z"),
    });

    expect(ctx.firstName).toBe("Ada");
    expect(ctx.company).toBe("Hiring team");
    expect(ctx.jobTitle).toBe("Engineer");
    expect(ctx.body).toBe("Hello");
    expect(ctx.dateLabel).toBe(buildCoverLetterDateLabel(new Date("2026-06-22T12:00:00Z")));
  });
});

describe("coverLetterDisplayName", () => {
  it("falls back to Applicant when name missing", () => {
    expect(
      coverLetterDisplayName(
        buildCoverLetterContext({ jobTitle: "Role", firstName: "", lastName: "" }),
      ),
    ).toBe("Applicant");
  });
});

describe("buildCoverLetterPlainText", () => {
  it("includes letterhead and body", () => {
    const ctx = buildCoverLetterContext({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "555-0100",
      company: "Acme",
      jobTitle: "Engineer",
      body: "I am excited to apply.",
      now: new Date("2026-01-15T12:00:00Z"),
    });

    const text = buildCoverLetterPlainText(ctx);
    expect(text).toContain("Ada Lovelace");
    expect(text).toContain("ada@example.com");
    expect(text).toContain("Acme");
    expect(text).toContain("Re: Engineer");
    expect(text).toContain("I am excited to apply.");
  });
});

describe("buildCoverLetterHtml", () => {
  it("escapes HTML in user content", () => {
    const ctx = buildCoverLetterContext({
      jobTitle: "Engineer",
      company: "<script>alert(1)</script>",
      body: "Love <b>coding</b> & teams",
    });

    const html = buildCoverLetterHtml(ctx);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Love &lt;b&gt;coding&lt;/b&gt; &amp; teams");
  });

  it("includes toolbar spacer and empty state when body is blank", () => {
    const html = buildCoverLetterHtml(buildCoverLetterContext({ jobTitle: "Engineer", body: "" }));

    expect(html).toContain('class="toolbar-spacer"');
    expect(html).toContain("No cover letter yet");
  });

  it("omits toolbar spacer for export HTML", () => {
    const html = buildCoverLetterHtml(
      buildCoverLetterContext({ jobTitle: "Engineer", body: "Hello team." }),
      { includeToolbarSpacer: false },
    );

    expect(html).not.toContain('class="toolbar-spacer"');
    expect(html).toContain("Hello team.");
  });
});
