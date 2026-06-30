import { describe, expect, it } from "vitest";
import { resolveField } from "@/src/shared/extension/field-resolution";
import type { FieldDescriptor } from "@/src/shared/extension/field-descriptor";
import type { ApplicationProfile } from "@/lib/profile/application-profile";

const descriptor: FieldDescriptor = {
  platform: "workday",
  label: "Are you authorized to work in the United States?",
  fieldType: "select",
  automationId: null,
  tenantHost: "example.myworkdayjobs.com",
  stepFingerprint: "apply-step-1",
  required: true,
};

const fillData = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "555-0100",
};

const applicationProfile: ApplicationProfile = {
  workAuth: {
    authorized: true,
    authorizedCountry: "US",
    requiresSponsorship: false,
  },
  preferences: null,
  address: null,
  education: null,
  eeo: null,
  identityExtras: null,
};

describe("resolveField application_profile step", () => {
  it("uses applicationProfile after vault miss", async () => {
    const resolved = await resolveField(descriptor, {}, fillData, applicationProfile);
    expect(resolved?.source).toBe("application_profile");
    expect(resolved?.value).toBe("Yes");
  });

  it("skips applicationProfile when workAuth is missing", async () => {
    const resolved = await resolveField(
      descriptor,
      {},
      fillData,
      { ...applicationProfile, workAuth: null },
    );
    expect(resolved).toBeNull();
  });
});
