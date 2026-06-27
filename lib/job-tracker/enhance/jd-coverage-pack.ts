import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { JdAtom, ResumeEnhanceBrief } from "@/lib/job-tracker/enhance/enhance-brief";
import { bestAnchorForAtom, scoreBulletAnchors } from "@/lib/job-tracker/enhance/score-bullet-anchors";
import { normalizeBulletOpeningVerb } from "@/lib/resume/resume-bullet-verbs";
import { cleanBulletLine } from "@/src/lib/ai/engine/format-rules";

const MAX_ATOMS_PER_BULLET = 3;

function weavePhraseIntoBullet(bullet: string, atom: JdAtom): string {
  const trimmed = bullet.trim().replace(/^[-•*]\s*/, "");
  const label = atom.label;
  const lower = trimmed.toLowerCase();
  if (lower.includes(label.toLowerCase())) return trimmed;

  const clause = label.charAt(0).toLowerCase() + label.slice(1);
  if (trimmed.endsWith(".")) {
    return `${trimmed.slice(0, -1)}, aligning with ${clause}.`;
  }
  return `${trimmed}, incorporating ${clause}.`;
}

export function weaveCompoundBullet(
  bullet: string,
  atoms: JdAtom[],
): string {
  let result = bullet.trim().replace(/^[-•*]\s*/, "");
  for (const atom of atoms.slice(0, MAX_ATOMS_PER_BULLET)) {
    result = weavePhraseIntoBullet(result, atom);
  }
  return normalizeBulletOpeningVerb(cleanBulletLine(result));
}

export function packJdCoverage(
  form: HubRefineryForm,
  brief: ResumeEnhanceBrief,
): Array<{ expIdx: number; bulletIdx: number; atomIds: string[] }> {
  if (!brief.jd) return [];

  const gaps = brief.jd.coverageBefore.gaps.filter((g) => g.atom.tier === 1);
  if (gaps.length === 0) return [];

  const anchorScores = brief.jd.anchorScores.length
    ? brief.jd.anchorScores
    : scoreBulletAnchors(form, brief.jd.atoms);

  const atomById = new Map(brief.jd.atoms.map((a) => [a.id, a]));
  const assignments: Array<{ expIdx: number; bulletIdx: number; atomIds: string[] }> = [];
  const covered = new Set<string>();

  const uncovered = gaps.map((g) => g.atom.id);

  for (const atomId of uncovered) {
    if (covered.has(atomId)) continue;
    const anchor = bestAnchorForAtom(atomId, anchorScores);
    if (!anchor) continue;

    let slot = assignments.find(
      (a) => a.expIdx === anchor.expIdx && a.bulletIdx === anchor.bulletIdx,
    );
    if (!slot) {
      slot = { expIdx: anchor.expIdx, bulletIdx: anchor.bulletIdx, atomIds: [] };
      assignments.push(slot);
    }
    if (slot.atomIds.length >= MAX_ATOMS_PER_BULLET) continue;
    slot.atomIds.push(atomId);
    covered.add(atomId);
  }

  return assignments.filter((a) => a.atomIds.length > 0 && atomById.has(a.atomIds[0]!));
}

export function applyJdCoverageWeave(
  form: HubRefineryForm,
  brief: ResumeEnhanceBrief,
): { form: HubRefineryForm; bulletsWoven: number } {
  if (!brief.jd) return { form, bulletsWoven: 0 };

  const assignments = packJdCoverage(form, brief);
  if (assignments.length === 0) return { form, bulletsWoven: 0 };

  const atomById = new Map(brief.jd.atoms.map((a) => [a.id, a]));
  let bulletsWoven = 0;

  const experience = (form.experience ?? []).map((exp, expIdx) => {
    const roleAssignments = assignments.filter((a) => a.expIdx === expIdx);
    if (roleAssignments.length === 0) return exp;

    const rawBullets = (exp.bullets ?? "")
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);

    for (const assign of roleAssignments) {
      const bullet = rawBullets[assign.bulletIdx];
      if (!bullet) continue;
      const atoms = assign.atomIds
        .map((id) => atomById.get(id))
        .filter((a): a is JdAtom => Boolean(a));
      if (atoms.length === 0) continue;
      rawBullets[assign.bulletIdx] = weaveCompoundBullet(bullet, atoms);
      bulletsWoven++;
    }

    return { ...exp, bullets: rawBullets.join("\n") };
  });

  return { form: { ...form, experience }, bulletsWoven };
}
