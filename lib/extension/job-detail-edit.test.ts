import { describe, expect, it } from "vitest";
import {
  applyJobDetailDraftToMetadata,
  buildJobDetailDraft,
  buildJobDetailDraftFromTrackerEntry,
  jobDetailDraftsEqual,
  jobDetailDraftToFieldsPayload,
  normalizeJobDetailDraft,
  readJsonLdFieldsFromMetadata,
} from "@/src/shared/extension/job-detail-edit";

describe("job-detail-edit", () => {
  it("builds and compares drafts", () => {
    const draft = buildJobDetailDraft({
      title: "Engineer",
      company: "Acme",
      location: "Remote",
      salaryText: "$120k",
      description: "Build things",
      platform: "greenhouse",
      jsonLdFields: { qualifications: "5+ years" },
    });

    expect(normalizeJobDetailDraft({ ...draft, company: " Acme " }).company).toBe("Acme");
    expect(jobDetailDraftsEqual(draft, { ...draft })).toBe(true);
    expect(jobDetailDraftsEqual(draft, { ...draft, location: "NYC" })).toBe(false);
  });

  it("applies draft to scraped metadata", () => {
    const metadata = applyJobDetailDraftToMetadata(
      {
        title: "Old",
        company: null,
        location: null,
        salaryText: null,
        description: null,
        platform: "generic",
        confidence: 0.5,
      },
      buildJobDetailDraft({
        title: "New title",
        company: "Acme",
        location: "Remote",
        salaryText: null,
        description: "Updated JD",
        platform: "linkedin",
        jsonLdFields: { incentives: "401k" },
      }),
    );

    expect(metadata.title).toBe("New title");
    expect(metadata.company).toBe("Acme");
    expect(metadata.platform).toBe("linkedin");
    expect(metadata.jsonLdFields?.incentives).toBe("401k");
  });

  it("maps draft to API payload", () => {
    const payload = jobDetailDraftToFieldsPayload(
      buildJobDetailDraft({
        title: "Engineer",
        company: "Acme",
        location: "",
        salaryText: "",
        description: "Long enough description",
        platform: "indeed",
        jsonLdFields: { responsibilities: "Ship code" },
      }),
    );

    expect(payload.title).toBe("Engineer");
    expect(payload.location).toBeNull();
    expect(payload.jsonLdFields?.responsibilities).toBe("Ship code");
  });

  it("reads jsonLd from tracker metadata", () => {
    const draft = buildJobDetailDraftFromTrackerEntry({
      title: "PM",
      company: "Acme",
      location: "Remote",
      salaryText: null,
      description: "Desc",
      platform: "greenhouse",
      metadata: { jsonLdFields: { qualifications: "MBA" } },
    });
    expect(draft.qualifications).toBe("MBA");
    expect(readJsonLdFieldsFromMetadata({ jsonLdFields: { incentives: "PTO" } })?.incentives).toBe(
      "PTO",
    );
  });

  it("all JSON-LD fields cleared → payload includes empty jsonLdFields object", () => {
    const draft = buildJobDetailDraft({
      title: "Engineer",
      company: "Acme",
      location: "Remote",
      salaryText: null,
      description: "A long enough description for the job",
      platform: "generic",
      jsonLdFields: undefined,
    });
    expect(draft.qualifications).toBe("");
    expect(draft.responsibilities).toBe("");
    expect(draft.incentives).toBe("");

    const payload = jobDetailDraftToFieldsPayload(draft);
    // Empty object signals "clear all" to service layer — must not be undefined
    expect(payload.jsonLdFields).toBeDefined();
    expect(payload.jsonLdFields).toEqual({});
  });

  it("partial JSON-LD clear keeps remaining fields", () => {
    const draft = buildJobDetailDraft({
      title: "Engineer",
      company: "Acme",
      location: "Remote",
      salaryText: null,
      description: "A long enough description for the job",
      platform: "generic",
      jsonLdFields: { qualifications: "5+ years", responsibilities: "Ship code" },
    });
    const cleared = { ...draft, responsibilities: "" };
    const payload = jobDetailDraftToFieldsPayload(cleared);
    expect(payload.jsonLdFields?.qualifications).toBe("5+ years");
    expect(payload.jsonLdFields?.responsibilities).toBeUndefined();
  });
});
