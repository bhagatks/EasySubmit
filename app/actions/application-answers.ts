"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import {
  deleteDashboardApplicationAnswer,
  listDashboardApplicationAnswers,
  updateDashboardApplicationAnswer,
} from "@/lib/extension/application-field-memory";
import {
  formatStoredAnswerDisplay,
  parseStoredAnswerEdit,
  storedAnswerIsEditable,
} from "@/lib/profile/application-answers-display";
import { logger } from "@/lib/logger";
import type { StoredAnswer } from "@/src/shared/extension/field-descriptor";

export type ApplicationAnswerSettingsItem = {
  id: string;
  label: string;
  platform: string;
  tenantHost: string | null;
  fieldType: string;
  answerDisplay: string;
  editable: boolean;
  lastUsedAt: string;
  confidence: number;
};

export type ListApplicationAnswersResult =
  | { success: true; answers: ApplicationAnswerSettingsItem[] }
  | { success: false; error: string };

export type MutateApplicationAnswerResult =
  | { success: true }
  | { success: false; error: string };

function toSettingsItem(row: Awaited<ReturnType<typeof listDashboardApplicationAnswers>>[number]) {
  return {
    id: row.id,
    label: row.label,
    platform: row.platform,
    tenantHost: row.tenantHost,
    fieldType: row.fieldType,
    answerDisplay: formatStoredAnswerDisplay(row.answer),
    editable: storedAnswerIsEditable(row.answer),
    lastUsedAt: row.lastUsedAt.toISOString(),
    confidence: row.confidence,
  };
}

export async function listApplicationAnswersForSettings(): Promise<ListApplicationAnswersResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: "Sign in to view application answers." };
  }

  logger.info({ userId, phase: "start" }, "application_answers.list");

  try {
    const rows = await listDashboardApplicationAnswers(userId);
    logger.info({ userId, count: rows.length, phase: "done" }, "application_answers.list");
    return { success: true, answers: rows.map(toSettingsItem) };
  } catch (error) {
    logger.error(
      {
        userId,
        phase: "fail",
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "application_answers.list",
    );
    return { success: false, error: "Could not load application answers." };
  }
}

export async function updateApplicationAnswerForSettings(
  answerId: string,
  rawValue: string,
): Promise<MutateApplicationAnswerResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: "Sign in to edit application answers." };
  }

  logger.info({ userId, answerId, phase: "start" }, "application_answers.update");

  try {
    const rows = await listDashboardApplicationAnswers(userId);
    const row = rows.find((item) => item.id === answerId);
    if (!row) {
      logger.warn({ userId, answerId, phase: "block", errorCode: "not_found" }, "application_answers.update");
      return { success: false, error: "Answer not found." };
    }

    if (!storedAnswerIsEditable(row.answer)) {
      logger.warn({ userId, answerId, phase: "block", errorCode: "not_editable" }, "application_answers.update");
      return { success: false, error: "This answer type cannot be edited here." };
    }

    const nextAnswer = parseStoredAnswerEdit(row.answer, rawValue);
    if (!nextAnswer) {
      logger.warn({ userId, answerId, phase: "block", errorCode: "invalid_value" }, "application_answers.update");
      return { success: false, error: "Enter a valid answer." };
    }

    const result = await updateDashboardApplicationAnswer(userId, answerId, nextAnswer);
    if (!result.updated) {
      return { success: false, error: "Answer not found." };
    }

    revalidatePath("/dashboard/settings");
    logger.info({ userId, answerId, phase: "done" }, "application_answers.update");
    return { success: true };
  } catch (error) {
    logger.error(
      {
        userId,
        answerId,
        phase: "fail",
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "application_answers.update",
    );
    return { success: false, error: "Could not save answer." };
  }
}

export async function deleteApplicationAnswerForSettings(
  answerId: string,
): Promise<MutateApplicationAnswerResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: "Sign in to delete application answers." };
  }

  logger.info({ userId, answerId, phase: "start" }, "application_answers.delete");

  try {
    const result = await deleteDashboardApplicationAnswer(userId, answerId);
    if (!result.deleted) {
      logger.warn({ userId, answerId, phase: "block", errorCode: "not_found" }, "application_answers.delete");
      return { success: false, error: "Answer not found." };
    }

    revalidatePath("/dashboard/settings");
    logger.info({ userId, answerId, phase: "done" }, "application_answers.delete");
    return { success: true };
  } catch (error) {
    logger.error(
      {
        userId,
        answerId,
        phase: "fail",
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "application_answers.delete",
    );
    return { success: false, error: "Could not delete answer." };
  }
}

export type { StoredAnswer };
