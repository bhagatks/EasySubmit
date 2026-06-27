import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { JdAtom } from "@/lib/job-tracker/enhance/enhance-brief";
import { tokenizeJobText } from "@/lib/job-tracker/jd/keyword-extract";

const DEFAULT_THRESHOLD = 0.25;

function tokenOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let hits = 0;
  for (const t of a) {
    if (setB.has(t)) hits++;
  }
  return hits / Math.max(a.length, 1);
}

export function scoreBulletAnchors(
  form: HubRefineryForm,
  atoms: JdAtom[],
  threshold = DEFAULT_THRESHOLD,
): Array<{ atomId: string; expIdx: number; bulletIdx: number; score: number }> {
  const scores: Array<{ atomId: string; expIdx: number; bulletIdx: number; score: number }> = [];

  for (const atom of atoms) {
    const atomTokens = atom.tokens.map((t) => t.toLowerCase());

    (form.experience ?? []).forEach((exp, expIdx) => {
      if (exp.hidden) return;
      const contextTokens = tokenizeJobText(
        `${exp.title ?? ""} ${exp.company ?? ""}`,
      );
      const bullets = (exp.bullets ?? "")
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean);

      bullets.forEach((bullet, bulletIdx) => {
        const bulletTokens = tokenizeJobText(bullet);
        const combined = [...bulletTokens, ...contextTokens];
        const score = tokenOverlap(atomTokens, combined);
        if (score >= threshold) {
          scores.push({ atomId: atom.id, expIdx, bulletIdx, score });
        }
      });
    });
  }

  return scores.sort((a, b) => b.score - a.score);
}

export function bestAnchorForAtom(
  atomId: string,
  scores: ReturnType<typeof scoreBulletAnchors>,
): { expIdx: number; bulletIdx: number; score: number } | null {
  const match = scores.find((s) => s.atomId === atomId);
  return match ?? null;
}
