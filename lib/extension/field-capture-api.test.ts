import { describe, expect, it } from "vitest";
import { fieldCapturePayloadToEvents } from "@/src/shared/extension/field-capture-api";
import {
  FIELD_CAPTURE_MESSAGE,
  fieldSignature,
  type FieldCapturePayload,
} from "@/src/shared/extension/field-descriptor";

describe("fieldCapturePayloadToEvents", () => {
  const field = {
    platform: "workday" as const,
    tenantHost: "acme.wd5.myworkdayjobs.com",
    stepFingerprint: "apply__contact",
    automationId: "name",
    label: "First Name",
    fieldType: "text" as const,
    required: true,
  };

  it("maps answers to capture events by fieldSignature", () => {
    const signature = fieldSignature(field);
    const payload: FieldCapturePayload = {
      type: FIELD_CAPTURE_MESSAGE,
      tenantHost: field.tenantHost,
      stepFingerprint: field.stepFingerprint,
      fields: [field],
      answers: [
        {
          fieldSignature: signature,
          answer: { kind: "text", value: "Ada" },
          source: "autofill_accepted",
        },
      ],
    };

    expect(fieldCapturePayloadToEvents(payload, "job_123")).toEqual([
      {
        field,
        answer: { kind: "text", value: "Ada" },
        source: "autofill_accepted",
        jobEntryId: "job_123",
      },
    ]);
  });

  it("skips answers with unknown signatures", () => {
    const payload: FieldCapturePayload = {
      type: FIELD_CAPTURE_MESSAGE,
      tenantHost: field.tenantHost,
      stepFingerprint: field.stepFingerprint,
      fields: [field],
      answers: [
        {
          fieldSignature: "deadbeef",
          answer: { kind: "text", value: "Ada" },
          source: "user",
        },
      ],
    };

    expect(fieldCapturePayloadToEvents(payload)).toEqual([]);
  });
});
