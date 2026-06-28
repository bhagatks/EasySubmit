"use client";

import { useEffect, useRef } from "react";
import { trackAtsGuidelinesSectionViewed } from "@/src/shared/analytics";

/**
 * Observes `[data-guideline-section]` blocks and emits PostHog when each scrolls into view.
 */
export function AtsGuidelinesSectionTracker() {
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-guideline-section]");
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const title = entry.target.getAttribute("data-guideline-section");
          if (!title || seenRef.current.has(title)) continue;
          seenRef.current.add(title);
          trackAtsGuidelinesSectionViewed(title);
        }
      },
      { threshold: 0.25 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return null;
}
