import { escapeHtml } from "@/lib/job-tracker/export/html-escape";

export type CoverLetterContext = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  dateLabel: string;
  body: string;
};

export function buildCoverLetterDateLabel(date: Date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildCoverLetterContext(input: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle: string;
  body?: string | null;
  now?: Date;
}): CoverLetterContext {
  return {
    firstName: input.firstName?.trim() || "",
    lastName: input.lastName?.trim() || "",
    email: input.email?.trim() || "",
    phone: input.phone?.trim() || "",
    company: input.company?.trim() || "Hiring team",
    jobTitle: input.jobTitle.trim() || "Role",
    dateLabel: buildCoverLetterDateLabel(input.now),
    body: input.body?.trim() || "",
  };
}

export function coverLetterDisplayName(ctx: CoverLetterContext): string {
  const name = [ctx.firstName, ctx.lastName].filter(Boolean).join(" ").trim();
  return name || "Applicant";
}

export function buildCoverLetterPlainText(ctx: CoverLetterContext): string {
  const lines = [
    coverLetterDisplayName(ctx),
    ctx.email,
    ctx.phone,
    "",
    ctx.dateLabel,
    "",
    ctx.company,
    `Re: ${ctx.jobTitle}`,
    "",
    ctx.body,
  ].filter((line, index) => {
    if (line) return true;
    return index > 0;
  });

  return lines.join("\n").trim();
}

export function buildCoverLetterHtml(
  ctx: CoverLetterContext,
  options?: { includeToolbarSpacer?: boolean },
): string {
  const includeToolbarSpacer = options?.includeToolbarSpacer ?? true;
  const name = escapeHtml(coverLetterDisplayName(ctx));
  const contact = [ctx.email, ctx.phone].filter(Boolean).map(escapeHtml).join(" · ");
  const hasBody = Boolean(ctx.body.trim());

  const letterContent = hasBody
    ? `<div class="meta">
    <div>${name}</div>
    ${contact ? `<div>${contact}</div>` : ""}
  </div>
  <div class="meta">${escapeHtml(ctx.dateLabel)}</div>
  <div class="meta">
    <div>${escapeHtml(ctx.company)}</div>
    <div>Re: ${escapeHtml(ctx.jobTitle)}</div>
  </div>
  <div class="body">${escapeHtml(ctx.body)}</div>`
    : `<div class="empty">
    <p class="empty-title">No cover letter yet</p>
    <p class="empty-desc">Use Enhance with AI or Edit to add a cover letter for this role.</p>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cover letter</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.55;
      color: #1f2937;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .page {
      width: 100%;
      margin: 0;
      background: #ffffff;
      padding: 0 2rem 1.5rem;
    }
    .toolbar-spacer {
      height: 40px;
    }
    .meta { margin-bottom: 1.25rem; color: #4b5563; }
    .body { white-space: pre-wrap; color: #1f2937; }
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 320px;
      padding: 48px 24px;
      text-align: center;
    }
    .empty-title {
      margin: 0;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      font-size: 14pt;
      font-weight: 600;
      color: #1f2937;
    }
    .empty-desc {
      margin: 8px 0 0;
      max-width: 360px;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="page">
    ${includeToolbarSpacer ? '<div class="toolbar-spacer" aria-hidden="true"></div>' : ""}
    ${letterContent}
  </div>
</body>
</html>`;
}
