"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PAGE_SIZE_ID,
  PAGE_SIZES,
  type PageSizeId,
  readStoredPageSizeId,
  writeStoredPageSizeId,
} from "@/lib/resume/page-sizes";
import { cn } from "@/lib/utils";

type PageSizeSelectProps = {
  value: PageSizeId;
  onChange: (id: PageSizeId) => void;
  monoClass?: string;
  className?: string;
};

export function PageSizeSelect({
  value,
  onChange,
  monoClass,
  className,
}: PageSizeSelectProps) {
  return (
    <label className={cn("flex items-center gap-2 text-xs", className)}>
      <span className={cn(monoClass, "shrink-0 uppercase tracking-[0.12em] text-muted-foreground")}>
        Page size
      </span>
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value as PageSizeId;
          writeStoredPageSizeId(next);
          onChange(next);
        }}
        className="rounded-xl border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-mint/50 focus:outline-none focus:ring-1 focus:ring-mint/30"
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
