/** Shared action-verb detection + normalization for bullets (quality + deterministic rewrite). */

export const RESUME_ACTION_VERBS = new Set([
  "led", "managed", "directed", "oversaw", "supervised", "mentored", "coached",
  "spearheaded", "championed", "orchestrated", "established", "founded", "launched",
  "initiated", "drove", "guided", "facilitated", "coordinated", "delegated", "owned",
  "leading", "managing", "directing", "overseeing", "supervising", "mentoring", "coaching",
  "spearheading", "championing", "orchestrating", "establishing", "launching", "initiating",
  "driving", "guiding", "facilitating", "coordinating", "delegating", "owning",
  "built", "developed", "designed", "architected", "engineered", "implemented",
  "created", "deployed", "shipped", "migrated", "refactored", "optimized", "automated",
  "integrated", "scaled", "maintained", "upgraded", "modernized", "containerized",
  "streamlined", "consolidated", "restructured", "revamped", "rewrote", "extended",
  "building", "developing", "designing", "architecting", "engineering", "implementing",
  "creating", "deploying", "shipping", "migrating", "refactoring", "optimizing", "automating",
  "integrating", "scaling", "maintaining", "upgrading", "modernizing", "containerizing",
  "streamlining", "consolidating", "restructuring", "revamping", "rewriting", "extending",
  "analyzed", "researched", "investigated", "identified", "evaluated", "assessed",
  "audited", "reviewed", "diagnosed", "monitored", "tracked", "measured", "benchmarked",
  "analyzing", "researching", "investigating", "identifying", "evaluating", "assessing",
  "auditing", "reviewing", "diagnosing", "monitoring", "tracking", "measuring", "benchmarking",
  "increased", "decreased", "reduced", "improved", "accelerated", "boosted", "cut",
  "saved", "generated", "grew", "expanded", "delivered", "achieved", "exceeded",
  "secured", "raised", "eliminated", "resolved", "fixed", "closed", "negotiated",
  "increasing", "decreasing", "reducing", "improving", "accelerating", "boosting", "cutting",
  "saving", "generating", "growing", "expanding", "delivering", "achieving", "exceeding",
  "securing", "raising", "eliminating", "resolving", "fixing", "closing", "negotiating",
  "partnered", "collaborated", "presented", "documented", "communicated", "published",
  "trained", "educated", "onboarded", "recruited", "interviewed", "hired",
  "partnering", "collaborating", "presenting", "documenting", "communicating", "publishing",
  "training", "educating", "onboarding", "recruiting", "interviewing", "hiring",
  "modeled", "forecasted", "reported", "visualized", "queried", "processed",
  "transformed", "extracted", "loaded", "cleaned", "validated", "aggregated",
  "modeling", "forecasting", "reporting", "visualizing", "querying", "processing",
  "transforming", "extracting", "loading", "cleaning", "validating", "aggregating",
  "achieved", "created", "executed", "guided", "oversaw", "provided", "strengthened",
]);

/** Base/imperative forms common at bullet start — normalize to past tense instead of stacking verbs. */
const BASE_TO_PAST_TENSE: Record<string, string> = {
  lead: "Led",
  manage: "Managed",
  direct: "Directed",
  oversee: "Oversaw",
  supervise: "Supervised",
  mentor: "Mentored",
  coach: "Coached",
  build: "Built",
  develop: "Developed",
  design: "Designed",
  architect: "Architected",
  engineer: "Engineered",
  implement: "Implemented",
  create: "Created",
  deploy: "Deployed",
  ship: "Shipped",
  migrate: "Migrated",
  optimize: "Optimized",
  automate: "Automated",
  integrate: "Integrated",
  scale: "Scaled",
  maintain: "Maintained",
  streamline: "Streamlined",
  analyze: "Analyzed",
  research: "Researched",
  investigate: "Investigated",
  identify: "Identified",
  evaluate: "Evaluated",
  assess: "Assessed",
  increase: "Increased",
  reduce: "Reduced",
  improve: "Improved",
  deliver: "Delivered",
  achieve: "Achieved",
  exceed: "Exceeded",
  partner: "Partnered",
  collaborate: "Collaborated",
  present: "Presented",
  document: "Documented",
  communicate: "Communicated",
  train: "Trained",
  define: "Defined",
  provide: "Provided",
  execute: "Executed",
  drive: "Drove",
  guide: "Guided",
  coordinate: "Coordinated",
  facilitate: "Facilitated",
  establish: "Established",
  launch: "Launched",
  spearhead: "Spearheaded",
  champion: "Championed",
  strengthen: "Strengthened",
  convert: "Converted",
  play: "Played",
  serve: "Served",
  work: "Worked",
};

export function firstWordOfBullet(text: string): string {
  const trimmed = text.trim().replace(/^[-•*]\s*/, "");
  return trimmed.split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, "") ?? "";
}

export function bulletHasStrongOpening(text: string): boolean {
  const lower = firstWordOfBullet(text).toLowerCase();
  if (!lower) return false;
  return RESUME_ACTION_VERBS.has(lower) || lower in BASE_TO_PAST_TENSE;
}

/** True when a bullet contains a real outcome metric — not product names like 7Now. */
export function bulletHasQuantifiedMetric(text: string): boolean {
  return /\b\d+\s*%|\b\d+x\b|\$\d|\b(?:increased|decreased|reduced|improved|grew|saved|boosted|cut|accelerated)\s+(?:by\s+)?\d+/i.test(
    text,
  );
}

/** Normalize leading verb to past tense; never stack a second verb. */
export function normalizeBulletOpeningVerb(text: string): string {
  const trimmed = text.trim().replace(/^[-•*]\s*/, "");
  if (!trimmed) return trimmed;

  const firstRaw = trimmed.split(/\s+/)[0] ?? "";
  const lower = firstRaw.replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!lower) return trimmed;

  if (RESUME_ACTION_VERBS.has(lower)) {
    return trimmed;
  }

  const past = BASE_TO_PAST_TENSE[lower];
  if (past) {
    const rest = trimmed.slice(firstRaw.length).trim();
    return rest ? `${past} ${rest}` : past;
  }

  return trimmed;
}
