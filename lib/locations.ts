export type CountryCode = "US" | "CA";

export interface LocationOption {
  id: string;
  city: string;
  country: CountryCode;
  remote?: boolean;
}

export const US_CITIES: LocationOption[] = [
  { id: "us-nyc", city: "New York City", country: "US" },
  { id: "us-sf", city: "San Francisco", country: "US" },
  { id: "us-seattle", city: "Seattle", country: "US" },
  { id: "us-la", city: "Los Angeles", country: "US" },
  { id: "us-chicago", city: "Chicago", country: "US" },
  { id: "us-boston", city: "Boston", country: "US" },
  { id: "us-austin", city: "Austin", country: "US" },
  { id: "us-denver", city: "Denver", country: "US" },
  { id: "us-remote", city: "Remote", country: "US", remote: true },
];

export const CA_CITIES: LocationOption[] = [
  { id: "ca-toronto", city: "Toronto", country: "CA" },
  { id: "ca-vancouver", city: "Vancouver", country: "CA" },
  { id: "ca-montreal", city: "Montreal", country: "CA" },
  { id: "ca-calgary", city: "Calgary", country: "CA" },
  { id: "ca-ottawa", city: "Ottawa", country: "CA" },
  { id: "ca-remote", city: "Remote", country: "CA", remote: true },
];

/** Additional regions surfaced via search autocomplete */
export const SEARCHABLE_REGIONS: LocationOption[] = [
  { id: "us-miami", city: "Miami", country: "US" },
  { id: "us-dallas", city: "Dallas", country: "US" },
  { id: "us-atlanta", city: "Atlanta", country: "US" },
  { id: "us-phoenix", city: "Phoenix", country: "US" },
  { id: "us-portland", city: "Portland", country: "US" },
  { id: "us-washington-dc", city: "Washington, D.C.", country: "US" },
  { id: "ca-edmonton", city: "Edmonton", country: "CA" },
  { id: "ca-winnipeg", city: "Winnipeg", country: "CA" },
  { id: "ca-halifax", city: "Halifax", country: "CA" },
];

export const ALL_LOCATIONS: LocationOption[] = [
  ...US_CITIES,
  ...CA_CITIES,
  ...SEARCHABLE_REGIONS,
];

export function getLocationsByCountry(country: CountryCode): LocationOption[] {
  return country === "US" ? US_CITIES : CA_CITIES;
}
