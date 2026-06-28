"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export function buildWorkspaceExpansionState(
  sectionIds: string[],
  defaultExpanded = false,
  expandedOverrides?: Record<string, boolean>,
): Record<string, boolean> {
  return Object.fromEntries(
    sectionIds.map((id) => [id, expandedOverrides?.[id] ?? defaultExpanded]),
  );
}

export function useWorkspaceSectionExpansion(
  sectionIds: string[],
  defaultExpanded = false,
  expandedOverrides?: Record<string, boolean>,
) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    buildWorkspaceExpansionState(sectionIds, defaultExpanded, expandedOverrides),
  );

  const sectionIdsKey = sectionIds.join("\0");

  useEffect(() => {
    const ids = sectionIdsKey ? sectionIdsKey.split("\0") : [];

    setExpanded((current) => {
      const next = { ...current };
      let changed = false;

      for (const id of ids) {
        if (!(id in next)) {
          next[id] = expandedOverrides?.[id] ?? defaultExpanded;
          changed = true;
        }
      }
      for (const id of Object.keys(next)) {
        if (!ids.includes(id)) {
          delete next[id];
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [defaultExpanded, expandedOverrides, sectionIdsKey]);

  const allExpanded = useMemo(
    () => sectionIds.length > 0 && sectionIds.every((id) => Boolean(expanded[id])),
    [expanded, sectionIds],
  );

  const toggleSection = useCallback((sectionId: string) => {
    setExpanded((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }, []);

  const toggleAllSections = useCallback(() => {
    setExpanded(buildWorkspaceExpansionState(sectionIds, !allExpanded));
  }, [allExpanded, sectionIds]);

  return {
    expanded,
    setExpanded,
    allExpanded,
    toggleSection,
    toggleAllSections,
  };
}
