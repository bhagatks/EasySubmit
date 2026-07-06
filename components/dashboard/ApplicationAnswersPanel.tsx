"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2, Pencil, Search, Trash2 } from "lucide-react";
import {
  deleteApplicationAnswerForSettings,
  listApplicationAnswersForSettings,
  updateApplicationAnswerForSettings,
  type ApplicationAnswerSettingsItem,
} from "@/app/actions/application-answers";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/ui/inline-alert";

type ApplicationAnswersPanelProps = {
  initialAnswers: ApplicationAnswerSettingsItem[];
};

function formatLastUsed(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function platformLabel(platform: string, tenantHost: string | null): string {
  if (tenantHost) return `${platform} · ${tenantHost}`;
  return platform;
}

export function ApplicationAnswersPanel({ initialAnswers }: ApplicationAnswersPanelProps) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ApplicationAnswerSettingsItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return answers;
    return answers.filter(
      (row) =>
        row.label.toLowerCase().includes(q) ||
        row.answerDisplay.toLowerCase().includes(q) ||
        row.platform.toLowerCase().includes(q) ||
        (row.tenantHost ?? "").toLowerCase().includes(q),
    );
  }, [answers, query]);

  const refresh = useCallback(async () => {
    const result = await listApplicationAnswersForSettings();
    if (!result.success) {
      setError(result.error);
      return;
    }
    setAnswers(result.answers);
  }, []);

  function startEdit(row: ApplicationAnswerSettingsItem) {
    setEditingId(row.id);
    setEditValue(row.answerDisplay === "—" ? "" : row.answerDisplay);
    setError(null);
  }

  async function saveEdit(answerId: string) {
    setBusyId(answerId);
    setError(null);
    const result = await updateApplicationAnswerForSettings(answerId, editValue);
    setBusyId(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    setEditValue("");
    await refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setError(null);
    const result = await deleteApplicationAnswerForSettings(deleteTarget.id);
    setBusyId(null);
    setDeleteTarget(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    if (editingId === deleteTarget.id) {
      setEditingId(null);
      setEditValue("");
    }
    await refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Answers learned from job applications on supported sites. Edit a value to correct what
        autofills next time.
      </p>

      {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by question, answer, or site…"
          className="h-9 rounded-xl pl-9"
          aria-label="Search application answers"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
          {answers.length === 0
            ? "No saved answers yet — they appear here after you fill application forms with the extension."
            : "No answers match your search."}
        </p>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/80">
          {filtered.map((row) => {
            const isEditing = editingId === row.id;
            const isBusy = busyId === row.id;

            return (
              <li key={row.id} className="bg-surface/40 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">{row.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {platformLabel(row.platform, row.tenantHost)} · Last used{" "}
                      {formatLastUsed(row.lastUsedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {row.editable ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        disabled={isBusy}
                        onClick={() => (isEditing ? setEditingId(null) : startEdit(row))}
                        aria-label={isEditing ? "Cancel edit" : `Edit ${row.label}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                      disabled={isBusy}
                      onClick={() => setDeleteTarget(row)}
                      aria-label={`Delete ${row.label}`}
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      value={editValue}
                      onChange={(event) => setEditValue(event.target.value)}
                      className="h-9 flex-1 rounded-xl"
                      aria-label={`New answer for ${row.label}`}
                    />
                    <Button
                      type="button"
                      variant="default"
                      className="rounded-xl"
                      disabled={isBusy || !editValue.trim()}
                      onClick={() => void saveEdit(row.id)}
                    >
                      {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-foreground/90">{row.answerDisplay}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete saved answer?"
        description={
          deleteTarget
            ? `Remove “${deleteTarget.label}” from your application memory. The extension will not autofill this answer until you enter it again on a form.`
            : ""
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
