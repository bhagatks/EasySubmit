"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_RESUME_FONT_ID,
  getResumeFontSpec,
  RESUME_FONTS,
  type ResumeFontId,
  readStoredResumeFontId,
  writeStoredResumeFontId,
} from "@/lib/resume/resume-fonts";
import { studioSelectClass, studioSelectStyle } from "@/lib/resume/studio-field-styles";
import { cn } from "@/lib/utils";

type FontSelectProps = {
  value: ResumeFontId;
  onChange: (id: ResumeFontId) => void;
  layout?: "inline" | "stacked";
  showLabel?: boolean;
  variant?: "onboarding" | "dashboard";
  monoClass?: string;
  className?: string;
  selectClassName?: string;
  labelClassName?: string;
  hintClassName?: string;
};

const INLINE_SELECT_BASE =
  "rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-mint/50 focus:outline-none focus:ring-1 focus:ring-mint/30";

export function FontSelect({
  value,
  onChange,
  layout = "inline",
  showLabel = true,
  variant = "dashboard",
  monoClass,
  className,
  selectClassName,
  labelClassName,
  hintClassName,
}: FontSelectProps) {
  const selected = getResumeFontSpec(value);
  const selectId = "resume-font-select";

  if (layout === "stacked") {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        {showLabel ? (
          <label
            htmlFor={selectId}
            className={cn("text-sm font-medium text-foreground", labelClassName)}
          >
            Font
          </label>
        ) : null}
        <select
          id={selectId}
          value={value}
          onChange={(event) => {
            const next = event.target.value as ResumeFontId;
            writeStoredResumeFontId(next);
            onChange(next);
          }}
          className={studioSelectClass(variant, selectClassName)}
          style={studioSelectStyle(variant)}
          aria-label="Resume font"
        >
          {RESUME_FONTS.map((font) => (
            <option key={font.id} value={font.id}>
              {font.label}
            </option>
          ))}
        </select>
        {selected.note ? (
          <p className={cn("mt-1.5", hintClassName)}>{selected.note}</p>
        ) : null}
      </div>
    );
  }

  return (
    <label className={cn("flex items-center gap-2 text-xs", className)}>
      <span
        className={cn(
          monoClass,
          "shrink-0 uppercase tracking-[0.12em] text-muted-foreground",
          labelClassName,
        )}
      >
        Font
      </span>
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value as ResumeFontId;
          writeStoredResumeFontId(next);
          onChange(next);
        }}
        className={cn("max-w-[11rem]", INLINE_SELECT_BASE, selectClassName)}
        aria-label="Resume font"
      >
        {RESUME_FONTS.map((font) => (
          <option key={font.id} value={font.id}>
            {font.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function useResumeFontState(initial: ResumeFontId = DEFAULT_RESUME_FONT_ID) {
  const [fontId, setFontId] = useState<ResumeFontId>(initial);

  useEffect(() => {
    setFontId(readStoredResumeFontId());
  }, []);

  const setFont = (id: ResumeFontId) => {
    writeStoredResumeFontId(id);
    setFontId(id);
  };

  return [fontId, setFont] as const;
}
