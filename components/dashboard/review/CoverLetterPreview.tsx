"use client";

import {
  buildCoverLetterContext,
  buildCoverLetterHtml,
  type CoverLetterContext,
} from "@/lib/job-tracker/cover-letter";
import { cn } from "@/lib/utils";

type CoverLetterPreviewProps = {
  ctx: CoverLetterContext;
  className?: string;
  iframe?: boolean;
};

export function buildCoverContextFromEntry(input: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle: string;
  body?: string | null;
}): CoverLetterContext {
  return buildCoverLetterContext(input);
}

export function CoverLetterPreview({ ctx, className, iframe = false }: CoverLetterPreviewProps) {
  const html = buildCoverLetterHtml(ctx);

  if (iframe) {
    return (
      <iframe
        title="Cover letter preview"
        srcDoc={html}
        className={cn("h-full w-full rounded-xl border border-border/70 bg-white", className)}
      />
    );
  }

  if (!ctx.body.trim()) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-surface/40 px-6 py-12 text-center",
          className,
        )}
      >
        <p className="font-medium text-foreground">No cover letter yet</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Use Enhance with AI or Edit to add a cover letter for this role.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto rounded-xl border border-border/70 bg-background/90 p-6 shadow-inner",
        className,
      )}
    >
      <div className="mx-auto max-w-[640px] font-serif text-sm leading-relaxed text-foreground">
        <div className="space-y-1 text-muted-foreground">
          <p className="text-foreground">
            {[ctx.firstName, ctx.lastName].filter(Boolean).join(" ") || "Applicant"}
          </p>
          {ctx.email ? <p>{ctx.email}</p> : null}
          {ctx.phone ? <p>{ctx.phone}</p> : null}
        </div>
        <p className="mt-4 text-muted-foreground">{ctx.dateLabel}</p>
        <div className="mt-4 text-muted-foreground">
          <p>{ctx.company}</p>
          <p>Re: {ctx.jobTitle}</p>
        </div>
        <div className="mt-6 whitespace-pre-wrap text-foreground">{ctx.body}</div>
      </div>
    </div>
  );
}
