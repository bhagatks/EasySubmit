"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import {
  formatNominatimLabel,
  reverseGeocodeNominatim,
  searchNominatim,
  type NominatimResult,
} from "@/lib/nominatim";
import { cn } from "@/lib/utils";

const MINT = "oklch(0.82 0.16 165)";
const MUTED = "oklch(0.45 0.02 268)";
const SURFACE = "oklch(0.22 0.03 268)";

type CityStateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  monoClass: string;
  inputClass: string;
  id?: string;
};

export function CityStateField({
  value,
  onChange,
  monoClass,
  inputClass,
  id,
}: CityStateFieldProps) {
  const [query, setQuery] = useState(value);
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const listboxId = useId();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!focused || trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      setSearching(true);
      searchNominatim(trimmed)
        .then((data) => setResults(data))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [query, focused]);

  function pickResult(result: NominatimResult) {
    const label = formatNominatimLabel(result);
    onChange(label);
    setQuery(label);
    setResults([]);
    setFocused(false);
    setLocationError(null);
  }

  const handleLocate = useCallback(() => {
    if (locating || typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Location is not available in this browser.");
      return;
    }

    setLocationError(null);
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await reverseGeocodeNominatim(
            position.coords.latitude,
            position.coords.longitude,
          );

          if (!result) {
            setLocationError("Could not resolve your location. Try searching instead.");
            return;
          }

          const label = formatNominatimLabel(result);
          onChange(label);
          setQuery(label);
          setResults([]);
          setFocused(false);
          setLocationError(null);
        } catch {
          setLocationError("Could not resolve your location. Try searching instead.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocationError("Location permission denied. Try searching instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, [locating, onChange]);

  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: MINT }}
          aria-hidden="true"
        />
        <input
          id={id}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(event.target.value);
            setLocationError(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder="City, state & Zipcode"
          autoComplete="off"
          name="es-coordinates-city"
          className={cn(inputClass, "pl-10 pr-11")}
        />
        <button
          type="button"
          onClick={() => void handleLocate()}
          disabled={locating}
          aria-label="Use current location"
          title="Use current location"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg transition-colors hover:bg-white/10 disabled:cursor-wait"
        >
          {locating ? (
            <Loader2
              className="h-4 w-4 animate-spin"
              style={{ color: MINT }}
              aria-hidden="true"
            />
          ) : (
            <MapPin className="h-4 w-4" style={{ color: MINT }} aria-hidden="true" />
          )}
        </button>
      </div>

      {locationError ? (
        <p className="mt-1.5 text-xs" style={{ color: "oklch(0.65 0.2 25)" }}>
          {locationError}
        </p>
      ) : null}

      {focused && (results.length > 0 || searching) ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-2 max-h-48 overflow-y-auto rounded-xl border border-white/10 shadow-elevated backdrop-blur-xl"
          style={{ backgroundColor: SURFACE }}
        >
          {searching ? (
            <li
              className={cn(
                monoClass,
                "px-4 py-3 text-[10px] uppercase tracking-[0.12em]",
              )}
              style={{ color: MUTED }}
            >
              Searching…
            </li>
          ) : null}
          {results.map((result) => (
            <li key={result.place_id} role="option">
              <button
                type="button"
                className="w-full px-4 py-3 text-left text-sm text-[oklch(0.98_0.01_268)] transition-colors hover:bg-[oklch(0.62_0.21_265_/_0.12)]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pickResult(result)}
              >
                {formatNominatimLabel(result)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
