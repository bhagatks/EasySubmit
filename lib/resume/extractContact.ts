const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/;
const PHONE_REGEX =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const LINKEDIN_REGEX =
  /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[\w%-]+(?:\/[\w%-]*)?/gi;
const GITHUB_REGEX =
  /(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+(?:\/[^\s),;|]*)?/gi;

const GITHUB_RESERVED_SEGMENTS = new Set([
  "about",
  "apps",
  "collections",
  "customer-stories",
  "enterprise",
  "explore",
  "features",
  "login",
  "marketplace",
  "new",
  "orgs",
  "pricing",
  "security",
  "settings",
  "signup",
  "sponsors",
  "topics",
  "trending",
]);

export type ResumeEssentials = {
  email: string | null;
  phone: string | null;
};

export type ResumeUrls = {
  linkedin: string | null;
  github: string | null;
};

function normalizeUrl(url: string): string {
  const trimmed = url.trim().replace(/[),.;|]+$/, "");
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

function extractEmail(text: string): string | null {
  const match = text.match(EMAIL_REGEX);
  return match?.[0]?.toLowerCase() ?? null;
}

function extractPhone(text: string): string | null {
  const match = text.match(PHONE_REGEX);
  return match?.[0]?.trim() ?? null;
}

function extractLinkedIn(text: string): string | null {
  const matches = text.match(LINKEDIN_REGEX);
  if (!matches?.length) {
    return null;
  }

  return normalizeUrl(matches[0]);
}

function extractGitHub(text: string): string | null {
  const matches = text.match(GITHUB_REGEX);
  if (!matches?.length) {
    return null;
  }

  for (const raw of matches) {
    const normalized = normalizeUrl(raw);
    const segment = normalized.replace(/\/$/, "").split("/").pop()?.toLowerCase();

    if (segment && !GITHUB_RESERVED_SEGMENTS.has(segment)) {
      const username = normalized.match(/github\.com\/([a-zA-Z0-9_-]+)/i)?.[1];
      if (username) {
        return `https://github.com/${username}`;
      }
    }
  }

  return null;
}

export function extractResumeContact(text: string): {
  essentials: ResumeEssentials;
  urls: ResumeUrls;
} {
  return {
    essentials: {
      email: extractEmail(text),
      phone: extractPhone(text),
    },
    urls: {
      linkedin: extractLinkedIn(text),
      github: extractGitHub(text),
    },
  };
}
