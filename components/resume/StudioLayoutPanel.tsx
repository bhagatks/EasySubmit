"use client";

import { useState } from "react";
import { FontSelect } from "@/components/resume/FontSelect";
import { PageSizeSelect } from "@/components/resume/PageSizeSelect";
import { StudioCollapsibleSection } from "@/components/resume/StudioCollapsibleSection";
import type { ResumeFontId } from "@/lib/resume/resume-fonts";
import type { PageSizeId } from "@/lib/resume/page-sizes";
import { studioFieldHintClass } from "@/lib/resume/studio-field-styles";
import { cn } from "@/lib/utils";

type StudioLayoutPanelProps = {
  fontId: ResumeFontId;
  pageSizeId: PageSizeId;
  onFontChange: (id: ResumeFontId) => void;
  onPageSizeChange: (id: PageSizeId) => void;
  variant?: "onboarding" | "dashboard";
  monoClass?: string;
  className?: string;
};

export function StudioLayoutPanel({
  fontId,
  pageSizeId,
  onFontChange,
  onPageSizeChange,
  variant = "dashboard",
  monoClass,
  className,
}: StudioLayoutPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    font: true,
    pageSize: true,
  });

  const toggleSection = (sectionId: "font" | "pageSize") => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  const hintClass = studioFieldHintClass(variant);

  return (
    <div
      className={cn("flex flex-col space-y-3", className)}
      aria-label="Preview layout settings"
    >
      <StudioCollapsibleSection
        title="Font"
        expanded={expandedSections.font}
        onToggle={() => toggleSection("font")}
        variant={variant}
        monoClass={monoClass}
        showDragHandle={false}
      >
        <p className={cn("mb-3", hintClass)}>
          ATS-safe families only. Body text stays at 10–12pt per our rules.
        </p>
        <FontSelect
          layout="stacked"
          showLabel={false}
          variant={variant}
          value={fontId}
          onChange={onFontChange}
          hintClassName={hintClass}
        />
      </StudioCollapsibleSection>

      <StudioCollapsibleSection
        title="Page size"
        expanded={expandedSections.pageSize}
        onToggle={() => toggleSection("pageSize")}
        variant={variant}
        monoClass={monoClass}
        showDragHandle={false}
      >
        <p className={cn("mb-3", hintClass)}>
          US Letter for North America; A4 for UK, EU, Australia, and international roles.
        </p>
        <PageSizeSelect
          layout="stacked"
          showLabel={false}
          variant={variant}
          value={pageSizeId}
          onChange={onPageSizeChange}
          hintClassName={hintClass}
        />
      </StudioCollapsibleSection>
    </div>
  );
}
