import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import type { JdAtom, JdCoverageReport } from "@/lib/job-tracker/enhance/enhance-brief";
import { tokenizeJobText } from "@/lib/job-tracker/jd/keyword-extract";

function textContainsAtom(text: string, atom: JdAtom): boolean {
  const lower = text.toLowerCase();
  if (lower.includes(atom.label.toLowerCase())) return true;
  return atom.tokens.some((t) => lower.includes(t));
}

export function buildJdCoverageReport(input: {
  form: HubRefineryForm;
  atoms: JdAtom[];
  skills?: string[];
  summary?: string;
}): JdCoverageReport {
  const prime = refineryFormToPrimeResume(input.form);
  const skillsText = (input.skills ?? prime.skills ?? []).join(", ");
  const summaryText = input.summary ?? input.form.professionalSummary ?? "";
  const experienceText = (input.form.experience ?? [])
    .filter((e) => !e.hidden)
    .map((e) => `${e.title} ${e.company} ${e.bullets ?? ""}`)
    .join("\n");

  const tier1 = input.atoms.filter((a) => a.tier === 1);
  const coveredBySection = {
    skills: [] as string[],
    summary: [] as string[],
    experience: [] as string[],
  };
  const gaps: JdCoverageReport["gaps"] = [];

  for (const atom of tier1) {
    let covered = false;
    if (textContainsAtom(skillsText, atom)) {
      coveredBySection.skills.push(atom.label);
      covered = true;
    } else if (textContainsAtom(summaryText, atom)) {
      coveredBySection.summary.push(atom.label);
      covered = true;
    } else if (textContainsAtom(experienceText, atom)) {
      coveredBySection.experience.push(atom.label);
      covered = true;
    }

    if (!covered) {
      gaps.push({ atom, reason: "no_anchor" });
    }
  }

  const tier1Covered =
    coveredBySection.skills.length +
    coveredBySection.summary.length +
    coveredBySection.experience.length;
  const tier1Total = tier1.length;
  const coveragePercent =
    tier1Total === 0 ? 100 : Math.round((tier1Covered / tier1Total) * 100);

  return {
    tier1Total,
    tier1Covered,
    coveragePercent,
    coveredBySection,
    gaps,
  };
}

/** Quick check if atom tokens appear in a bullet string. */
export function atomMatchesBullet(bullet: string, atom: JdAtom): boolean {
  const tokens = tokenizeJobText(bullet);
  const set = new Set(tokens);
  return atom.tokens.some((t) => set.has(t.toLowerCase()));
}
