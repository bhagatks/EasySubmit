import { tokenizeJobText } from "@/lib/job-tracker/jd/keyword-extract";
import { MASTER_SKILLS } from "@/src/lib/constants/skills";

const MASTER_BY_LOWER = new Map(
  MASTER_SKILLS.map((skill) => [skill.toLowerCase(), skill] as const),
);

/** Common JD / model variants → MASTER_SKILLS label. */
const SKILL_ALIASES: Record<string, string> = {
  "react.js": "React",
  reactjs: "React",
  "node.js": "Node.js",
  nodejs: "Node.js",
  "vue.js": "Vue.js",
  vuejs: "Vue.js",
  "next.js": "Next.js",
  nextjs: "Next.js",
  golang: "Go",
  aws: "AWS",
  gcp: "GCP",
  k8s: "Kubernetes",
  "ci/cd": "CI/CD",
  cicd: "CI/CD",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  mongo: "MongoDB",
  mongodb: "MongoDB",
};

function aliasCanonical(lower: string): string | null {
  const alias = SKILL_ALIASES[lower];
  if (!alias) return null;
  return MASTER_BY_LOWER.get(alias.toLowerCase()) ?? alias;
}

/** Map a free-form skill label to a MASTER_SKILLS canonical string, or null if unknown. */
export function canonicalizeMasterSkill(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const direct = MASTER_BY_LOWER.get(lower);
  if (direct) return direct;

  const fromAlias = aliasCanonical(lower);
  if (fromAlias) return fromAlias;

  for (const token of tokenizeJobText(trimmed)) {
    const hit = MASTER_BY_LOWER.get(token);
    if (hit) return hit;
    const aliasHit = aliasCanonical(token);
    if (aliasHit) return aliasHit;
  }

  return null;
}

/** Deduplicated canonical MASTER_SKILLS list preserving first-seen order. */
export function canonicalizeMasterSkills(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const label of labels) {
    const canonical = canonicalizeMasterSkill(label);
    if (!canonical) continue;
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(canonical);
  }

  return out;
}
