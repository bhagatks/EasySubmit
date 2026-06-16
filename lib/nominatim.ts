import type { Location } from "@/stores/onboardingStore";

export interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  country?: string;
  postcode?: string;
  country_code?: string;
}

export interface NominatimResult {
  place_id: number;
  display_name: string;
  address?: NominatimAddress;
}

function extractCity(result: NominatimResult): string {
  const addr = result.address;
  return (
    addr?.city ??
    addr?.town ??
    addr?.village ??
    addr?.municipality ??
    result.display_name.split(",")[0]?.trim() ??
    "Unknown"
  );
}

export function formatNominatimLabel(result: NominatimResult): string {
  const addr = result.address ?? {};
  const city = extractCity(result);
  const region = addr.state ?? addr.country ?? "";
  const zip = addr.postcode?.trim() ?? "";

  if (region && zip) {
    return `${city}, ${region} (${zip})`;
  }
  if (region) {
    return `${city}, ${region}`;
  }
  if (zip) {
    return `${city} (${zip})`;
  }
  return city;
}

export function nominatimToLocation(result: NominatimResult): Location {
  return {
    id: `nominatim-${result.place_id}`,
    name: formatNominatimLabel(result),
    isResidential: false,
  };
}

/** @deprecated Use `nominatimToLocation` */
export const nominatimToTargetLocation = nominatimToLocation;

export async function searchNominatim(query: string): Promise<NominatimResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({
    format: "json",
    q: trimmed,
    addressdetails: "1",
    limit: "5",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Location search failed");
  }

  const data = (await response.json()) as NominatimResult[];
  return data;
}
