export type CoverDetailDraft = {
  body: string;
};

export function normalizeCoverDetailDraft(draft: CoverDetailDraft): CoverDetailDraft {
  return { body: draft.body.trim() };
}

export function coverDetailDraftsEqual(a: CoverDetailDraft, b: CoverDetailDraft): boolean {
  return normalizeCoverDetailDraft(a).body === normalizeCoverDetailDraft(b).body;
}
