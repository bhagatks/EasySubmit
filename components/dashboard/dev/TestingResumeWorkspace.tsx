"use client";

import { useRef, useState } from "react";
import { Loader2, Play, Upload, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { testRunEnhance } from "@/app/actions/dev/testing-resume";
import type { ResumeProfileListItem } from "@/app/actions/resume-profiles";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { EnhanceResumeProfileSuccess } from "@/lib/ai/enhance-resume-for-user";

type TestRun = {
  id: string;
  targetRole: string;
  jobDescription: string;
  before: HubRefineryForm;
  after: EnhanceResumeProfileSuccess;
  ranAt: Date;
};

type Props = {
  profiles: ResumeProfileListItem[];
  profileForms: Record<string, HubRefineryForm>;
};

function diffText(before: string, after: string): React.ReactNode {
  if (before === after) return <span className="text-muted-foreground">{after || "—"}</span>;
  return (
    <span>
      <span className="line-through text-red-400 mr-2">{before || "—"}</span>
      <span className="text-green-400">{after || "—"}</span>
    </span>
  );
}

function SectionDiff({ label, before, after }: { label: string; before: string; after: string }) {
  if (before === after && !before) return null;
  const changed = before !== after;
  return (
    <div className={`rounded-xl border p-4 ${changed ? "border-blue-500/40 bg-blue-950/20" : "border-border"}`}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm leading-relaxed">{diffText(before, after)}</div>
    </div>
  );
}

function RunDiff({ run }: { run: TestRun }) {
  const { before, after: result } = run;
  const afterForm = result.form;
  const changed = new Set(result.changedSections);

  const beforeExp = before.experience.map((e) => `${e.title} @ ${e.company}\n${e.bullets}`).join("\n\n");
  const afterExp = afterForm.experience.map((e) => `${e.title} @ ${e.company}\n${e.bullets}`).join("\n\n");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{run.targetRole}</span>
        <span>·</span>
        <span>{result.changedSections.length} section(s) changed</span>
        <span>·</span>
        <span>{result.aiMode === "customer" ? "BYOK" : "System AI"}</span>
        {result.fallbackUsed && <span className="text-yellow-400">· fallback</span>}
      </div>
      <div className="grid gap-3">
        <SectionDiff label="Summary" before={before.professionalSummary} after={afterForm.professionalSummary} />
        <SectionDiff label="Skills" before={before.skillsText} after={afterForm.skillsText} />
        {(changed.has("professionalExperience") || beforeExp !== afterExp) && (
          <SectionDiff label="Experience" before={beforeExp} after={afterExp} />
        )}
      </div>
    </div>
  );
}

export function TestingResumeWorkspace({ profiles, profileForms }: Props) {
  const [selectedProfileId, setSelectedProfileId] = useState<string>(profiles[0]?.id ?? "");
  const [uploadedForm, setUploadedForm] = useState<HubRefineryForm | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeForm: HubRefineryForm | null =
    uploadedForm ?? profileForms[selectedProfileId] ?? null;

  const activeRun = runs.find((r) => r.id === activeRunId) ?? runs[0] ?? null;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const { parseResumeDocxAction } = await import("@/app/actions/parseResumeDocx");
    const result = await parseResumeDocxAction(fd);
    if (!result.success) {
      setError(result.error);
      return;
    }
    const { parsedToRefineryForm } = await import("@/lib/onboarding/hubResume");
    setUploadedForm(parsedToRefineryForm(result.data));
    setSelectedProfileId("");
  }

  async function handleEnhance() {
    if (!activeForm) return;
    if (!targetRole.trim()) { setError("Target role is required"); return; }
    if (!jd.trim()) { setError("Job description is required"); return; }

    setError(null);
    setLoading(true);
    try {
      const result = await testRunEnhance({ form: activeForm, targetRole: targetRole.trim(), jobDescription: jd.trim() });
      if (!result.success) {
        setError(result.error);
        return;
      }
      const run: TestRun = {
        id: crypto.randomUUID(),
        targetRole: targetRole.trim(),
        jobDescription: jd.trim(),
        before: activeForm,
        after: result,
        ranAt: new Date(),
      };
      setRuns((prev) => [run, ...prev].slice(0, 5));
      setActiveRunId(run.id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
      {/* Left pane */}
      <div className="flex w-[420px] shrink-0 flex-col gap-4 overflow-y-auto">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Resume</div>
          <div className="relative mb-2">
            <select
              className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={selectedProfileId}
              onChange={(e) => { setSelectedProfileId(e.target.value); setUploadedForm(null); }}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.targetTitle || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "Profile"}
                  {p.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or upload DOCX</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Upload className="h-4 w-4" />
            {uploadedForm ? "Uploaded resume" : "Upload resume"}
          </button>
          <input ref={fileRef} type="file" accept=".docx" className="hidden" onChange={handleUpload} />
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Target Role
          </label>
          <input
            type="text"
            placeholder="e.g. Senior Software Engineer"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-1 flex-col rounded-xl border border-border bg-surface p-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Job Description
          </label>
          <textarea
            placeholder="Paste the full job description here…"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            rows={14}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Button
          onClick={handleEnhance}
          disabled={loading || !activeForm || !targetRole.trim() || !jd.trim()}
          className="w-full"
        >
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enhancing…</>
          ) : (
            <><Play className="mr-2 h-4 w-4" /> Enhance</>
          )}
        </Button>
      </div>

      {/* Right pane */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {runs.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {runs.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRunId(r.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  r.id === (activeRunId ?? runs[0]?.id)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                Run {runs.length - i} · {r.targetRole}
              </button>
            ))}
          </div>
        )}

        {activeRun ? (
          <div className="rounded-xl border border-border bg-surface p-4">
            <RunDiff run={activeRun} />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            Run an enhancement to see the diff here
          </div>
        )}
      </div>
    </div>
  );
}
