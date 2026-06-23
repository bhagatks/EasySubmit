import {
  fieldSignature,
  type FieldCapturePayload,
  type FieldDescriptor,
  type StoredAnswer,
} from "./field-descriptor";

export type ApplicationAnswerCaptureSource = "user" | "autofill_accepted" | "user_corrected";

export type ApplicationAnswerCaptureEvent = {
  field: FieldDescriptor;
  answer: StoredAnswer;
  source: ApplicationAnswerCaptureSource;
  jobEntryId?: string;
};

/** Map Workday autofill {@link FieldCapturePayload} to capture API events. */
export function fieldCapturePayloadToEvents(
  payload: FieldCapturePayload,
  jobEntryId?: string,
): ApplicationAnswerCaptureEvent[] {
  const fieldBySignature = new Map(
    payload.fields.map((field) => [fieldSignature(field), field]),
  );

  const events: ApplicationAnswerCaptureEvent[] = [];
  for (const item of payload.answers) {
    const field = fieldBySignature.get(item.fieldSignature);
    if (!field) continue;
    events.push({
      field,
      answer: item.answer,
      source: item.source,
      ...(jobEntryId ? { jobEntryId } : {}),
    });
  }
  return events;
}
