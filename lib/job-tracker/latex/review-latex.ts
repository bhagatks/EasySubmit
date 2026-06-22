import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { buildCoverLetterPlainText, type CoverLetterContext } from "@/lib/job-tracker/cover-letter";

function texEscape(value: string): string {
  return value
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%$#_{}]/g, (m) => `\\${m}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

export function generateResumeLatex(form: HubRefineryForm, targetTitle: string): string {
  const name = texEscape(
    [form.firstName, form.lastName].filter(Boolean).join(" ").trim() || "Applicant",
  );
  const contact = [
    form.cityState,
    form.phone,
    form.email,
    form.linkedIn,
  ]
    .map((v) => v?.trim())
    .filter(Boolean)
    .map(texEscape)
    .join(" \\textbar{} ");

  const summary = texEscape(form.professionalSummary.trim());
  const skills = texEscape(form.skillsText.trim());

  const experience = form.experience
    .filter((e) => !e.hidden && (e.title || e.company))
    .map((job) => {
      const header = `\\textbf{${texEscape(job.title || "Role")}} — ${texEscape(job.company || "")}`;
      const bullets = job.bullets
        .split("\n")
        .map((b) => b.trim().replace(/^[-•*]\s*/, ""))
        .filter(Boolean)
        .map((b) => `  \\item ${texEscape(b)}`)
        .join("\n");
      return `${header}\n\\begin{itemize}\n${bullets}\n\\end{itemize}`;
    })
    .join("\n\n");

  return `\\documentclass[11pt,letterpaper]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\setlength{\\parindent}{0pt}
\\begin{document}

{\\LARGE ${name}}\\\\
${contact ? `${contact}\\\\` : ""}
\\textbf{${texEscape(targetTitle)}}

${summary ? `\\section*{Professional Summary}\n${summary}\n` : ""}
${skills ? `\\section*{Skills}\n${skills}\n` : ""}
${experience ? `\\section*{Experience}\n${experience}\n` : ""}

\\end{document}
`;
}

export function generateCoverLatex(ctx: CoverLetterContext): string {
  const plain = buildCoverLetterPlainText(ctx);
  const body = texEscape(plain);
  return `\\documentclass[11pt,letterpaper]{article}
\\usepackage[margin=1in]{geometry}
\\setlength{\\parindent}{0pt}
\\begin{document}
${body}
\\end{document}
`;
}

export type LatexValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export function validateLatexSource(source: string): LatexValidationResult {
  const errors: string[] = [];
  const trimmed = source.trim();

  if (!trimmed) {
    return { ok: false, errors: ["LaTeX source is empty."] };
  }
  if (!trimmed.includes("\\begin{document}")) {
    errors.push("Missing \\begin{document}.");
  }
  if (!trimmed.includes("\\end{document}")) {
    errors.push("Missing \\end{document}.");
  }

  const beginCount = (trimmed.match(/\\begin\{document\}/g) ?? []).length;
  const endCount = (trimmed.match(/\\end\{document\}/g) ?? []).length;
  if (beginCount !== endCount) {
    errors.push("\\begin{document} and \\end{document} counts do not match.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

export type LatexCompilePreviewResult =
  | { success: true; previewHtml: string; validatedAt: string }
  | { success: false; errors: string[] };

/** v1: validate TeX structure; visual preview comes from the HTML document model. */
export function compileLatexPreview(input: {
  latex: string;
  previewHtml: string;
}): LatexCompilePreviewResult {
  const validation = validateLatexSource(input.latex);
  if (!validation.ok) {
    return { success: false, errors: validation.errors };
  }
  return {
    success: true,
    previewHtml: input.previewHtml,
    validatedAt: new Date().toISOString(),
  };
}
