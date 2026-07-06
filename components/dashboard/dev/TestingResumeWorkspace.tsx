"use client";

import { useRef, useState } from "react";
import { Loader2, Play, Upload, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  testRunEnhance,
  type TestEnhanceMode,
} from "@/app/actions/dev/testing-resume";
import type { ResumeProfileListItem } from "@/app/actions/resume-profiles";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { EnhanceResumeProfileSuccess } from "@/lib/ai/enhance-resume-for-user";

type TestRun = {
  id: string;
  label: string;
  mode: TestEnhanceMode;
  targetRole: string;
  jobDescription: string;
  before: HubRefineryForm;
  after: EnhanceResumeProfileSuccess;
  ranAt: Date;
};

type AbcSession = {
  id: string;
  targetRole: string;
  jobDescription: string;
  base: HubRefineryForm;
  aiOff?: EnhanceResumeProfileSuccess;
  aiOn?: EnhanceResumeProfileSuccess;
  ranAt: Date;
};

type CompareTab = "base" | "ai_off" | "ai_on";

type Props = {
  profiles: ResumeProfileListItem[];
  profileForms: Record<string, HubRefineryForm>;
};

const MODE_LABELS: Record<TestEnhanceMode, string> = {
  deterministic: "AI off (rules)",
  ai_system: "AI on (system)",
  user_default: "My settings",
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

function formToExpText(form: HubRefineryForm): string {
  return form.experience.map((e) => `${e.title} @ ${e.company}\n${e.bullets}`).join("\n\n");
}

function ArtifactPanel({
  title,
  form,
  result,
  base,
}: {
  title: string;
  form: HubRefineryForm;
  result?: EnhanceResumeProfileSuccess;
  base?: HubRefineryForm;
}) {
  const compareBase = base ?? form;
  const expText = formToExpText(form);

  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</div>
        <SectionDiff label="Summary" before="" after={form.professionalSummary ?? ""} />
        <div className="mt-3">
          <SectionDiff label="Skills" before="" after={form.skillsText ?? ""} />
        </div>
        {expText && (
          <div className="mt-3">
            <SectionDiff label="Experience" before="" after={expText} />
          </div>
        )}
      </div>
    );
  }

  const afterForm = result.form;
  const changed = new Set(result.changedSections);
  const beforeExp = formToExpText(compareBase);
  const afterExp = formToExpText(afterForm);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{title}</span>
        <span>·</span>
        <span>{result.changedSections.length} section(s) changed</span>
        <span>·</span>
        <span>{result.aiMode === "customer" ? "BYOK" : "System AI"}</span>
        {result.engineMode === "deterministic" && (
          <span className="text-yellow-400">· deterministic</span>
        )}
        {result.warning && <span className="text-amber-400">· {result.warning}</span>}
      </div>
      <div className="grid gap-3">
        <SectionDiff
          label="Summary"
          before={compareBase.professionalSummary ?? ""}
          after={afterForm.professionalSummary ?? ""}
        />
        <SectionDiff
          label="Skills"
          before={compareBase.skillsText ?? ""}
          after={afterForm.skillsText ?? ""}
        />
        {(changed.has("professionalExperience") || beforeExp !== afterExp) && (
          <SectionDiff label="Experience" before={beforeExp} after={afterExp} />
        )}
      </div>
    </div>
  );
}

function RunDiff({ run }: { run: TestRun }) {
  return <ArtifactPanel title={run.label} form={run.before} result={run.after} />;
}

function AbcCompare({ session, tab }: { session: AbcSession; tab: CompareTab }) {
  if (tab === "base") {
    return <ArtifactPanel title="Artifact A — Base" form={session.base} />;
  }
  if (tab === "ai_off") {
    return (
      <ArtifactPanel
        title="Artifact B — AI off"
        form={session.base}
        result={session.aiOff}
        base={session.base}
      />
    );
  }
  return (
    <ArtifactPanel
      title="Artifact C — AI on"
      form={session.base}
      result={session.aiOn}
      base={session.base}
    />
  );
}

export function TestingResumeWorkspace({ profiles, profileForms }: Props) {
  const [selectedProfileId, setSelectedProfileId] = useState<string>(profiles[0]?.id ?? "");
  const [uploadedForm, setUploadedForm] = useState<HubRefineryForm | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [jd, setJd] = useState("");
  const [mode, setMode] = useState<TestEnhanceMode>("deterministic");
  const [loading, setLoading] = useState(false);
  const [loadingAbc, setLoadingAbc] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [abcSessions, setAbcSessions] = useState<AbcSession[]>([]);
  const [activeAbcId, setActiveAbcId] = useState<string | null>(null);
  const [abcTab, setAbcTab] = useState<CompareTab>("base");
  const fileRef = useRef<HTMLInputElement>(null);

  const activeForm: HubRefineryForm | null =
    uploadedForm ?? profileForms[selectedProfileId] ?? null;

  const activeRun = runs.find((r) => r.id === activeRunId) ?? runs[0] ?? null;
  const activeAbc =
    abcSessions.find((s) => s.id === activeAbcId) ?? abcSessions[0] ?? null;

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

  function validateInputs(): boolean {
    if (!activeForm) return false;
    if (!targetRole.trim()) {
      setError("Target role is required");
      return false;
    }
    if (!jd.trim()) {
      setError("Job description is required");
      return false;
    }
    return true;
  }

  async function handleEnhance() {
    if (!validateInputs() || !activeForm) return;

    setError(null);
    setLoading(true);
    try {
      const result = await testRunEnhance({
        form: activeForm,
        targetRole: targetRole.trim(),
        jobDescription: jd.trim(),
        mode,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      const run: TestRun = {
        id: crypto.randomUUID(),
        label: MODE_LABELS[mode],
        mode,
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

  async function handleRunAbc() {
    if (!validateInputs() || !activeForm) return;

    setError(null);
    setLoadingAbc(true);
    try {
      const role = targetRole.trim();
      const description = jd.trim();
      const base = activeForm;

      const offResult = await testRunEnhance({
        form: base,
        targetRole: role,
        jobDescription: description,
        mode: "deterministic",
      });
      if (!offResult.success) {
        setError(`AI off: ${offResult.error}`);
        return;
      }

      const onResult = await testRunEnhance({
        form: base,
        targetRole: role,
        jobDescription: description,
        mode: "ai_system",
      });
      if (!onResult.success) {
        setError(`AI on: ${onResult.error}`);
        return;
      }

      const session: AbcSession = {
        id: crypto.randomUUID(),
        targetRole: role,
        jobDescription: description,
        base,
        aiOff: offResult,
        aiOn: onResult,
        ranAt: new Date(),
      };
      setAbcSessions((prev) => [session, ...prev].slice(0, 3));
      setActiveAbcId(session.id);
      setAbcTab("base");
      setActiveRunId(null);
    } finally {
      setLoadingAbc(false);
    }
  }

  const busy = loading || loadingAbc;

  return (
    <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
      <div className="flex w-[420px] shrink-0 flex-col gap-4 overflow-y-auto">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Resume</div>
          <div className="relative mb-2">
            <select
              className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={selectedProfileId}
              onChange={(e) => {
                setSelectedProfileId(e.target.value);
                setUploadedForm(null);
              }}
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
            placeholder="e.g. Director, Procurement"
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
            rows={12}
          />
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Single run mode
          </label>
          <div className="relative">
            <select
              className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={mode}
              onChange={(e) => setMode(e.target.value as TestEnhanceMode)}
            >
              {(Object.keys(MODE_LABELS) as TestEnhanceMode[]).map((key) => (
                <option key={key} value={key}>
                  {MODE_LABELS[key]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Button
          onClick={handleEnhance}
          disabled={busy || !activeForm || !targetRole.trim() || !jd.trim()}
          className="w-full"
          variant="secondary"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enhancing…
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" /> Single run
            </>
          )}
        </Button>

        <Button
          onClick={handleRunAbc}
          disabled={busy || !activeForm || !targetRole.trim() || !jd.trim()}
          className="w-full"
        >
          {loadingAbc ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running A → B → C…
            </>
          ) : (
            <>Run A/B/C (base → AI off → AI on)</>
          )}
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {activeAbc ? (
          <>
            {abcSessions.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {abcSessions.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setActiveAbcId(s.id);
                      setAbcTab("base");
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      s.id === (activeAbcId ?? abcSessions[0]?.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    A/B/C {abcSessions.length - i} · {s.targetRole}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {(
                [
                  ["base", "A — Base"],
                  ["ai_off", "B — AI off"],
                  ["ai_on", "C — AI on"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAbcTab(key)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    abcTab === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <AbcCompare session={activeAbc} tab={abcTab} />
          </>
        ) : activeRun ? (
          <>
            {runs.length > 1 && (
              <div className="flex flex-wrap gap-2">
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
                    Run {runs.length - i} · {r.label}
                  </button>
                ))}
              </div>
            )}
            <RunDiff run={activeRun} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Run a single enhance or A/B/C session to compare base, AI off, and AI on artifacts
          </div>
        )}
      </div>
    </div>
  );
}
