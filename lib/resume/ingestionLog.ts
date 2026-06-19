import type { StructuredResume } from "@/lib/resume/heuristicParser";
import type { ParseResumeMeta } from "@/app/actions/parser";

export type IngestionLogLine = {
  id: string;
  prefix: "[INGESTING]" | "[MAPPING]" | "[OK]" | "[SYNC]";
  message: string;
  status: "pending" | "active" | "done" | "error";
};

export function buildIngestionLogLines(
  data: StructuredResume,
  meta: ParseResumeMeta,
): IngestionLogLine[] {
  const lines: IngestionLogLine[] = [
    {
      id: "init",
      prefix: "[INGESTING]",
      message: "Buffer loaded — starting extraction pipeline",
      status: "done",
    },
    {
      id: "parser",
      prefix: "[MAPPING]",
      message:
        meta.parser === "open-resume-pdf"
          ? "Open-Resume PDF engine (browser · coordinate + font scoring)"
          : "Heuristic text engine (DOCX · interim)",
      status: "done",
    },
  ];

  if (data.name?.trim()) {
    lines.push({
      id: "name",
      prefix: "[INGESTING]",
      message: `Identity: ${data.name.trim()}`,
      status: "done",
    });
  }

  data.experience.forEach((job, index) => {
    const label = job.company.trim() || job.role.trim() || `Role ${index + 1}`;
    lines.push({
      id: `job-${index}`,
      prefix: "[INGESTING]",
      message: `${label} experience… OK`,
      status: "done",
    });
  });

  if (meta.skillCount > 0) {
    lines.push({
      id: "skills",
      prefix: "[MAPPING]",
      message: `${meta.skillCount} technical skills identified`,
      status: "done",
    });
  }

  if (meta.educationCount > 0) {
    lines.push({
      id: "education",
      prefix: "[MAPPING]",
      message: `${meta.educationCount} education entries mapped`,
      status: "done",
    });
  }

  lines.push({
    id: "summary",
    prefix: "[OK]",
    message: `Found ${meta.jobCount} jobs, ${meta.skillCount} skills — ready for refinery`,
    status: "done",
  });

  return lines;
}

export function buildProcessingLogLines(): IngestionLogLine[] {
  return [
    {
      id: "scan",
      prefix: "[INGESTING]",
      message: "Scanning document layers…",
      status: "active",
    },
    {
      id: "sections",
      prefix: "[MAPPING]",
      message: "Detecting section anchors…",
      status: "pending",
    },
    {
      id: "features",
      prefix: "[MAPPING]",
      message: "Running feature scoring…",
      status: "pending",
    },
  ];
}
