// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { evaluateApplicationConfirmation } from "@/src/shared/extension/confirmation-detect";

describe("evaluateApplicationConfirmation", () => {
  it("requires two of three signals", () => {
    const pendingDoc = document.implementation.createHTMLDocument("Apply");
    pendingDoc.body.innerHTML = "<main><form><button type='submit'>Send</button></form></main>";
    const notConfirmed = evaluateApplicationConfirmation(
      "workday",
      "https://acme.myworkdayjobs.com/job/eng/apply",
      pendingDoc,
    );
    expect(notConfirmed).toBe(false);

    const thanksDoc = document.implementation.createHTMLDocument("Thanks");
    thanksDoc.body.innerHTML = "<main>Thank you for applying!</main>";
    const confirmed = evaluateApplicationConfirmation(
      "workday",
      "https://acme.myworkdayjobs.com/job/eng/applied",
      thanksDoc,
    );
    expect(confirmed).toBe(true);
  });

  it("detects greenhouse confirmation urls with body copy", () => {
    const doc = document.implementation.createHTMLDocument("Confirmation");
    doc.body.textContent = "We received your application.";
    const result = evaluateApplicationConfirmation(
      "greenhouse",
      "https://boards.greenhouse.io/acme/jobs/1/confirmation",
      doc,
    );
    expect(result).toBe(true);
  });

  it("does not treat Workday job posting pages as confirmation", () => {
    const postingDoc = document.implementation.createHTMLDocument("Posting");
    postingDoc.body.innerHTML =
      "<main><p>Thank you for applying to our team.</p><button>Apply</button></main>";
    const result = evaluateApplicationConfirmation(
      "workday",
      "https://irhythmtech.wd5.myworkdayjobs.com/iRhythm/job/Remote---US/Sr-Manager--Software-Engineering_JR1346",
      postingDoc,
    );
    expect(result).toBe(false);
  });

  it("detects lever thanks pages", () => {
    const doc = document.implementation.createHTMLDocument("Thanks");
    doc.body.textContent = "Application submitted";
    const result = evaluateApplicationConfirmation(
      "lever",
      "https://jobs.lever.co/acme/role/thanks",
      doc,
    );
    expect(result).toBe(true);
  });
});
