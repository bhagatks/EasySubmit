"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  formatProficiencyShort,
  PROFICIENCY_LEVELS,
  type ProficiencyLevel,
} from "@/lib/resume/proficiency";
import { RESUME_SECTION_TITLES } from "@/lib/resume/resumeSpec";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { cn } from "@/lib/utils";

const PRIMARY = "oklch(0.62 0.21 265)";
const MINT = "oklch(0.82 0.16 165)";
const MUTED = "oklch(0.45 0.02 268)";

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-[oklch(0.98_0.01_268)] placeholder:text-[oklch(0.45_0.02_268)] transition-colors focus:border-[oklch(0.62_0.21_265_/_0.5)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.62_0.21_265_/_0.35)]";

const LANGUAGE_SUGGESTIONS = [
  "English",
  "Spanish",
  "French",
  "German",
  "Mandarin",
  "Hindi",
  "Arabic",
  "Portuguese",
  "Japanese",
  "Korean",
  "Italian",
  "Russian",
  "Dutch",
  "Turkish",
  "Vietnamese",
  "Bengali",
  "Polish",
  "Swedish",
  "Hebrew",
  "Greek",
] as const;

type LanguagesFieldProps = {
  monoClass: string;
  idPrefix?: string;
};

export function LanguagesField({
  monoClass,
  idPrefix = "languages",
}: LanguagesFieldProps) {
  const languages = useOnboardingStore((state) => state.languages);
  const addLanguage = useOnboardingStore((state) => state.addLanguage);
  const removeLanguage = useOnboardingStore((state) => state.removeLanguage);

  const [query, setQuery] = useState("");
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const added = new Set(languages.map((l) => l.name.toLowerCase()));
    const pool = LANGUAGE_SUGGESTIONS.filter((name) => !added.has(name.toLowerCase()));
    if (!q) return pool.slice(0, 8);
    return pool.filter((name) => name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, languages]);

  const commitLanguage = (name: string, level: ProficiencyLevel) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addLanguage({ name: trimmed, level });
    setQuery("");
    setPendingLanguage(null);
  };

  const handlePick = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPendingLanguage(trimmed);
    setQuery(trimmed);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (pendingLanguage && value.trim().toLowerCase() !== pendingLanguage.toLowerCase()) {
      setPendingLanguage(null);
    }
  };

  const handleQueryKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || pendingLanguage) return;
    handlePick(trimmed);
  };

  return (
    <section>
      <div className="mb-3">
        <p
          className={cn(
            monoClass,
            "text-[11px] font-medium uppercase tracking-[0.18em]",
          )}
          style={{ color: MINT }}
        >
          {RESUME_SECTION_TITLES.languages}
        </p>
      </div>

      {languages.length > 0 ? (
        <div className="mb-2 space-y-2">
          {languages.map((lang) => (
            <div key={lang.name} className="flex gap-2">
              <input
                readOnly
                value={lang.name}
                className={cn(INPUT_CLASS, "min-w-0 flex-1")}
                aria-label={`Language ${lang.name}`}
              />
              <select
                value={lang.level}
                onChange={(event) =>
                  addLanguage({
                    name: lang.name,
                    level: event.target.value as ProficiencyLevel,
                  })
                }
                className={cn(INPUT_CLASS, "w-[8.5rem] shrink-0")}
                aria-label={`Proficiency for ${lang.name}`}
              >
                {PROFICIENCY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {formatProficiencyShort(level)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeLanguage(lang.name)}
                className="shrink-0 rounded-lg p-2 hover:bg-[oklch(0.65_0.2_25_/_0.12)]"
                style={{ color: MUTED }}
                aria-label={`Remove ${lang.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <Combobox
        value={query}
        onChange={(value) => {
          if (value) handlePick(value);
        }}
        onClose={() => setQuery(query)}
      >
        <div className="relative">
          <ComboboxInput
            id={`${idPrefix}-search`}
            className={INPUT_CLASS}
            displayValue={() => query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onKeyDown={handleQueryKeyDown}
            placeholder="Search languages…"
            autoComplete="off"
          />
          {suggestions.length > 0 ? (
            <ComboboxOptions
              anchor="bottom start"
              className="z-50 mt-1 max-h-48 w-[var(--input-width)] overflow-auto rounded-xl border border-white/10 bg-[oklch(0.14_0.02_268)] py-1 shadow-lg empty:invisible"
            >
              {suggestions.map((name) => (
                <ComboboxOption
                  key={name}
                  value={name}
                  className="cursor-pointer px-4 py-2 text-sm text-[oklch(0.92_0.01_268)] data-[focus]:bg-white/[0.08]"
                >
                  {name}
                </ComboboxOption>
              ))}
            </ComboboxOptions>
          ) : null}
        </div>
      </Combobox>

      {pendingLanguage ? (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-xs" style={{ color: MUTED }}>
            {pendingLanguage} — select proficiency
          </p>
          <div className="flex flex-wrap gap-2">
            {PROFICIENCY_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => commitLanguage(pendingLanguage, level)}
                className={cn(
                  monoClass,
                  "rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors hover:border-[oklch(0.62_0.21_265_/_0.45)] hover:bg-white/[0.06]",
                )}
                style={{ color: PRIMARY }}
              >
                {formatProficiencyShort(level)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
