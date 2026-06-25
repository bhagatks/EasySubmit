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

function formatBooleanAnswer(value: boolean, fieldType: FieldDescriptor["fieldType"] | string): string {
  if (fieldType === "checkbox" || fieldType === "radio" || fieldType === "select") {
    return value ? "Yes" : "No";
  }
  return value ? "Yes" : "No";
}

function resolveAddressField(label: string, profile: ApplicationProfile): string | null {
  if (!profile.address) return null;

  const l = label.toLowerCase();
  if (/address line 2|apt|suite|unit|\bline 2\b/.test(l) && profile.address.line2) {
    return profile.address.line2;
  }
  if (/street|address line|\bline 1\b/.test(l) && profile.address.line1) {
    return profile.address.line1;
  }
  if (/\bcity\b/.test(l) && profile.address.city) return profile.address.city;
  if (/\bstate\b|province|region/.test(l) && profile.address.state) return profile.address.state;
  if (/postal|\bzip\b/.test(l) && profile.address.postal) return profile.address.postal;
  if (/\bcountry\b/.test(l) && profile.address.country) return profile.address.country;
  if (/full address|mailing address/.test(l)) {
    return formatAddress(profile.address);
  }

  return null;
}

/**
 * Resolve a fill string from `applicationProfile` using normalized field labels.
 * Work auth / EEO require their section to exist; address fills when present.
 */
export function resolveFromApplicationProfile(
  label: string,
  fieldType: FieldDescriptor["fieldType"] | string,
  profile: ApplicationProfile | null | undefined,
): string | null {
  if (!profile) return null;
  if (fieldType === "file") return null;

  const l = label.toLowerCase();

  const addressValue = resolveAddressField(label, profile);
  if (addressValue) return addressValue;

  if (profile.workAuth) {
    if (/authorized to work|work authorization|eligible to work/.test(l)) {
      return formatBooleanAnswer(profile.workAuth.authorized, fieldType);
    }
    if (/visa sponsorship|require sponsorship/.test(l)) {
      return formatBooleanAnswer(profile.workAuth.requiresSponsorship, fieldType);
    }
    if (/country of authorization|authorized country/.test(l) && profile.workAuth.authorizedCountry) {
      return profile.workAuth.authorizedCountry;
    }
  }

  if (profile.preferences) {
    if (/salary|compensation|pay|expected/.test(l) && profile.preferences.salary) {
      return salaryForLabel(label, profile.preferences.salary);
    }
    if (/start date|available to start|earliest start/.test(l)) {
      return EARLIEST_START_LABELS[profile.preferences.earliestStart];
    }
    if (/work mode|remote|hybrid|onsite|work location preference/.test(l)) {
      const mode = profile.preferences.workMode;
      if (mode === "remote") return "Remote";
      if (mode === "hybrid") return "Hybrid";
      if (mode === "onsite") return "On-site";
      if (mode === "flexible") return "Flexible";
    }
  }

  if (profile.eeo) {
    if (/gender/.test(l) && profile.eeo.gender) return profile.eeo.gender;
    if (/veteran/.test(l) && profile.eeo.veteran) return profile.eeo.veteran;
    if (/disabilit/.test(l) && profile.eeo.disability) return profile.eeo.disability;
  }

  return null;
}
