import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { emptyHubRefineryForm } from "@/lib/onboarding/hubResume";

/** Bhagath-style engineering leader — shared base for Cases 001–003. */
export const ENHANCE_QA_BASE_FORM: HubRefineryForm = {
  ...emptyHubRefineryForm(),
  firstName: "Bhagath",
  lastName: "Siddi",
  cityState: "Dallas, TX",
  phone: "+1 555 010 2000",
  email: "qa@easysubmit.test",
  linkedIn: "https://linkedin.com/in/bhagath-qa",
  professionalSummary:
    "Director with 20 years of experience leading mobile and platform engineering teams.",
  skillsText: "Cloud & DevOps, Docker, Swift, API Design, Mobile Development, Agile",
  experience: [
    {
      id: "exp-1",
      title: "Head of Engineering",
      company: "7-Eleven",
      location: "Irving, TX",
      startMonth: "01",
      startYear: "2020",
      endMonth: "",
      endYear: "",
      bullets:
        "Led 7Now Delivery Platform engineering for mobile and API teams across iOS and Android. Scaled platform to support 10x order volume.",
    },
    {
      id: "exp-2",
      title: "Director of Mobile Engineering",
      company: "CVS Health",
      location: "Remote",
      startMonth: "06",
      startYear: "2015",
      endMonth: "12",
      endYear: "2019",
      bullets:
        "Owned consumer mobile apps and release pipelines. Partnered with vendors on integrations and platform reliability.",
    },
  ],
  education: [
    {
      id: "edu-1",
      degree: "BS Computer Science",
      school: "University of Texas",
      location: "Austin, TX",
      startMonth: "",
      startYear: "2000",
      endMonth: "",
      endYear: "2004",
    },
  ],
};

export type EnhanceQaCaseId = "001" | "002" | "003";

export type EnhanceQaCase = {
  id: EnhanceQaCaseId;
  label: string;
  targetRole: string;
  jobDescription: string;
  /** cross-domain = engineering profile × non-engineering JD */
  domain: "cross-domain" | "same-domain";
  company: string;
  platform: string;
  /** From job-automation baseline index (1–7); null = playbook-only fixture */
  automationIndex: number | null;
};

/** Case 001 — cross-domain stress (playbook canonical). */
const CASE_001_JD = `Director, Procurement — iRhythm Technologies (JR1437)
Location: Orange County, California

About iRhythm: iRhythm is a leading digital healthcare company redefining the way cardiac arrhythmias are diagnosed.

Responsibilities:
- Lead global procurement strategy for direct and indirect spend
- Drive strategic sourcing, category management, and procure-to-pay (P2P) optimization
- Manage supplier relationships and vendor negotiations for medical device supply chain
- Ensure supplier quality compliance with ISO 13485 and FDA medical device regulations
- Partner with R&D and manufacturing on capital equipment and indirect categories
- Build procurement analytics, risk management, and contract lifecycle processes

Requirements:
- 15+ years procurement leadership in regulated industries (medtech preferred)
- Deep experience with strategic sourcing, category management, and P2P
- Knowledge of ISO 13485, FDA regulations, and supplier quality systems
- Strong stakeholder management with finance, legal, and operations leaders
- Bachelor's degree required; CPM or CPSM preferred`;

/** Case 002 — same-domain Workday (automation index 6). */
const CASE_002_JD = `Senior Manager, Software Engineering — iRhythm Technologies (JR1346)
Location: Remote — US

About the Role:
Lead a team of software engineers building cloud-native services and mobile-connected cardiac monitoring platforms.

Responsibilities:
- Manage and mentor software engineering teams delivering scalable backend APIs and mobile integrations
- Drive Agile delivery, DevOps practices, CI/CD pipelines, and platform reliability
- Partner with product, QA, and compliance on regulated medical device software releases
- Architect solutions using cloud services, REST APIs, and data pipelines
- Collaborate on MySQL/PostgreSQL data stores, observability, and security best practices

Requirements:
- 10+ years software engineering with 5+ years people management
- Strong experience with cloud platforms, DevOps, Agile/SAFe, and API design
- Mobile platform integration experience (iOS/Android) a plus
- Experience in regulated healthcare or SaaS environments preferred
- Bachelor's in Computer Science or equivalent`;

/** Case 003 — same-domain Workday (automation index 7, top scorer). */
const CASE_003_JD = `Manager, Software Engineering — RELX (R109104)
Location: Remote / Hybrid

About RELX: Global information and analytics company serving professional and business customers.

Responsibilities:
- Lead a software engineering team building enterprise SaaS applications
- Deliver features using JavaScript/TypeScript, cloud-native microservices, and REST APIs
- Drive code quality, Agile ceremonies, and cross-functional delivery with product and design
- Mentor engineers, conduct technical reviews, and improve engineering practices
- Partner on security, compliance, and platform scalability initiatives

Requirements:
- 8+ years software development with 3+ years leading engineers
- Proficiency in JavaScript, modern web frameworks, and API development
- Cloud platform experience (AWS/Azure/GCP) and DevOps familiarity
- Strong communication and stakeholder management skills
- Bachelor's degree in Computer Science or related field`;

export const ENHANCE_QA_CASES: Record<EnhanceQaCaseId, EnhanceQaCase> = {
  "001": {
    id: "001",
    label: "Eng leader × procurement (cross-domain)",
    targetRole: "Director, Procurement",
    jobDescription: CASE_001_JD,
    domain: "cross-domain",
    company: "iRhythm",
    platform: "Workday",
    automationIndex: null,
  },
  "002": {
    id: "002",
    label: "Eng leader × SWE manager (same-domain)",
    targetRole: "Senior Manager, Software Engineering",
    jobDescription: CASE_002_JD,
    domain: "same-domain",
    company: "iRhythm",
    platform: "Workday",
    automationIndex: 6,
  },
  "003": {
    id: "003",
    label: "Eng leader × RELX SWE (same-domain)",
    targetRole: "Manager, Software Engineering",
    jobDescription: CASE_003_JD,
    domain: "same-domain",
    company: "RELX",
    platform: "Workday",
    automationIndex: 7,
  },
};

export const ENHANCE_QA_CASE_LIST = Object.values(ENHANCE_QA_CASES);
