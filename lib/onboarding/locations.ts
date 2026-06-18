import type { Location } from "@/stores/onboardingStore";

/** Location marked as the user's home base (primary resume address). */
export function getResidentialLocation(
  locations: Location[]
): Location | null {
  return locations.find((location) => location.isResidential) ?? null;
}

/** Primary address string for resume generation — from `isResidential` location. */
export function getPrimaryAddress(locations: Location[]): string | null {
  return getResidentialLocation(locations)?.name ?? null;
}

export function hasResidentialLocation(locations: Location[]): boolean {
  return locations.some((location) => location.isResidential);
}
