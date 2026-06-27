import type { EnhancePlan } from "@/lib/job-tracker/enhance/enhance-plan";

export function buildBaselineChangeSummary(input: {
  plan: EnhancePlan;
  skillsAdded: string[];
  bulletsRewritten: number;
  bulletsWoven: number;
  bulletsTrimmed: number;
  summaryRewritten: boolean;
}): string {
  const summaryParts: string[] = [];

  if (input.summaryRewritten) {
    summaryParts.push("Summary rewritten to 4-sentence standard");
  } else if (input.plan.summaryWarnings.length > 0) {
    summaryParts.push(...input.plan.summaryWarnings);
  }

  if (input.skillsAdded.length > 0) {
    summaryParts.push(
      `Added ${input.skillsAdded.length} skill${input.skillsAdded.length > 1 ? "s" : ""} (${input.skillsAdded.slice(0, 3).join(", ")}${input.skillsAdded.length > 3 ? "…" : ""})`,
    );
  }

  summaryParts.push(...input.plan.skillsWarnings);

  if (input.bulletsRewritten > 0) {
    summaryParts.push(
      `Strengthened ${input.bulletsRewritten} weak bullet${input.bulletsRewritten > 1 ? "s" : ""}`,
    );
  }

  if (input.bulletsWoven > 0) {
    summaryParts.push(
      `Wove ${input.bulletsWoven} JD keyword${input.bulletsWoven > 1 ? "s" : ""} into experience bullets`,
    );
  }

  if (input.bulletsTrimmed > 0) {
    summaryParts.push(
      `Trimmed ${input.bulletsTrimmed} bullet${input.bulletsTrimmed > 1 ? "s" : ""} for page budget`,
    );
  }

  if (input.plan.structuralWarnings.length > 0) {
    summaryParts.push(
      `${input.plan.structuralWarnings.length} structural issue${input.plan.structuralWarnings.length > 1 ? "s" : ""} — review ATS tab`,
    );
  }

  if (summaryParts.length === 0) {
    return "Resume reviewed — baseline enhancements applied.";
  }

  return summaryParts.join(". ") + ".";
}
