import type { NextRequest } from "next/server";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { captureApplicationAnswers } from "@/lib/extension/application-field-memory";
import type { ApplicationAnswerCaptureEvent } from "@/src/shared/extension/field-capture-api";
import type { FieldDescriptor, StoredAnswer } from "@/src/shared/extension/field-descriptor";

const CAPTURE_SOURCES = new Set(["user", "autofill_accepted", "user_corrected"]);

function isFieldDescriptor(value: unknown): value is FieldDescriptor {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.platform === "string" &&
    typeof record.tenantHost === "string" &&
    typeof record.stepFingerprint === "string" &&
    typeof record.label === "string" &&
    typeof record.fieldType === "string" &&
    typeof record.required === "boolean"
  );
}

function isStoredAnswer(value: unknown): value is StoredAnswer {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.kind === "string";
}

function parseCaptureEvents(body: unknown): ApplicationAnswerCaptureEvent[] | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.events)) return null;

  const events: ApplicationAnswerCaptureEvent[] = [];
  for (const item of record.events) {
    if (!item || typeof item !== "object") return null;
    const event = item as Record<string, unknown>;
    if (!isFieldDescriptor(event.field) || !isStoredAnswer(event.answer)) return null;
    if (typeof event.source !== "string" || !CAPTURE_SOURCES.has(event.source)) return null;

    events.push({
      field: event.field,
      answer: event.answer,
      source: event.source as ApplicationAnswerCaptureEvent["source"],
      ...(typeof event.jobEntryId === "string" && event.jobEntryId.trim()
        ? { jobEntryId: event.jobEntryId.trim() }
        : {}),
    });
  }

  return events;
}

export async function POST(request: NextRequest) {
  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const events = parseCaptureEvents(body);
  if (!events) {
    return Response.json({ success: false, error: "Invalid capture events" }, { status: 400 });
  }

  if (events.length === 0) {
    return Response.json({ success: true, upserted: 0 });
  }

  const result = await captureApplicationAnswers(userId, events);
  return Response.json({ success: true, upserted: result.upserted });
}
