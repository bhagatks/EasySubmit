import { describe, expect, it } from "vitest";
import { runWorkdayAutofillStub } from "@shared/extension/workday-autofill-stub";

describe("runWorkdayAutofillStub", () => {
  it("rejects non-Workday URLs", async () => {
    const result = await runWorkdayAutofillStub(document, "https://boards.greenhouse.io/acme/jobs/1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.manualFinish).toBe(true);
    }
  });

  it("returns ok on Workday posting pages", async () => {
    const doc = document.implementation.createHTMLDocument("Workday");
    const result = await runWorkdayAutofillStub(
      doc,
      "https://company.myworkdayjobs.com/en-US/careers/job/engineer",
    );
    expect(result.ok).toBe(true);
  });
});
