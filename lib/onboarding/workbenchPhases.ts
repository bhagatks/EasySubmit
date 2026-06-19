/** User-facing labels for the 4-phase onboarding workbench (hub `/onboarding`). */

export type WorkbenchPhaseDef = {
  id: number;
  label: string;
  code: string;
  headline: string;
  description: string;
};

export const WORKBENCH_PHASES: WorkbenchPhaseDef[] = [
  {
    id: 1,
    label: "Identity",
    code: "IDENTITY",
    headline: "Contact & identity",
    description:
      "Header details for your resume — they carry into import and studio.",
  },
  {
    id: 2,
    label: "Import",
    code: "IMPORT",
    headline: "Import your resume",
    description:
      "Drop PDF or Word — Word converts to PDF first, then uses the same parser as PDF uploads.",
  },
  {
    id: 3,
    label: "Studio",
    code: "STUDIO",
    headline: "Refine your resume",
    description:
      "ATS section order — header, summary, skills, experience, education, then optional blocks.",
  },
  {
    id: 4,
    label: "Launch",
    code: "LAUNCH",
    headline: "Launching your profile",
    description: "Your digital twin is being prepared for the dashboard.",
  },
];

export const WORKBENCH_PHASE_COUNT = WORKBENCH_PHASES.length;

export function getWorkbenchPhase(id: number): WorkbenchPhaseDef | undefined {
  return WORKBENCH_PHASES.find((phase) => phase.id === id);
}

export function workbenchPhaseHeader(id: number): string {
  const phase = getWorkbenchPhase(id);
  return phase ? `Phase ${id} · ${phase.label}` : `Phase ${id}`;
}
