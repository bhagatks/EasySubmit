/**
 * Field resolution ladder for Workday autofill.
 * Implements APPLICATION_FIELD_MEMORY.md resolution order:
 *   1. Exact fieldSignature + same tenantHost (server lookup)
 *   2. Same platform + automationId (client-side from lookup map)
 *   3. semanticKey match (server lookup)
 *   4. Local answer-vault by normalized label
 *   5. applicationProfile JSONB (work auth, EEO, salary, address)
 *   6. Resume map (name / email / phone / city / linkedIn / work-auth)
 *   7. Miss
 */

import { fieldSignature, semanticKey, type FieldDescriptor, type StoredAnswer } from "./field-descriptor";
import { isDenylistedApplicationField } from "./field-denylist";
import { vaultGet } from "./answer-vault";
import type { ApplicationProfile } from "@/lib/profile/application-profile";
import { resolveFromApplicationProfile } from "./application-profile-resolve";

export type WorkdayFillData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cityState?: string | null;
  linkedIn?: string | null;
};

// ── Confidence thresholds ─────────────────────────────────────────────────────

export const CONFIDENCE_AUTO_FILL = 0.85;
export const CONFIDENCE_REVIEW = 0.6;

export type FillConfidence = "auto" | "review" | "miss";

export function confidenceGate(confidence: number): FillConfidence {
  if (confidence >= CONFIDENCE_AUTO_FILL) return "auto";
  if (confidence >= CONFIDENCE_REVIEW) return "review";
  return "miss";
}

// ── Server lookup map shape (from GET /api/extension/application-answers) ─────

export type ServerAnswerRow = {
  answer: StoredAnswer;
  confidence: number;
  semanticKey: string;
  /** Not in v1 API response — gap noted; resolved client-side via automationId index */
  automationId?: string | null;
};

export type ServerLookupMap = Record<string, ServerAnswerRow>;

// ── StoredAnswer → fill string ────────────────────────────────────────────────

export function storedAnswerToString(answer: StoredAnswer): string | null {
  switch (answer.kind) {
    case "text":
      return answer.value || null;
    case "boolean":
      return answer.value ? "yes" : "no";
    case "option":
      return answer.optionLabel ?? answer.value ?? null;
    case "file_ref":
      // v1: skip — no byte upload
      return null;
  }
}

// ── Resume map ────────────────────────────────────────────────────────────────

export function resolveFromResume(label: string, data: WorkdayFillData): string | null {
  const l = label.toLowerCase();
  if (/first\s*name|given\s*name/.test(l)) return data.firstName || null;
  if (/last\s*name|family\s*name|surname/.test(l)) return data.lastName || null;
  if (/\bemail\b|e-mail/.test(l)) return data.email || null;
  if (/\bphone\b|\bmobile\b|\bcell\b/.test(l)) return data.phone || null;
  if (/\bcity\b|\blocation\b|address/.test(l) && data.cityState) return data.cityState;
  if (/linkedin/.test(l) && data.linkedIn) return data.linkedIn;
  return null;
}

// ── Resolution result ─────────────────────────────────────────────────────────

export type ResolvedField = {
  value: string;
  confidence: number;
  gate: FillConfidence;
  source: "server_exact" | "server_automation_id" | "server_semantic" | "vault" | "application_profile" | "resume";
};

// ── Resolution ladder ─────────────────────────────────────────────────────────

/**
 * Resolve a fill value for a single field using the full 5-step ladder.
 * Returns null for denylist fields and misses.
 */
export async function resolveField(
  descriptor: FieldDescriptor,
  serverMap: ServerLookupMap,
  fillData: WorkdayFillData,
  applicationProfile?: ApplicationProfile | null,
): Promise<ResolvedField | null> {
  if (isDenylistedApplicationField(descriptor.label)) return null;
  if (descriptor.fieldType === "file") return null;

  const sig = fieldSignature(descriptor);
  const semKey = semanticKey(descriptor);

  // 1. Exact fieldSignature (includes tenantHost in hash)
  const exactMatch = serverMap[sig];
  if (exactMatch) {
    const value = storedAnswerToString(exactMatch.answer);
    if (value) {
      return { value, confidence: exactMatch.confidence, gate: confidenceGate(exactMatch.confidence), source: "server_exact" };
    }
  }

  // 2. Same automationId (cross-tenant on Workday)
  // API v1 doesn't expose automationId in lookup rows — match client-side if automationId
  // is present on the descriptor and we find a row with same semanticKey + non-null automationId.
  // Gap noted: ask Cursor to add automationId to lookup response for step 2 exact match.
  if (descriptor.automationId) {
    for (const row of Object.values(serverMap)) {
      if (row.automationId && row.automationId === descriptor.automationId) {
        const value = storedAnswerToString(row.answer);
        if (value) {
          return { value, confidence: row.confidence * 0.95, gate: confidenceGate(row.confidence * 0.95), source: "server_automation_id" };
        }
      }
    }
  }

  // 3. semanticKey match
  const semanticMatch = Object.values(serverMap).find((r) => r.semanticKey === semKey);
  if (semanticMatch) {
    const value = storedAnswerToString(semanticMatch.answer);
    if (value) {
      const confidence = semanticMatch.confidence * 0.9;
      return { value, confidence, gate: confidenceGate(confidence), source: "server_semantic" };
    }
  }

  // 4. Local answer-vault by normalized label
  const vaultValue = await vaultGet(descriptor.label);
  if (vaultValue) {
    return { value: vaultValue, confidence: 0.8, gate: confidenceGate(0.8), source: "vault" };
  }

  // 5. applicationProfile JSONB
  const profileValue = resolveFromApplicationProfile(
    descriptor.label,
    descriptor.fieldType,
    applicationProfile,
  );
  if (profileValue) {
    return {
      value: profileValue,
      confidence: 0.9,
      gate: "auto",
      source: "application_profile",
    };
  }

  // 6. Resume map
  const resumeValue = resolveFromResume(descriptor.label, fillData);
  if (resumeValue) {
    return { value: resumeValue, confidence: 0.95, gate: confidenceGate(0.95), source: "resume" };
  }

  return null;
}

/**
 * Resolve all fields in a step in parallel.
 * Returns a map from fieldSignature → ResolvedField for filled fields only.
 */
export async function resolveStepFields(
  descriptors: FieldDescriptor[],
  serverMap: ServerLookupMap,
  fillData: WorkdayFillData,
  applicationProfile?: ApplicationProfile | null,
): Promise<Map<string, ResolvedField>> {
  const results = await Promise.all(
    descriptors.map(async (d) => {
      const resolved = await resolveField(d, serverMap, fillData, applicationProfile);
      return [fieldSignature(d), resolved] as const;
    }),
  );
  const map = new Map<string, ResolvedField>();
  for (const [sig, resolved] of results) {
    if (resolved) map.set(sig, resolved);
  }
  return map;
}
