"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export function buildWorkspaceExpansionState(
  sectionIds: string[],
  defaultExpanded = false,
): Record<string, boolean> {
  return Object.fromEntries(sectionIds.map((id) => [id, defaultExpanded]));
}

export function useWorkspaceSectionExpansion(
  sectionIds: string[],
  defaultExpanded = false,
) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    buildWorkspaceExpansionState(sectionIds, defaultExpanded),
  );

  const sectionIdsKey = sectionIds.join("\0");

  useEffect(() => {
    const ids = sectionIdsKey ? sectionIdsKey.split("\0") : [];

    setExpanded((current) => {
      const next = { ...current };
      let changed = false;

      for (const id of ids) {
        if (!(id in next)) {
          next[id] = defaultExpanded;
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
  }, [defaultExpanded, sectionIdsKey]);

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
