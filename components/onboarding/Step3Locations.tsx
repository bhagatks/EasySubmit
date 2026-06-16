"use client";

import { Home, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import NavigatorTip from "@/components/onboarding/NavigatorTip";
import OnboardingNextButton from "@/components/onboarding/OnboardingNextButton";
import {
  formatNominatimLabel,
  nominatimToLocation,
  searchNominatim,
  type NominatimResult,
} from "@/lib/nominatim";
import { useOnboardingStore } from "@/stores/onboardingStore";

interface Step3LocationsProps {
  onNext: () => void;
}

interface LocationPillProps {
  name: string;
  isResidential: boolean;
  onSetResidential: () => void;
  onRemove: () => void;
}

function LocationPill({
  name,
  isResidential,
  onSetResidential,
  onRemove,
}: LocationPillProps) {
  return (
    <span
      className={[
        "flex items-center gap-2 rounded-[12px] border bg-white px-3 py-2 text-sm text-[#1F2937]",
        isResidential ? "border-[#12B3D1]" : "border-[#E5E7EB]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onSetResidential}
        aria-label={
          isResidential
            ? `${name} is your home base`
            : `Set ${name} as your home base`
        }
        aria-pressed={isResidential}
        title={isResidential ? "Home base" : "Set as home base"}
        className="flex shrink-0 items-center justify-center transition-all duration-200 ease-in-out"
      >
        <Home
          size={16}
          strokeWidth={2.25}
          className={isResidential ? "text-[#12B3D1]" : "text-gray-400"}
        />
      </button>
      <span className="font-medium">{name}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[12px] text-gray-400 transition-all duration-200 ease-in-out hover:bg-gray-100 hover:text-[#1F2937]"
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </span>
  );
}

export default function Step3Locations({ onNext }: Step3LocationsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const targetLocations = useOnboardingStore((s) => s.targetLocations);
  const addTargetLocation = useOnboardingStore((s) => s.addTargetLocation);
  const removeTargetLocation = useOnboardingStore((s) => s.removeTargetLocation);
  const setResidential = useOnboardingStore((s) => s.setResidential);
  const isLocationSelected = useOnboardingStore((s) => s.isLocationSelected);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    const timeoutId = window.setTimeout(() => {
      searchNominatim(query)
        .then((results) => {
          setSearchResults(results);
          setIsSearching(false);
        })
        .catch(() => {
          setSearchResults([]);
          setSearchError("Unable to search locations. Please try again.");
          setIsSearching(false);
        });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const showDropdown = searchFocused && searchQuery.trim().length > 0;

  const handleSelectResult = (result: NominatimResult) => {
    addTargetLocation(nominatimToLocation(result));
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mb-6 text-2xl font-semibold leading-snug text-[#1F2937]">
        Where are you currently based, and where would you like to work?
      </h1>

      <div className="relative mb-4">
        <Search
          size={18}
          strokeWidth={2}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
          placeholder="Search for a city or region"
          className="w-full rounded-[12px] border border-[#E5E7EB] bg-white py-3 pl-11 pr-4 text-sm text-[#1F2937] placeholder:text-gray-400 focus:border-[#12B3D1] focus:outline-none focus:ring-1 focus:ring-[#12B3D1]"
        />

        {showDropdown && (
          <ul className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-[12px] border border-[#E5E7EB] bg-white shadow-lg">
            {isSearching ? (
              <li className="px-4 py-3 text-sm text-gray-500">Searching…</li>
            ) : searchError ? (
              <li className="px-4 py-3 text-sm text-red-500">{searchError}</li>
            ) : searchResults.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-500">No locations found</li>
            ) : (
              searchResults.map((result) => {
                const id = `nominatim-${result.place_id}`;
                const selected = isLocationSelected(id);
                const label = formatNominatimLabel(result);

                return (
                  <li key={result.place_id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectResult(result)}
                      disabled={selected}
                      className={[
                        "flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-all duration-200 ease-in-out",
                        selected
                          ? "cursor-default bg-[#12B3D1]/5 text-[#12B3D1]"
                          : "text-[#1F2937] hover:bg-[#F9FAFB]",
                      ].join(" ")}
                    >
                      <span>{label}</span>
                      {selected && (
                        <span className="rounded-[12px] bg-[#12B3D1]/10 px-2 py-0.5 text-xs font-semibold text-[#12B3D1]">
                          Added
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>

      {targetLocations.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {targetLocations.map((location) => (
            <LocationPill
              key={location.id}
              name={location.name}
              isResidential={location.isResidential}
              onSetResidential={() => setResidential(location.id)}
              onRemove={() => removeTargetLocation(location.id)}
            />
          ))}
        </div>
      )}

      <NavigatorTip
        className="mb-6"
        message="Add every city you'd consider, then tap the home icon on your current location."
      />

      <OnboardingNextButton
        disabled={targetLocations.length === 0}
        onClick={onNext}
      />
    </div>
  );
}
