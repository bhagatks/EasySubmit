/**
 * Shared deterministic keyword extraction for JD Brain + ATS keyword gap.
 * Tokenizes job text, filters HR/English noise, and keeps taxonomy-backed terms only.
 */

import { MASTER_SKILLS } from "@/src/lib/constants/skills";

// Stop words — HR filler, plain English, and company/context noise.
export const KEYWORD_STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","as","is","was","are","were","be","been","being","have","has","had",
  "do","does","did","will","would","could","should","may","might","shall","can",
  "need","must","this","that","these","those","it","its","we","our","you","your",
  "they","their","he","she","his","her","us","me","my","i","not","no","so","if",
  "then","than","when","where","who","which","what","how","all","each","every",
  "both","few","more","most","other","some","such","into","about","above","after",
  "before","between","through","during","also","just","only","very","well","new",
  "good","high","large","small","over","under","back","still","own","same","right",
  "work","working","worked","use","using","used","make","made","making","help",
  "helping","helped","ensure","ensuring","support","supporting","supported",
  "including","include",
  "position","positions","role","roles","opportunity","opportunities","candidate",
  "candidates","apply","application","applications","hiring","hire","join","joining",
  "compensation","benefits","benefit","pay","salary","package","culture","innovation",
  "innovative","passionate","passion","growth","impact","environment","team","teams",
  "company","organization","business","industry","experience","experiences","skill",
  "skills","ability","abilities","knowledge","required","requirements","preferred",
  "plus","bonus","ideal","strong","excellent","great","key","core","primary",
  "secondary","relevant","related","demonstrated",
  "walmart","target","amazon","store","stores","associate","associates","customer",
  "customers","service","services","product","products","planning","plan","plans",
  "planned","planner","scheduling","schedule","schedules","scheduled","workforce",
  "workers","worker","staff","staffing","leave","absence","absences","attendance",
  "vacation","pto","compliance","compliant","regulatory","regulation","regulations",
  "area","areas","region","regions","location","locations","site","sites","degree",
  "degrees","education","bachelor","master","phd","qualifications","qualification",
  "qualified","qualify","execution","executing","execute","executes","strategies",
  "strategy","strategic","tactics","tactic","analytical","analysis","analyze",
  "analyses","attention","focus","focused","detail","details","problem","problems",
  "solving","solver","solution","solutions","people","person","persons","individuals",
  "individual","communication","communicate","communicates","interpersonal",
  "leadership","leader","leaders","lead","leading","management","managing","time",
  "times","timely","deadline","deadlines","priorities","priority","process",
  "processes","procedure","procedures","data","information","reporting","reports",
  "report","metrics","metric","develop","developing","development","developer",
  "building","build","drive","driving","driven","results","result","outcome",
  "outcomes","collaborate","collaboration","collaborative","cross","functional",
  "proactive","initiative","ownership","accountability","accountable","innovative",
  "creativity","creative","critical","thinking",
  // Web / ATS page noise
  "please","email","http","https","www","com","org","net","click","apply","equal",
  "opportunity","employer","discrimination","disability","veteran","status",
]);

/** Exact lowercase master skill labels (e.g. "node.js", "a/b testing"). */
export const MASTER_SKILLS_SET = new Set(
  MASTER_SKILLS.map((skill) => skill.toLowerCase()),
);

// Slug aliases + compounds not always captured when tokenizing MASTER_SKILLS labels.
const SKILL_TOKEN_ALIASES = [
  "python","java","javascript","typescript","go","golang","rust","swift","kotlin",
  "c","cplusplus","csharp","dotnet","scala","ruby","php","r","matlab","julia",
  "react","vue","angular","nextjs","svelte","html","css","tailwind","webpack",
  "vite","storybook","redux","zustand","graphql","nodejs","express","fastapi",
  "django","flask","spring","rails","nestjs","grpc","rest","microservices","kafka",
  "rabbitmq","celery","aws","gcp","azure","docker","kubernetes","terraform",
  "ansible","jenkins","github","gitlab","ci","cd","linux","bash","nginx","helm",
  "prometheus","grafana","datadog","splunk","pagerduty","newrelic","sql",
  "postgresql","mysql","mongodb","redis","elasticsearch","cassandra","dynamodb",
  "snowflake","bigquery","spark","hadoop","airflow","dbt","pandas","numpy",
  "pytorch","tensorflow","sklearn","jupyter","tableau","powerbi","lambda","s3",
  "ec2","rds","sqs","sns","cloudwatch","cloudfront","eks","ecs","jest","pytest",
  "junit","cypress","playwright","selenium","vitest","distributed","serverless",
  "event-driven","soa","agile","scrum","kanban","devops","sre","tdd","bdd","ci/cd",
  "aws-certified","gcp-certified","cka","ckad","pmp","cissp",
  "program-management","project-management","change-management",
  "stakeholder-management","organizational-design","workforce-planning",
  "people-analytics","talent-management","performance-management",
  "succession-planning","employee-engagement","hris","workday-hcm",
  "sap-successfactors","servicenow","salesforce","looker","google-analytics",
  "mixpanel","okrs","kpis","balanced-scorecard","six-sigma","lean","kaizen",
  "process-improvement","budget-management","p&l","financial-modeling",
  "cost-analysis","product-management","go-to-market","roadmapping",
  "content-strategy","seo","sem","paid-media","crm","supply-chain","logistics",
  "operations-management","risk-management","audit","sox","gdpr","hipaa",
  "mergers-acquisitions","due-diligence","nlp","llm",
] as const;

function buildSkillTokenSet(): Set<string> {
  const set = new Set<string>(SKILL_TOKEN_ALIASES);

  for (const skill of MASTER_SKILLS) {
    set.add(skill.toLowerCase());
    for (const token of tokenizeJobText(skill)) {
      if (token.length >= 2) set.add(token);
    }
    for (const bigram of bigramsOf(tokenizeJobText(skill))) {
      set.add(bigram);
    }
  }

  return set;
}

const SKILL_TOKEN_SET = buildSkillTokenSet();

/** Tokenize JD/resume text for keyword extraction. */
export function tokenizeJobText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\bnode\.js\b/gi, "nodejs")
    .replace(/\bvue\.js\b/gi, "vuejs")
    .replace(/\breact\.js\b/gi, "reactjs")
    .replace(/\bnext\.js\b/gi, "nextjs")
    .replace(/\b\.net\b/gi, "dotnet")
    .replace(/\bc\+\+/gi, "cplusplus")
    .replace(/\bc#/gi, "csharp")
    .replace(/\bci\/cd\b/gi, "ci/cd")
    .split(/[^a-z0-9#+/\-]/)
    .map((t) => t.replace(/^[-]+|[-]+$/g, ""))
    .filter((t) => t.length >= 2 && !KEYWORD_STOP_WORDS.has(t));
}

export function bigramsOf(tokens: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    result.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return result;
}

export function isKnownSkillToken(token: string): boolean {
  const lower = token.toLowerCase().trim();
  if (!lower) return false;
  if (MASTER_SKILLS_SET.has(lower)) return true;
  if (SKILL_TOKEN_SET.has(lower)) return true;
  return false;
}

/** True for taxonomy-backed or structurally technical tokens — not plain English. */
export function looksLikeTechTerm(token: string): boolean {
  if (isKnownSkillToken(token)) return true;
  if (/\d/.test(token)) return true;
  if (/[#+/]/.test(token)) return true;
  if (/-/.test(token) && token.length >= 6) return true;
  if (token.length <= 4) return isKnownSkillToken(token);
  return false;
}

/** Ranked keywords from a JD section (unigrams + bigrams, frequency-sorted). */
export function extractRankedKeywords(text: string, maxTerms: number): string[] {
  if (!text.trim()) return [];

  const tokens = tokenizeJobText(text);
  const bigrams = bigramsOf(tokens);
  const freq = new Map<string, number>();

  for (const t of [...tokens, ...bigrams]) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }

  return Array.from(freq.entries())
    .filter(([kw]) => looksLikeTechTerm(kw))
    .sort((a, b) => {
      const aKnown = isKnownSkillToken(a[0]) ? 1 : 0;
      const bKnown = isKnownSkillToken(b[0]) ? 1 : 0;
      if (bKnown !== aKnown) return bKnown - aKnown;
      return b[1] - a[1];
    })
    .slice(0, maxTerms)
    .map(([kw]) => kw);
}

/** Known taxonomy skills present in text (single tokens only). */
export function extractKnownSkillsFromText(text: string): string[] {
  return tokenizeJobText(text).filter((t) => isKnownSkillToken(t));
}
