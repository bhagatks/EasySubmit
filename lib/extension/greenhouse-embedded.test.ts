import { describe, expect, it } from "vitest";
import {
  isGreenhouseEmbeddedJobUrl,
  parseGreenhouseJobPostId,
} from "@/src/shared/extension/greenhouse-helpers";
import {
  hasStrongJobUrlSignal,
  isJobPostingPage,
  parseCompanyFromJobHost,
} from "@/src/shared/extension/job-url-parse";

const SUVODA_JOB =
  "https://www.suvoda.com/careers/job-openings?gh_jid=8521135002";

describe("greenhouse embedded job URLs", () => {
  it("parses gh_jid from embedded career-site URLs", () => {
    expect(parseGreenhouseJobPostId(SUVODA_JOB)).toBe("8521135002");
    expect(isGreenhouseEmbeddedJobUrl(SUVODA_JOB)).toBe(true);
  });

  it("treats gh_jid URLs as strong job signals and postings", () => {
    expect(hasStrongJobUrlSignal(SUVODA_JOB)).toBe(true);
    expect(isJobPostingPage(SUVODA_JOB)).toBe(true);
  });

  it("does not treat the listings page without gh_jid as a posting", () => {
    expect(isGreenhouseEmbeddedJobUrl("https://www.suvoda.com/careers/job-openings")).toBe(
      false,
    );
  });

  it("resolves Suvoda company label from host", () => {
    expect(parseCompanyFromJobHost(SUVODA_JOB)).toBe("Suvoda");
  });

  it("derives company from corporate apex domain on embedded Greenhouse URLs", () => {
    expect(
      parseCompanyFromJobHost("https://www.acmecorp.com/careers?gh_jid=123456"),
    ).toBe("Acmecorp");
  });

  it("does not invent company on native Greenhouse board URLs", () => {
    expect(parseCompanyFromJobHost("https://boards.greenhouse.io/acme/jobs/12345")).toBeNull();
  });
});
