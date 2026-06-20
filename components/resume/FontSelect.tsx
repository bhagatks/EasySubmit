"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_RESUME_FONT_ID,
  RESUME_FONTS,
  type ResumeFontId,
  readStoredResumeFontId,
  writeStoredResumeFontId,
} from "@/lib/resume/resume-fonts";
import { cn } from "@/lib/utils";

type FontSelectProps = {
  value: ResumeFontId;
  onChange: (id: ResumeFontId) => void;
  monoClass?: string;
  className?: string;
};

export function FontSelect({ value, onChange, monoClass, className }: FontSelectProps) {
  return (
    <label className={cn("flex items-center gap-2 text-xs", className)}>
      <span className={cn(monoClass, "shrink-0 uppercase tracking-[0.12em] text-muted-foreground")}>
        Font
      </span>
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value as ResumeFontId;
          writeStoredResumeFontId(next);
          onChange(next);
        }}
        className="max-w-[11rem] rounded-xl border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-mint/50 focus:outline-none focus:ring-1 focus:ring-mint/30"
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
