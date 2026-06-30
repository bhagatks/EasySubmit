import type { ApplicationProfile } from "@/lib/profile/application-profile";
import type { FieldDescriptor } from "./field-descriptor";

const EARLIEST_START_LABELS: Record<
  NonNullable<ApplicationProfile["preferences"]>["earliestStart"],
  string
> = {
  immediately: "Immediately",
  "2_weeks": "2 weeks",
  "1_month": "1 month",
  flexible: "Flexible",
};

const NOTICE_PERIOD_LABELS: Record<
  NonNullable<NonNullable<ApplicationProfile["preferences"]>["noticePeriod"]>,
  string
> = {
  immediate: "Immediately",
  "2_weeks": "2 weeks",
  "1_month": "1 month",
  "2_months": "2 months",
  flexible: "Flexible",
};

const JOB_TYPE_LABELS: Record<
  NonNullable<NonNullable<ApplicationProfile["preferences"]>["desiredJobType"]>,
  string
> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  flexible: "Flexible",
};

const CITIZENSHIP_LABELS: Record<
  NonNullable<NonNullable<ApplicationProfile["workAuth"]>["citizenshipStatus"]>,
  string
> = {
  citizen: "US Citizen",
  green_card: "Permanent Resident",
  tn: "TN Visa",
  ead: "EAD",
  h1b: "H-1B",
  opt: "OPT",
  cpt: "CPT",
  other: "Other",
};

const DEGREE_LABELS: Record<
  NonNullable<NonNullable<ApplicationProfile["education"]>["highestDegree"]>,
  string
> = {
  high_school: "High School Diploma / GED",
  associate: "Associate's Degree",
  bachelor: "Bachelor's Degree",
  master: "Master's Degree",
  phd: "Doctorate (PhD)",
  other: "Other",
};

function salaryForLabel(
  label: string,
  salary: NonNullable<ApplicationProfile["preferences"]>["salary"],
): string | null {
  const l = label.toLowerCase();
  if (/minimum|at least|min\b/.test(l)) return String(salary.min);
  if (/maximum|up to|max\b/.test(l)) return String(salary.max);
  const midpoint = Math.round((salary.min + salary.max) / 2);
  return String(midpoint);
}

function formatAddress(address: NonNullable<ApplicationProfile["address"]>): string | null {
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postal,
    address.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function formatBooleanAnswer(value: boolean): string {
  return value ? "Yes" : "No";
}

function resolveAddressField(label: string, profile: ApplicationProfile): string | null {
  if (!profile.address) return null;
  const l = label.toLowerCase();
  if (/address line 2|apt|suite|unit|\bline 2\b/.test(l) && profile.address.line2) return profile.address.line2;
  if (/street|address line|\bline 1\b/.test(l) && profile.address.line1) return profile.address.line1;
  if (/\bcity\b/.test(l) && profile.address.city) return profile.address.city;
  if (/\bstate\b|province|region/.test(l) && profile.address.state) return profile.address.state;
  if (/postal|\bzip\b/.test(l) && profile.address.postal) return profile.address.postal;
  if (/\bcountry\b/.test(l) && profile.address.country) return profile.address.country;
  if (/full address|mailing address/.test(l)) return formatAddress(profile.address);
  return null;
}

/**
 * Resolve a fill string from `applicationProfile` using normalized field labels.
 * Covers: address, work auth, preferences, education, EEO, identity extras.
 */
export function resolveFromApplicationProfile(
  label: string,
  fieldType: FieldDescriptor["fieldType"] | string,
  profile: ApplicationProfile | null | undefined,
): string | null {
  if (!profile) return null;
  if (fieldType === "file") return null;

  const l = label.toLowerCase();

  // Address
  const addressValue = resolveAddressField(label, profile);
  if (addressValue) return addressValue;

  // Identity extras
  if (profile.identityExtras) {
    const ix = profile.identityExtras;
    if (/preferred name|goes by|nickname/.test(l) && ix.preferredName) return ix.preferredName;
    if (/\bpronoun/.test(l) && ix.pronouns) return ix.pronouns;
    if (/github/.test(l) && ix.githubUrl) return ix.githubUrl;
    if (/portfolio|personal (site|web|url)|website/.test(l) && ix.portfolioUrl) return ix.portfolioUrl;
  }

  // Work authorization
  if (profile.workAuth) {
    const wa = profile.workAuth;
    if (/authorized to work|work authorization|eligible to work|legally authorized/.test(l)) {
      return formatBooleanAnswer(wa.authorized);
    }
    if (/visa sponsorship|require sponsorship|need sponsorship/.test(l)) {
      return formatBooleanAnswer(wa.requiresSponsorship);
    }
    if (/country of authorization|authorized country/.test(l) && wa.authorizedCountry) {
      return wa.authorizedCountry;
    }
    if (/citizenship|immigration|work status|authorization type/.test(l) && wa.citizenshipStatus) {
      return CITIZENSHIP_LABELS[wa.citizenshipStatus] ?? wa.citizenshipStatus;
    }
    if (/visa type/.test(l) && wa.visaType) return wa.visaType;
  }

  // Preferences
  if (profile.preferences) {
    const p = profile.preferences;
    if (/salary|compensation|pay|expected/.test(l) && p.salary) {
      return salaryForLabel(label, p.salary);
    }
    if (/start date|available to start|earliest start/.test(l)) {
      return EARLIEST_START_LABELS[p.earliestStart];
    }
    if (/notice period|current notice/.test(l) && p.noticePeriod) {
      return NOTICE_PERIOD_LABELS[p.noticePeriod];
    }
    if (/work mode|remote|hybrid|onsite|work location preference/.test(l)) {
      const mode = p.workMode;
      if (mode === "remote") return "Remote";
      if (mode === "hybrid") return "Hybrid";
      if (mode === "onsite") return "On-site";
      if (mode === "flexible") return "Flexible";
    }
    if (/willing to relocate|open to relocation|relocat/.test(l) && p.willingToRelocate != null) {
      return formatBooleanAnswer(p.willingToRelocate);
    }
    if (/job type|employment type|position type|full.?time|part.?time|contract/.test(l) && p.desiredJobType) {
      return JOB_TYPE_LABELS[p.desiredJobType] ?? p.desiredJobType;
    }
    if (/travel|willing to travel/.test(l) && p.travelTolerance) {
      const t = p.travelTolerance;
      if (t === "none") return "No travel";
      if (t === "25pct") return "Up to 25%";
      if (t === "50pct") return "Up to 50%";
      if (t === "75pct") return "Up to 75%";
      if (t === "any") return "Any amount";
    }
  }

  // Education
  if (profile.education) {
    const ed = profile.education;
    if (/highest (degree|education|level)|education level/.test(l) && ed.highestDegree) {
      return DEGREE_LABELS[ed.highestDegree] ?? ed.highestDegree;
    }
    if (/field of study|major|concentration/.test(l) && ed.fieldOfStudy) return ed.fieldOfStudy;
    if (/school|university|college|institution/.test(l) && ed.schoolName) return ed.schoolName;
    if (/graduation year|grad year|graduated/.test(l) && ed.graduationYear) return String(ed.graduationYear);
    if (/\bgpa\b|grade point/.test(l) && ed.gpa) return ed.gpa;
  }

  // EEO
  if (profile.eeo) {
    const eeo = profile.eeo;
    if (/gender/.test(l) && eeo.gender) return eeo.gender;
    if (/veteran/.test(l) && eeo.veteran) return eeo.veteran;
    if (/disabilit/.test(l) && eeo.disability) return eeo.disability;
    if (/race|ethnic/.test(l) && eeo.race) return eeo.race;
    if (/hispanic|latino/.test(l) && eeo.hispanicLatino != null) return formatBooleanAnswer(eeo.hispanicLatino);
  }

  return null;
}
