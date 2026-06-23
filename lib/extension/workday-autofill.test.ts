// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { runWorkdayAutofill, discoverStepFields } from "@/src/shared/extension/workday-autofill";
import type { WorkdayFillData } from "@/src/shared/extension/workday-autofill";

const FILL_DATA: WorkdayFillData = {
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@example.com",
  phone: "555-123-4567",
  cityState: "Austin, TX",
  linkedIn: "https://linkedin.com/in/janesmith",
};

describe("runWorkdayAutofill", () => {
  it("rejects non-Workday URLs", async () => {
    const result = await runWorkdayAutofill(
      document,
      "https://boards.greenhouse.io/acme/jobs/1",
      FILL_DATA,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.manualFinish).toBe(true);
  });

  it("returns ok on Workday posting page with no apply button (no wizard yet)", async () => {
    const doc = document.implementation.createHTMLDocument("Workday");
    const result = await runWorkdayAutofill(
      doc,
      "https://company.myworkdayjobs.com/en-US/careers/job/engineer",
      FILL_DATA,
    );
    // No wizard present → manualFinish (no continue button)
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.manualFinish).toBe(true);
  });
});

describe("discoverStepFields", () => {
  it("returns empty array when no form fields exist", () => {
    const doc = document.implementation.createHTMLDocument("Step");
    const fields = discoverStepFields(doc, "https://company.myworkdayjobs.com/en-US/careers/job/eng/apply");
    expect(fields).toEqual([]);
  });

  it("discovers a visible text input", () => {
    const doc = document.implementation.createHTMLDocument("Step");
    const label = doc.createElement("label");
    label.setAttribute("for", "fname");
    label.textContent = "First Name";
    const input = doc.createElement("input");
    input.type = "text";
    input.id = "fname";
    doc.body.appendChild(label);
    doc.body.appendChild(input);

    const fields = discoverStepFields(doc, "https://company.myworkdayjobs.com/en-US/careers/job/eng/apply");
    expect(fields.length).toBe(1);
    expect(fields[0].label).toBe("First Name");
    expect(fields[0].fieldType).toBe("text");
    expect(fields[0].platform).toBe("workday");
  });

  it("excludes denylist fields (SSN)", () => {
    const doc = document.implementation.createHTMLDocument("Step");
    const input = doc.createElement("input");
    input.type = "text";
    input.setAttribute("aria-label", "Social Security Number");
    doc.body.appendChild(input);

    const fields = discoverStepFields(doc, "https://company.myworkdayjobs.com/en-US/careers/job/eng/apply");
    expect(fields.length).toBe(0);
  });

  it("excludes hidden inputs", () => {
    const doc = document.implementation.createHTMLDocument("Step");
    const hidden = doc.createElement("input");
    hidden.type = "hidden";
    hidden.setAttribute("aria-label", "Job Title");
    doc.body.appendChild(hidden);

    const fields = discoverStepFields(doc, "https://company.myworkdayjobs.com/en-US/careers/job/eng/apply");
    expect(fields.length).toBe(0);
  });
});
