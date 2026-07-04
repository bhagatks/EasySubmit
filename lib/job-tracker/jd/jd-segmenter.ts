// Layer 2 — Split a cleaned JD into weighted sections.
// Priority: JSON-LD structured fields → header detection → heuristics → full-text fallback.
// Never throws.

import type { JDSegments, JSONLDJobFields } from "@/lib/job-tracker/jd/jd-intelligence";

function wc(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// ─── Header patterns ──────────────────────────────────────────────────────────

const REQUIREMENTS_HEADERS = [
  /^(?:minimum\s+)?requirements?/i,
  /^what\s+you(?:'ll|\s+will)\s+(?:need|bring)/i,
  /^qualifications?/i,
  /^basic\s+qualifications?/i,
  /^must[- ]have/i,
  /^you\s+(?:have|possess)/i,
  /^about\s+you/i,
  /^skills?\s+(?:and\s+)?(?:experience|qualifications?)/i,
];

const RESPONSIBILITIES_HEADERS = [
  /^(?:key\s+)?responsibilities?/i,
  /^what\s+you(?:'ll|\s+will)\s+do/i,
  /^the\s+role/i,
  /^your\s+role/i,
  /^job\s+description:?/i,
  /^job\s+(?:duties|responsibilities?|functions?)/i,
  /^duties\s+(?:and\s+responsibilities?)?/i,
  /^day[- ]to[- ]day/i,
  /^in\s+this\s+role/i,
  /^you(?:'ll|\s+will)\s+be\s+responsible/i,
];

const PREFERRED_HEADERS = [
  /^preferred\s+(?:qualifications?|skills?|experience)?/i,
  /^nice[- ]to[- ]have/i,
  /^bonus\s+(?:points?|if|qualifications?)/i,
  /^desired\s+qualifications?/i,
  /^plus(?:es)?/i,
];

const CONTEXT_HEADERS = [
  /^about\s+(?:the\s+(?:role|team|company|position)|us)/i,
  /^overview/i,
  /^the\s+opportunity/i,
  /^position\s+overview/i,
  /^company\s+(?:overview|description)/i,
  /^introduction/i,
  /^summary/i,
];

type SectionType = "requirements" | "responsibilities" | "preferred" | "context" | "noise";

function matchHeader(line: string): SectionType | null {
  const trimmed = line.trim();
  if (REQUIREMENTS_HEADERS.some((r) => r.test(trimmed))) return "requirements";
  if (RESPONSIBILITIES_HEADERS.some((r) => r.test(trimmed))) return "responsibilities";
  if (PREFERRED_HEADERS.some((r) => r.test(trimmed))) return "preferred";
  if (CONTEXT_HEADERS.some((r) => r.test(trimmed))) return "context";
  return null;
}

function isLikelyHeader(line: string): boolean {
  const trimmed = line.trim();
  // Short lines (< 70 chars) that aren't bullet-like and don't end with a sentence period
  return (
    trimmed.length > 2 &&
    trimmed.length < 70 &&
    !trimmed.startsWith("-") &&
    !trimmed.startsWith("•") &&
    !trimmed.startsWith("*") &&
    !trimmed.endsWith(".")
  );
}

// ─── Header-based segmentation ────────────────────────────────────────────────

function segmentByHeaders(text: string): {
  sections: Record<SectionType, string[]>;
  found: boolean;
} {
  const lines = text.split("\n");
  const sections: Record<SectionType, string[]> = {
    requirements: [],
    responsibilities: [],
    preferred: [],
    context: [],
    noise: [],
  };

  let current: SectionType = "noise";
  let foundAny = false;

  for (const line of lines) {
    if (!line.trim()) continue;

    if (isLikelyHeader(line)) {
      const matched = matchHeader(line);
      if (matched) {
        current = matched;
        foundAny = true;
        continue;
      }
    }

    sections[current].push(line);
  }

  return { sections, found: foundAny };
}

// ─── Heuristic segmentation for headerless JDs ───────────────────────────────
// Uses keyword density per paragraph to assign to the best section.

function segmentByHeuristics(text: string): Record<SectionType, string[]> {
  const paragraphs = text.split(/\n\n+/);
  const sections: Record<SectionType, string[]> = {
    requirements: [],
    responsibilities: [],
    preferred: [],
    context: [],
    noise: [],
  };

  const REQUIREMENTS_SIGNALS = [
    /\b(?:required|must\s+have|at\s+least\s+\d+\s+year|minimum\s+\d+|bs\s+in|bachelor|master|phd|degree\s+in)\b/i,
  ];
  const RESPONSIBILITIES_SIGNALS = [
    /\b(?:you\s+will|you(?:'ll)?\s+be|responsible\s+for|your\s+duties|you\s+(?:design|build|lead|own|work|collaborate))\b/i,
  ];
  const PREFERRED_SIGNALS = [
    /\b(?:preferred|nice\s+to\s+have|bonus|plus|desired|ideally)\b/i,
  ];

  for (const para of paragraphs) {
    if (!para.trim()) continue;
    if (PREFERRED_SIGNALS.some((r) => r.test(para))) {
      sections.preferred.push(para);
    } else if (REQUIREMENTS_SIGNALS.some((r) => r.test(para))) {
      sections.requirements.push(para);
    } else if (RESPONSIBILITIES_SIGNALS.some((r) => r.test(para))) {
      sections.responsibilities.push(para);
    } else {
      // Assign first third to context, last third to responsibilities
      sections.responsibilities.push(para);
    }
  }

  return sections;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function segmentJobDescription(
  cleaned: string,
  jsonLdFields?: JSONLDJobFields,
): JDSegments {
  try {
    // Priority 1: JSON-LD structured fields (highest quality signal)
    if (
      jsonLdFields?.qualifications?.trim() ||
      jsonLdFields?.responsibilities?.trim()
    ) {
      const requirements = jsonLdFields.qualifications?.trim() ?? "";
      const responsibilities = jsonLdFields.responsibilities?.trim() ?? "";
      // Fall through to header/heuristic for preferred + context from cleaned text
      const { sections } = segmentByHeaders(cleaned);
      return {
        requirements: requirements || sections.requirements.join("\n"),
        responsibilities: responsibilities || sections.responsibilities.join("\n"),
        preferred: sections.preferred.join("\n"),
        context: sections.context.join("\n"),
        source: "json-ld",
        wordCount: {
          requirements: wc(requirements),
          responsibilities: wc(responsibilities),
          preferred: wc(sections.preferred.join(" ")),
        },
      };
    }

    // Priority 2: Header-based detection
    const { sections: headerSections, found } = segmentByHeaders(cleaned);
    if (found) {
      const requirements = headerSections.requirements.join("\n");
      const responsibilities = headerSections.responsibilities.join("\n");
      const preferred = headerSections.preferred.join("\n");
      const context = headerSections.context.join("\n");

      // If header parse gave us at least requirements or responsibilities, use it
      if (requirements.trim() || responsibilities.trim()) {
        return {
          requirements,
          responsibilities,
          preferred,
          context,
          source: "header",
          wordCount: {
            requirements: wc(requirements),
            responsibilities: wc(responsibilities),
            preferred: wc(preferred),
          },
        };
      }
    }

    // Priority 3: Heuristic paragraph classification
    const heuristicSections = segmentByHeuristics(cleaned);
    const req = heuristicSections.requirements.join("\n\n");
    const resp = heuristicSections.responsibilities.join("\n\n");
    const pref = heuristicSections.preferred.join("\n\n");
    const ctx = heuristicSections.context.join("\n\n");

    if (req.trim() || resp.trim()) {
      return {
        requirements: req,
        responsibilities: resp,
        preferred: pref,
        context: ctx,
        source: "heuristic",
        wordCount: {
          requirements: wc(req),
          responsibilities: wc(resp),
          preferred: wc(pref),
        },
      };
    }

    // Priority 4: Full-text fallback — treat entire JD as requirements
    return {
      requirements: cleaned,
      responsibilities: "",
      preferred: "",
      context: "",
      source: "full-text",
      wordCount: {
        requirements: wc(cleaned),
        responsibilities: 0,
        preferred: 0,
      },
    };
  } catch {
    return {
      requirements: cleaned,
      responsibilities: "",
      preferred: "",
      context: "",
      source: "full-text",
      wordCount: { requirements: wc(cleaned), responsibilities: 0, preferred: 0 },
    };
  }
}
