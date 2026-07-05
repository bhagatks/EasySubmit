"use client";

import { useState } from "react";
import { FontSelect } from "@/components/resume/FontSelect";
import { PageLengthSelect } from "@/components/resume/PageLengthSelect";
import { PageSizeSelect } from "@/components/resume/PageSizeSelect";
import { StudioCollapsibleSection } from "@/components/resume/StudioCollapsibleSection";
import type { ResumeFontId } from "@/lib/resume/resume-fonts";
import type { PageSizeId } from "@/lib/resume/page-sizes";
import type { PageLengthPreference } from "@/lib/resume/page-length-preference";
import { studioFieldHintClass } from "@/lib/resume/studio-field-styles";
import { cn } from "@/lib/utils";

type StudioLayoutPanelProps = {
  fontId: ResumeFontId;
  pageSizeId: PageSizeId;
  onFontChange: (id: ResumeFontId) => void;
  onPageSizeChange: (id: PageSizeId) => void;
  pageLengthPreference?: PageLengthPreference;
  onPageLengthPreferenceChange?: (value: PageLengthPreference) => void;
  autoPageLengthRecommendation?: string;
  resolvedPageCount?: 1 | 2;
  renderedPageCount?: number;
  rulesV2Enabled?: boolean;
  variant?: "onboarding" | "dashboard";
  monoClass?: string;
  className?: string;
};

export function StudioLayoutPanel({
  fontId,
  pageSizeId,
  onFontChange,
  onPageSizeChange,
  pageLengthPreference,
  onPageLengthPreferenceChange,
  autoPageLengthRecommendation,
  resolvedPageCount,
  renderedPageCount,
  rulesV2Enabled = false,
  variant = "dashboard",
  monoClass,
  className,
}: StudioLayoutPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    font: true,
    pageSize: true,
    pageLength: true,
  });

  const toggleSection = (sectionId: "font" | "pageSize" | "pageLength") => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  const hintClass = studioFieldHintClass(variant);
  const showPageLength = Boolean(onPageLengthPreferenceChange);

  return (
    <div
      className={cn("flex flex-col space-y-3", className)}
      aria-label="Preview layout settings"
    >
      {showPageLength ? (
        <StudioCollapsibleSection
          title="Resume length"
          expanded={expandedSections.pageLength}
          onToggle={() => toggleSection("pageLength")}
          variant={variant}
          monoClass={monoClass}
          showDragHandle={false}
        >
          <p className={cn("mb-3", hintClass)}>
            Controls bullet and role budgets for enhance, validation, and export. Auto follows ATS
            guidance from your experience.
          </p>
          <PageLengthSelect
            value={pageLengthPreference ?? "2"}
            onChange={onPageLengthPreferenceChange!}
            autoRecommendation={autoPageLengthRecommendation ?? ""}
            resolvedPages={resolvedPageCount ?? 1}
            renderedPageCount={renderedPageCount}
            rulesV2Enabled={rulesV2Enabled}
            variant={variant}
            monoClass={monoClass}
            hintClassName={hintClass}
          />
        </StudioCollapsibleSection>
      ) : null}

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
