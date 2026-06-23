// Layer 5 — Convert JDIntelligence + current resume skills → ResumeEnhanceDirective.
// The directive is what gets fed to brain.ts — structured instructions, not raw gaps.

import type { JDIntelligence, ResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-intelligence";

// Skills clearly tied to a tech/engineering domain that should be removed when
// the target role is non-technical (people, ops, finance, legal, etc.)
const TECH_ONLY_SKILLS = new Set([
  "mobile development","ios","android","flutter","swift","kotlin","swiftui","jetpack compose",
  "react native","full-stack","full stack","apis","gateways","cloud & devops",
  "docker","kubernetes","aws","gcp","azure","terraform","ci/cd","devops",
  "nodejs","react","angular","vue","html","css","graphql","rest",
  "python","java","javascript","typescript","golang","rust","scala",
  "postgresql","mysql","mongodb","redis","kafka","rabbitmq",
  "microservices","serverless","distributed systems",
]);

const NON_TECH_DOMAINS = new Set(["other","product-management"]);

function isTechRole(intelligence: JDIntelligence): boolean {
  return !NON_TECH_DOMAINS.has(intelligence.domain);
}

export function buildResumeEnhanceDirective(
  intelligence: JDIntelligence,
  currentSkills: string[],
): ResumeEnhanceDirective {
  const resumeSkillsLower = new Set(currentSkills.map((s) => s.toLowerCase().trim()));
  const isNonTech = !isTechRole(intelligence);

  // Skills gap: must-haves not already in resume
  const mustAddSkills = intelligence.mustHaveSkills
    .filter((s) => !resumeSkillsLower.has(s.toLowerCase()))
    .slice(0, 15);

  // Keywords gap: tier1 + tier2 not already in resume
  const allPriorityKeywords = [...intelligence.tier1Keywords, ...intelligence.tier2Keywords];
  const mustWeaveKeywords = allPriorityKeywords
    .filter((kw, idx, arr) => arr.indexOf(kw) === idx)
    .filter((kw) => !resumeSkillsLower.has(kw.toLowerCase()))
    .slice(0, 20);

  // For non-tech roles: flag engineering-specific skills to remove so the AI replaces them.
  const mustRemoveSkills = isNonTech
    ? currentSkills.filter((s) => TECH_ONLY_SKILLS.has(s.toLowerCase().trim()))
    : [];

  // Effective target role: prefer the title extracted from the JD itself
  const effectiveTargetRole = intelligence.extractedJobTitle ?? null;

  // Quantification hints from impact dimensions
  const quantHints: string[] = [];
  for (const dim of intelligence.impactDimensions) {
    const hints: Record<string, string> = {
      reliability: "reduce incidents, improve uptime, SLA compliance",
      scale: "users served, traffic volume, data scale",
      speed: "deployment frequency, lead time, release cadence",
      cost: "cloud cost reduction, efficiency gains",
      revenue: "revenue impact, conversion improvement, growth",
      quality: "bug reduction, test coverage, defect rate",
      security: "vulnerability reduction, compliance coverage",
      team: "team size, hiring, mentoring outcomes",
      delivery: "features shipped, roadmap delivery, sprint velocity",
    };
    if (hints[dim]) quantHints.push(hints[dim]!);
  }

  return {
    mustAddSkills,
    mustRemoveSkills,
    mustWeaveKeywords,
    effectiveTargetRole,
    roleLevel: intelligence.seniority,
    scope: intelligence.scope,
    targetVerbs: intelligence.targetVerbs.slice(0, 8),
    impactDimensions: intelligence.impactDimensions,
    quantHints: quantHints.slice(0, 5),
    summaryTheme: intelligence.summaryTheme,
    emphasisAreas: intelligence.emphasisAreas.slice(0, 4),
    deprioritize: intelligence.deprioritize,
    cultureSignals: {
      velocity: intelligence.velocitySignal,
      ownership: intelligence.ownershipLevel,
      industry: intelligence.industryDomain.slice(0, 3),
    },
  };
}
