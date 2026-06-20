"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PAGE_SIZE_ID,
  getPageSizeSpec,
  PAGE_SIZES,
  type PageSizeId,
  readStoredPageSizeId,
  writeStoredPageSizeId,
} from "@/lib/resume/page-sizes";
import { studioSelectClass, studioSelectStyle } from "@/lib/resume/studio-field-styles";
import { cn } from "@/lib/utils";

type PageSizeSelectProps = {
  value: PageSizeId;
  onChange: (id: PageSizeId) => void;
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

const PAGE_SIZE_HINT: Record<PageSizeId, string> = {
  letter: "Standard for US and Canada job applications.",
  a4: "Standard for UK, EU, Australia, and international roles.",
};

export function PageSizeSelect({
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
}: PageSizeSelectProps) {
  const selectId = "resume-page-size-select";
  const hint = PAGE_SIZE_HINT[getPageSizeSpec(value).id];

  if (layout === "stacked") {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        {showLabel ? (
          <label
            htmlFor={selectId}
            className={cn("text-sm font-medium text-foreground", labelClassName)}
          >
            Page size
          </label>
        ) : null}
        <select
          id={selectId}
          value={value}
          onChange={(event) => {
            const next = event.target.value as PageSizeId;
            writeStoredPageSizeId(next);
            onChange(next);
          }}
          className={studioSelectClass(variant, selectClassName)}
          style={studioSelectStyle(variant)}
          aria-label="Resume page size"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size.id} value={size.id}>
              {size.label}
            </option>
          ))}
        </select>
        <p className={cn("mt-1.5", hintClassName)}>{hint}</p>
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
        Page size
      </span>
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value as PageSizeId;
          writeStoredPageSizeId(next);
          onChange(next);
        }}
        className={cn(INLINE_SELECT_BASE, selectClassName)}
        aria-label="Resume page size"
      >
        {PAGE_SIZES.map((size) => (
          <option key={size.id} value={size.id}>
            {size.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function usePageSizeState(initial: PageSizeId = DEFAULT_PAGE_SIZE_ID) {
  const [pageSizeId, setPageSizeId] = useState<PageSizeId>(initial);

  useEffect(() => {
    setPageSizeId(readStoredPageSizeId());
  }, []);

  const setPageSize = (id: PageSizeId) => {
    writeStoredPageSizeId(id);
    setPageSizeId(id);
  };

  return [pageSizeId, setPageSize] as const;
}
