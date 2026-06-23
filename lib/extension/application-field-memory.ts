import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  fieldSignature,
  optionsFingerprint,
  semanticKey,
  type FieldDescriptor,
  type StoredAnswer,
} from "@/src/shared/extension/field-descriptor";
import type { ApplicationAnswerCaptureEvent } from "@/src/shared/extension/field-capture-api";
import { isDenylistedApplicationField } from "@/src/shared/extension/field-denylist";

export { isDenylistedApplicationField } from "@/src/shared/extension/field-denylist";

export type ApplicationAnswerLookupRow = {
  answer: StoredAnswer;
  confidence: number;
  semanticKey: string;
};

function fieldOptionsHash(field: FieldDescriptor): string | null {
  return optionsFingerprint(field.options);
}

function confidenceForSource(source: ApplicationAnswerCaptureEvent["source"]): number {
  switch (source) {
    case "user":
      return 1;
    case "user_corrected":
      return 0.95;
    case "autofill_accepted":
    default:
      return 0.9;
  }
}

function mergeConfidence(
  existing: number,
  incoming: number,
  source: ApplicationAnswerCaptureEvent["source"],
): number {
  if (source === "user_corrected") {
    return Math.min(1, Math.max(existing, incoming));
  }
  return Math.min(1, Math.max(existing, incoming * 0.5 + existing * 0.5));
}

export async function captureApplicationAnswers(
  userId: string,
  events: ApplicationAnswerCaptureEvent[],
): Promise<{ upserted: number }> {
  let upserted = 0;
  const now = new Date();

  for (const event of events) {
    if (isDenylistedApplicationField(event.field.label)) continue;
    if (event.field.fieldType === "file") continue;

    const signature = fieldSignature(event.field);
    const semKey = semanticKey(event.field);
    const incomingConfidence = confidenceForSource(event.source);
    const answerJson = event.answer as Prisma.InputJsonValue;

    const existing = await prisma.userApplicationAnswer.findUnique({
      where: {
        userId_fieldSignature: {
          userId,
          fieldSignature: signature,
        },
      },
    });

    if (existing) {
      await prisma.userApplicationAnswer.update({
        where: { id: existing.id },
        data: {
          label: event.field.label,
          tenantHost: event.field.tenantHost,
          automationId: event.field.automationId,
          semanticKey: semKey,
          fieldType: event.field.fieldType,
          optionsHash: fieldOptionsHash(event.field),
          answer: answerJson,
          confidence: mergeConfidence(existing.confidence, incomingConfidence, event.source),
          hitCount: existing.hitCount + 1,
          correctCount:
            event.source === "user_corrected"
              ? existing.correctCount + 1
              : existing.correctCount,
          lastUsedAt: now,
        },
      });
    } else {
      await prisma.userApplicationAnswer.create({
        data: {
          userId,
          fieldSignature: signature,
          platform: event.field.platform,
          tenantHost: event.field.tenantHost,
          automationId: event.field.automationId,
          semanticKey: semKey,
          label: event.field.label,
          fieldType: event.field.fieldType,
          optionsHash: fieldOptionsHash(event.field),
          answer: answerJson,
          confidence: incomingConfidence,
          hitCount: 1,
          correctCount: event.source === "user_corrected" ? 1 : 0,
          lastUsedAt: now,
        },
      });
    }

    upserted++;
  }

  return { upserted };
}

export async function lookupApplicationAnswers(
  userId: string,
  params: {
    platform: string;
    tenantHost?: string | null;
  },
): Promise<Record<string, ApplicationAnswerLookupRow>> {
  const tenantHost = params.tenantHost?.trim() || null;

  const rows = await prisma.userApplicationAnswer.findMany({
    where: {
      userId,
      platform: params.platform,
      OR: tenantHost
        ? [{ tenantHost }, { tenantHost: null }]
        : [{ tenantHost: null }],
    },
    select: {
      fieldSignature: true,
      semanticKey: true,
      answer: true,
      confidence: true,
    },
  });

  const answers: Record<string, ApplicationAnswerLookupRow> = {};
  for (const row of rows) {
    answers[row.fieldSignature] = {
      answer: row.answer as StoredAnswer,
      confidence: row.confidence,
      semanticKey: row.semanticKey,
    };
  }
  return answers;
}
