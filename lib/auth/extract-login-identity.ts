import { joinProfileName } from "@/lib/profile/name";
import { splitFullName } from "@/lib/resume/openResume/adapter";

export type OAuthProfileClaims = {
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
};

export type LoginIdentity = {
  firstName: string;
  lastName: string;
  displayName: string;
};

/**
 * Normalize OAuth name claims into login-profile first/last names (split once at sign-in).
 * Merges structured claims (Google given_name/family_name) with full-name splitting so a
 * missing family_name still yields a last name from `name`.
 */
export function extractLoginIdentity(claims: OAuthProfileClaims): LoginIdentity {
  const given = claims.given_name?.trim() ?? "";
  const family = claims.family_name?.trim() ?? "";
  const fromName = splitFullName(claims.name ?? "");

  const firstName = given || fromName.firstName;
  const lastName = family || fromName.lastName;
  const displayName =
    joinProfileName(firstName, lastName) || claims.name?.trim() || "";

  return {
    firstName,
    lastName,
    displayName,
  };
}
