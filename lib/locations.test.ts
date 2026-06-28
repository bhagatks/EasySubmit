import { describe, expect, it } from "vitest";
import {
  ALL_LOCATIONS,
  CA_CITIES,
  getLocationsByCountry,
  SEARCHABLE_REGIONS,
  US_CITIES,
} from "@/lib/locations";

describe("locations", () => {
  it("returns US and CA city lists", () => {
    expect(getLocationsByCountry("US")).toEqual(US_CITIES);
    expect(getLocationsByCountry("CA")).toEqual(CA_CITIES);
    expect(US_CITIES.some((city) => city.remote)).toBe(true);
  });

  it("combines all location catalogs", () => {
    expect(ALL_LOCATIONS.length).toBe(
      US_CITIES.length + CA_CITIES.length + SEARCHABLE_REGIONS.length,
    );
  });
});
