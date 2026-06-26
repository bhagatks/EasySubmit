import type { CoordinatesValues } from "@/components/onboarding/hub/CoordinatesPanel";
import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { StructuredResume } from "@/lib/resume/heuristicParser";

export const WORKBENCH_SESSION_STORAGE_KEY = "easysubmit-workbench-session";
export const WORKBENCH_SESSION_VERSION = 1;

export type WorkbenchSessionSnapshot = {
  version: typeof WORKBENCH_SESSION_VERSION;
  phase: number;
  coordinates: CoordinatesValues;
  refineryForm: HubRefineryForm;
  refineryInitial: HubRefineryForm;
  refineryRevision: number;
  rawResumeText: string | null;
  parsedStructured: StructuredResume | null;
  resumeData: PrimeResumeData;
  sectionExpansion: Record<string, boolean> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readWorkbenchSession(): WorkbenchSessionSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(WORKBENCH_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== WORKBENCH_SESSION_VERSION) {
      return null;
    }

    if (typeof parsed.phase !== "number" || parsed.phase < 1 || parsed.phase > 3) {
      return null;
    }

    return parsed as WorkbenchSessionSnapshot;
  } catch {
    return null;
  }
}

export function writeWorkbenchSession(snapshot: WorkbenchSessionSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      WORKBENCH_SESSION_STORAGE_KEY,
      JSON.stringify({
        ...snapshot,
        version: WORKBENCH_SESSION_VERSION,
      }),
    );
  } catch {
    // Quota or private mode — ignore.
  }
}

export function clearWorkbenchSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(WORKBENCH_SESSION_STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
