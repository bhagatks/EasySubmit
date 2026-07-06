"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import {
  createJobTrackerManualEntry,
  importJobPostingFromUrl,
  tailorJobTrackerEntry,
} from "@/app/actions/job-tracker";
import { GlossyModal } from "@/components/ui/glossy-modal";
import { Input } from "@/components/ui/input";
import { PurposeButton } from "@/components/ui/purpose-button";
import { serverActionClientErrorMessage } from "@/lib/server-action-client";
import {
  DASHBOARD_MANUAL_JOB_SUBTITLE,
  DASHBOARD_MANUAL_JOB_TITLE,
  dashboardManualJobDescriptionHint,
  resolveDashboardManualJobProfileId,
  type DashboardManualJobDraft,
  type DashboardManualJobProfileOption,
} from "@/lib/job-tracker/dashboard-manual-capture";
import {
  canDashboardManualJobSave,
  dashboardManualJobBlockReason,
} from "@/src/shared/extension/apply-gate";
import { AnalyticsEvents, captureAnalyticsEvent } from "@/src/shared/analytics";
import { cn } from "@/lib/utils";

function emptyDraft(defaultProfileId: string | null): DashboardManualJobDraft {
  return {
    url: "",
    title: "",
    company: "",
    description: "",
    sourceProfileId: defaultProfileId ?? "",
  };
}

type JobTrackerManualAddModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (entryId: string) => void;
  profiles: DashboardManualJobProfileOption[];
  defaultProfileId: string | null;
};

export function JobTrackerManualAddModal({
  open,
  onOpenChange,
  onCreated,
  profiles,
  defaultProfileId,
}: JobTrackerManualAddModalProps) {
  const [draft, setDraft] = useState<DashboardManualJobDraft>(() => emptyDraft(defaultProfileId));
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importHint, setImportHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const descriptionLength = draft.description.trim().length;
  const hasProfiles = profiles.length > 0;
  const busy = submitting || importing;
  const canSave =
    hasProfiles &&
    Boolean(draft.sourceProfileId.trim()) &&
    canDashboardManualJobSave({
      url: draft.url,
      title: draft.title,
      description: draft.description,
    });
  const validationHint = useMemo(
    () =>
      dashboardManualJobBlockReason({
        url: draft.url,
        title: draft.title,
        description: draft.description,
      }),
    [draft.description, draft.title, draft.url],
  );

  const resetForm = useCallback(() => {
    setDraft(emptyDraft(defaultProfileId));
    setError(null);
    setImportHint(null);
    setSubmitting(false);
    setImporting(false);
  }, [defaultProfileId]);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && !busy) {
        resetForm();
      }
      onOpenChange(nextOpen);
    },
    [busy, onOpenChange, resetForm],
  );

  const handleImportFromUrl = useCallback(async () => {
    const url = draft.url.trim();
    if (!url || importing || submitting) return;

    setImporting(true);
    setError(null);
    setImportHint(null);

    try {
      const result = await importJobPostingFromUrl(url);
      if (!result.success) {
        setError(result.error);
        setImporting(false);
        return;
      }

      setDraft((current) => ({
        ...current,
        url: result.url,
        title: result.title || current.title,
        company: result.company || current.company,
        description: result.description || current.description,
        importSource: "url",
      }));
      setImportHint(result.hint);
    } catch (importError) {
      setError(serverActionClientErrorMessage(importError, "Could not import from that URL."));
    } finally {
      setImporting(false);
    }
  }, [draft.url, importing, submitting]);

  const handleSubmit = useCallback(async () => {
    if (!canSave || busy) return;

    const resolvedProfileId = resolveDashboardManualJobProfileId(profiles, draft.sourceProfileId);
    if (!resolvedProfileId) {
      setError("Select a resume profile to tailor from.");
      return;
    }

    const payload: DashboardManualJobDraft = {
      ...draft,
      sourceProfileId: resolvedProfileId,
      importSource: draft.importSource ?? "manual",
    };

    setSubmitting(true);
    setError(null);

    try {
      const result = await createJobTrackerManualEntry(payload);
      if (!result.success) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      captureAnalyticsEvent(AnalyticsEvents.JOB_TRACKER_MANUAL_ADD_COMPLETED, {
        surface: "dashboard",
        entryId: result.entryId,
        sourceProfileId: resolvedProfileId,
        importSource: payload.importSource ?? "manual",
      });

      void tailorJobTrackerEntry(result.entryId).catch((tailorError) => {
        console.warn("[JobTracker] tailor after manual add failed", tailorError);
      });

      resetForm();
      onOpenChange(false);
      onCreated(result.entryId);
    } catch (submitError) {
      setError(serverActionClientErrorMessage(submitError, "Could not save job."));
      setSubmitting(false);
    }
  }, [busy, canSave, draft, onCreated, onOpenChange, profiles, resetForm]);

  const fieldClass =
    "rounded-xl border-border/70 bg-background/80 focus-visible:ring-primary/40";

  return (
    <GlossyModal
      open={open}
      onOpenChange={handleOpenChange}
      title={DASHBOARD_MANUAL_JOB_TITLE}
      description={DASHBOARD_MANUAL_JOB_SUBTITLE}
      busy={busy}
      className="max-w-xl"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <PurposeButton
            type="button"
            purpose="secondary"
            disabled={busy}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </PurposeButton>
          <PurposeButton
            type="button"
            purpose="primary"
            disabled={!canSave || busy}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving to Job Tracker…
              </>
            ) : (
              "Save to Job Tracker"
            )}
          </PurposeButton>
        </div>
      }
    >
      <div className="space-y-4">
        {!hasProfiles ? (
          <div className="rounded-xl border border-border/70 bg-surface/50 px-4 py-3 text-sm text-muted-foreground">
            Create a resume profile first, then add jobs here.{" "}
            <Link href="/dashboard/resume-profiles/new" className="font-medium text-primary hover:underline">
              New resume profile
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="manual-job-profile" className="text-sm font-medium text-foreground">
              Resume profile to tailor from
            </label>
            <select
              id="manual-job-profile"
              value={draft.sourceProfileId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, sourceProfileId: event.target.value }))
              }
              className={cn(
                "flex h-10 w-full rounded-xl border px-3 py-2 text-sm text-foreground shadow-sm",
                fieldClass,
              )}
              disabled={busy}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                  {profile.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Tailoring saves overrides on this job only — your profile stays unchanged.
            </p>
          </div>
        )}

        <div className="space-y-2 rounded-xl border border-border/70 bg-surface/30 p-4">
          <p className="text-sm font-medium text-foreground">
            Job posting URL <span className="font-normal text-muted-foreground">(optional)</span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="manual-job-url"
              type="url"
              value={draft.url}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  url: event.target.value,
                  importSource: current.importSource === "url" ? undefined : current.importSource,
                }))
              }
              placeholder="https://boards.greenhouse.io/…"
              className={cn(fieldClass, "sm:flex-1")}
              disabled={busy || !hasProfiles}
              autoComplete="url"
              aria-label="Job posting URL"
            />
            <PurposeButton
              type="button"
              purpose="secondary"
              disabled={busy || !hasProfiles || !draft.url.trim()}
              className="shrink-0"
              onClick={() => void handleImportFromUrl()}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Importing…
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                  Import from URL
                </>
              )}
            </PurposeButton>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste a link to import fields and unlock Apply assist. Skip the URL to tailor a resume only.
          </p>
        </div>

        <div className="relative flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-border/70" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Or enter manually below
          </span>
          <div className="h-px flex-1 bg-border/70" aria-hidden="true" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="manual-job-title" className="text-sm font-medium text-foreground">
            Role title
          </label>
          <Input
            id="manual-job-title"
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                title: event.target.value,
                importSource: current.importSource === "url" ? "manual" : current.importSource,
              }))
            }
            placeholder="Software Engineer"
            className={fieldClass}
            disabled={busy || !hasProfiles}
            autoComplete="off"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="manual-job-company" className="text-sm font-medium text-foreground">
            Company <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="manual-job-company"
            value={draft.company}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                company: event.target.value,
                importSource: current.importSource === "url" ? "manual" : current.importSource,
              }))
            }
            placeholder="Acme Corp"
            className={fieldClass}
            disabled={busy || !hasProfiles}
            autoComplete="organization"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="manual-job-description" className="text-sm font-medium text-foreground">
            Job description
          </label>
          <textarea
            id="manual-job-description"
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value,
                importSource: current.importSource === "url" ? "manual" : current.importSource,
              }))
            }
            placeholder="Paste the full job posting here…"
            className={cn(
              "min-h-[min(36vh,240px)] w-full resize-y rounded-xl border px-3 py-2.5 text-sm leading-relaxed text-foreground",
              fieldClass,
            )}
            disabled={busy || !hasProfiles}
          />
          <p className="text-xs text-muted-foreground">
            {dashboardManualJobDescriptionHint(descriptionLength)}
          </p>
        </div>

        {importHint ? <p className="text-sm text-primary">{importHint}</p> : null}

        {validationHint &&
        !canDashboardManualJobSave({
          url: draft.url,
          title: draft.title,
          description: draft.description,
        }) ? (
          <p className="text-sm text-muted-foreground">{validationHint}</p>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </GlossyModal>
  );
}
