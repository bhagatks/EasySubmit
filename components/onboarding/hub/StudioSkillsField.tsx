"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { fuzzySearchMasterSkills } from "@/src/lib/constants/skills";
import { normalizeSkillList } from "@/lib/onboarding/normalizeSkills";
import { MIN_STUDIO_SKILLS } from "@/lib/onboarding/studio";
import { useOnboardingStore } from "@/src/stores/onboarding-store";
import { cn } from "@/lib/utils";

const CANVAS = "oklch(0.16 0.04 268)";
const PRIMARY = "oklch(0.62 0.21 265)";
const MINT = "oklch(0.82 0.16 165)";
const MUTED = "oklch(0.45 0.02 268)";
const INK = "oklch(0.98 0.01 268)";

const FOCUS_RING =
  "focus:border-[oklch(0.62_0.21_265_/_0.55)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.62_0.21_265_/_0.35)]";

type StudioSkillsFieldProps = {
  monoClass: string;
  /** When provided, skills are controlled locally (dashboard studio) instead of onboarding store. */
  skills?: string[];
  onSkillsChange?: (skills: string[]) => void;
};

export function StudioSkillsField({
  monoClass,
  skills: controlledSkills,
  onSkillsChange,
}: StudioSkillsFieldProps) {
  const storeSkills = useOnboardingStore((state) => state.studio.skills);
  const toggleSkill = useOnboardingStore((state) => state.toggleSkill);
  const skills = controlledSkills ?? storeSkills;
  const [query, setQuery] = useState("");

  const selectedSkills = normalizeSkillList(skills);
  const trimmedQuery = query.trim();
  const requirementMet = selectedSkills.length >= MIN_STUDIO_SKILLS;

  const isSelected = useCallback(
    (skill: string) =>
      selectedSkills.some((entry) => entry.toLowerCase() === skill.toLowerCase()),
    [selectedSkills],
  );

  const suggestions = useMemo(
    () =>
      fuzzySearchMasterSkills(query, 12).filter((skill) => !isSelected(skill)),
    [query, isSelected],
  );

  function addSkill(skill: string) {
    const next = skill.trim();
    if (!next || isSelected(next)) return;

    if (onSkillsChange) {
      const normalized = normalizeSkillList(skills);
      if (normalized.some((entry) => entry.toLowerCase() === next.toLowerCase())) {
        return;
      }
      onSkillsChange([...normalized, next]);
    } else {
      toggleSkill(next);
    }
    setQuery("");
  }

  function removeSkill(skill: string) {
    if (onSkillsChange) {
      onSkillsChange(
        normalizeSkillList(skills).filter(
          (entry) => entry.toLowerCase() !== skill.toLowerCase(),
        ),
      );
    } else {
      toggleSkill(skill);
    }
  }

  return (
    <section
      aria-labelledby="studio-skills-heading"
      className="rounded-xl border border-white/10 bg-[oklch(0.16_0.04_268)] p-4 sm:p-5"
    >
      <div className="space-y-2">
        <p
          id="studio-skills-heading"
          className={cn(
            monoClass,
            "text-[11px] font-semibold uppercase tracking-[0.22em]",
          )}
          style={{ color: INK }}
        >
          REQUIRED: {MIN_STUDIO_SKILLS}+ SKILLS
        </p>
        <p className="text-sm leading-relaxed" style={{ color: MINT }}>
          Add as many skills as possible to maximize ATS penetration.
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p
          className={cn(monoClass, "text-[10px] uppercase tracking-[0.14em]")}
          style={{ color: MUTED }}
        >
          Selected
        </p>
        <p
          className={cn(monoClass, "text-[10px] font-medium uppercase tracking-[0.14em]")}
          style={{ color: requirementMet ? MINT : INK }}
          aria-live="polite"
        >
          {selectedSkills.length} / {MIN_STUDIO_SKILLS} minimum
        </p>
      </div>

      <div className="mt-3 min-h-[2.75rem]">
        {selectedSkills.length > 0 ? (
          <ul
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            aria-label="Selected skills"
          >
            {selectedSkills.map((skill) => (
              <li key={skill} className="min-w-0">
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className={cn(
                    monoClass,
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-medium tracking-[0.02em] transition-opacity hover:opacity-90",
                  )}
                  style={{
                    color: MINT,
                    backgroundColor: CANVAS,
                    boxShadow: "inset 0 0 0 1px oklch(0.82 0.16 165 / 0.35)",
                  }}
                  aria-label={`Remove ${skill}`}
                >
                  <span className="min-w-0 flex-1 break-words">{skill}</span>
                  <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
            Search and select skills — each one updates your resume preview instantly.
          </p>
        )}
      </div>

      <Combobox value={null} onChange={(value: string | null) => value && addSkill(value)}>
        <div className="relative mt-4">
          <label htmlFor="studio-skills-combobox" className="sr-only">
            Search skills
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: MINT }}
            aria-hidden="true"
          />
          <ComboboxInput
            id="studio-skills-combobox"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={cn(
              "w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-10 text-sm text-[oklch(0.98_0.01_268)] placeholder:text-[oklch(0.45_0.02_268)]",
              FOCUS_RING,
            )}
            placeholder="Search skills…"
            autoComplete="off"
            name="es-studio-skills"
          />
          <ChevronsUpDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: MUTED }}
            aria-hidden="true"
          />

          <ComboboxOptions className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-white/10 bg-[oklch(0.14_0.04_268)] py-1 shadow-[0_16px_40px_-12px_oklch(0_0_0_/_0.65)] empty:invisible">
            {suggestions.length === 0 ? (
              <p className="px-4 py-3 text-xs" style={{ color: MUTED }}>
                {trimmedQuery ? "No matching skills" : "Type to search the skills library"}
              </p>
            ) : (
              suggestions.map((skill) => (
                <ComboboxOption
                  key={skill}
                  value={skill}
                  className={({ focus }) =>
                    cn(
                      "flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors",
                      focus && "bg-white/[0.06]",
                    )
                  }
                >
                  {({ focus, selected }) => (
                    <>
                      <span style={{ color: focus ? PRIMARY : INK }}>{skill}</span>
                      {selected ? (
                        <Check className="h-4 w-4 shrink-0" style={{ color: MINT }} />
                      ) : null}
                    </>
                  )}
                </ComboboxOption>
              ))
            )}
          </ComboboxOptions>
        </div>
      </Combobox>
    </section>
  );
}
