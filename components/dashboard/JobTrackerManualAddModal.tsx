"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  createJobTrackerManualEntry,
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
  canManualCaptureSave,
  manualCaptureBlockReason,
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
  const [error, setError] = useState<string | null>(null);

  const descriptionLength = draft.description.trim().length;
  const hasProfiles = profiles.length > 0;
  const canSave =
    hasProfiles &&
    Boolean(draft.sourceProfileId.trim()) &&
    canManualCaptureSave({
      url: draft.url,
      title: draft.title,
      description: draft.description,
    });
  const validationHint = useMemo(
    () =>
      manualCaptureBlockReason({
        url: draft.url,
        title: draft.title,
        description: draft.description,
      }),
    [draft.description, draft.title, draft.url],
  );

  const resetForm = useCallback(() => {
    setDraft(emptyDraft(defaultProfileId));
    setError(null);
    setSubmitting(false);
  }, [defaultProfileId]);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && !submitting) {
        resetForm();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetForm, submitting],
  );

  const handleSubmit = useCallback(async () => {
    if (!canSave || submitting) return;

    const resolvedProfileId = resolveDashboardManualJobProfileId(profiles, draft.sourceProfileId);
    if (!resolvedProfileId) {
      setError("Select a resume profile to tailor from.");
      return;
    }

    const payload: DashboardManualJobDraft = {
      ...draft,
      sourceProfileId: resolvedProfileId,
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
  }, [canSave, draft, onCreated, onOpenChange, profiles, resetForm, submitting]);

  const fieldClass =
    "rounded-xl border-border/70 bg-background/80 focus-visible:ring-primary/40";

  return (
    <GlossyModal
      open={open}
      onOpenChange={handleOpenChange}
      title={DASHBOARD_MANUAL_JOB_TITLE}
      description={DASHBOARD_MANUAL_JOB_SUBTITLE}
      busy={submitting}
      className="max-w-xl"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <PurposeButton
            type="button"
            purpose="secondary"
            disabled={submitting}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </PurposeButton>
          <PurposeButton
            type="button"
            purpose="primary"
            disabled={!canSave || submitting}
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
              disabled={submitting}
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

        <div className="space-y-1.5">
          <label htmlFor="manual-job-title" className="text-sm font-medium text-foreground">
            Role title
          </label>
          <Input
            id="manual-job-title"
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Software Engineer"
            className={fieldClass}
            disabled={submitting || !hasProfiles}
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
            onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))}
            placeholder="Acme Corp"
            className={fieldClass}
            disabled={submitting || !hasProfiles}
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
              setDraft((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Paste the full job posting here…"
            className={cn(
              "min-h-[min(36vh,240px)] w-full resize-y rounded-xl border px-3 py-2.5 text-sm leading-relaxed text-foreground",
              fieldClass,
            )}
            disabled={submitting || !hasProfiles}
          />
          <p className="text-xs text-muted-foreground">
            {dashboardManualJobDescriptionHint(descriptionLength)}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="manual-job-url" className="text-sm font-medium text-foreground">
            Job posting URL
          </label>
          <Input
            id="manual-job-url"
            type="url"
            value={draft.url}
            onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
            placeholder="https://…"
            className={fieldClass}
            disabled={submitting || !hasProfiles}
            autoComplete="url"
          />
        </div>

        {validationHint && !canManualCaptureSave({
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
