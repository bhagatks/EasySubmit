import { describe, expect, it } from "vitest";
import {
  getPrimaryAddress,
  getResidentialLocation,
  hasResidentialLocation,
} from "@/lib/onboarding/locations";
import type { Location } from "@/src/stores/onboarding-store";

const locations: Location[] = [
  { id: "1", name: "Boston, MA", isResidential: false },
  { id: "2", name: "Merrimack, NH", isResidential: true },
];

describe("onboarding locations", () => {
  it("finds residential location", () => {
    expect(getResidentialLocation(locations)?.name).toBe("Merrimack, NH");
    expect(hasResidentialLocation(locations)).toBe(true);
    expect(getPrimaryAddress(locations)).toBe("Merrimack, NH");
  });

  it("returns null when no residential location exists", () => {
    const remoteOnly: Location[] = [{ id: "1", name: "Remote", isResidential: false }];
    expect(getResidentialLocation(remoteOnly)).toBeNull();
    expect(hasResidentialLocation(remoteOnly)).toBe(false);
    expect(getPrimaryAddress(remoteOnly)).toBeNull();
  });
});
