import { describe, expect, it } from "vitest";
import { extractResumeContact } from "@/lib/resume/extractContact";

describe("extractResumeContact", () => {
  it("extracts email, phone, linkedin, and github", () => {
    const text = `
Jane Doe
jane@example.com | (415) 555-0100
linkedin.com/in/janedoe
github.com/janedoe
`;
    const { essentials, urls } = extractResumeContact(text);
    expect(essentials.email).toBe("jane@example.com");
    expect(essentials.phone).toMatch(/415/);
    expect(urls.linkedin).toContain("linkedin.com/in/janedoe");
    expect(urls.github).toBe("https://github.com/janedoe");
  });

  it("ignores reserved github paths", () => {
    const { urls } = extractResumeContact("Visit github.com/pricing for details");
    expect(urls.github).toBeNull();
  });
});
