# Enhance AI Mission — Call Kernel + Failure UX

**Status:** **Implemented — Phases 0–4 + Phase 5 partial** (2026-07-06)  
**Related:** [`enhance-pipeline-design.md`](./enhance-pipeline-design.md) · [`north-star.md`](./north-star.md) § decision rules · `lib/ai/enhance-failure-messages.ts`

This is the **single spec** for the max-ATS resume AI call: how we dial (BYOK / system pool), how we retry and escalate, how we parse and classify failures, and how users are informed when the AI mission fails.

---

## Problem

When AI fails (or is blocked) the resume pipeline often still saves a **rules-based** version (`success: true`, `engineMode: "deterministic"`). Users see “Resume ready” and good keyword/readiness scores but do not know AI did not run — e.g. rejected BYOK key, OpenRouter parse fail, or `"Trimmed 32 bullets for page budget"`.

**Two failures today:**

1. **Backend** — Response-driven retry/escalation is fragmented (BYOK, OpenRouter, DeepSeek each have partial logic). HTTP 200 + unparseable JSON is treated as success; DeepSeek slot 1 is skipped; observability overreports “AI success”.
2. **UX** — Warnings are not persisted or surfaced on Review/tracker reopen; gate-block paths leave `warning` empty; “Resume ready” contradicts degraded state.

**Goal:** World-class AI call mechanics **and** inform without blocking. Baseline save stays; user always knows when the AI mission failed and can take a fix action where one exists.

**Out of scope for v1 UX:** Retry buttons / auto-retry in UI (kernel retries server-side; no user-facing retry CTA).

---

## Part 1 — AI Call Kernel (backend)

Any AI is an AI call. BYOK (`customer`) and system pool (`system` slot 0 / slot 1) use the **same** classify → decide → retry loop. Route only changes the **executor**.

### Module layout (target)

```
lib/ai/call-kernel/
  classify-ai-error.ts       ← single source (extend mapEnhanceProviderError)
  classify-ai-output.ts      ← empty / parse_failed / schema_invalid
  decide-ai-next-step.ts     ← response → RETRY_SAME | ESCALATE | SUCCESS | MISSION_FAILED
  run-ai-call-loop.ts        ← attempt ledger + logging
  executors/
    customer-executor.ts     ← BYOK + model candidate chain
    system-pool-executor.ts  ← slot 0 OpenRouter → slot 1 DeepSeek
  types.ts
```

`runResumeEnhance` becomes thin: build prompt → `runAiCallLoop({ mission: "max_ats_resume" })` → parsed form or mission failure.

### Attempt ledger (every call, every route)

Each iteration appends to `enhanceMeta.aiCallLedger`:

```ts
type AiCallLedgerEntry = {
  attempt: number;
  executor: "customer" | "system_pool";
  slot?: number;
  provider?: string;
  modelId?: string;
  httpStatus?: number;
  tokensUsed?: number;
  classification:
    | "success"
    | "parse_failed"
    | "empty_response"
    | "transient"
    | "rate_limited"
    | "auth"
    | "quota_exhausted"
    | "capacity_exhausted"
    | "permanent";
  decision: "retry_same" | "escalate" | "mission_success" | "mission_failed";
  durationMs: number;
};
```

**Rule:** Parse validation is part of the call. HTTP 200 + unparseable JSON → `classification: "parse_failed"`, **not** API log success.

### Error classification (shared — industry pattern)

Reuse / extend `mapEnhanceProviderError` + pool `classifyProviderFailure` into **one** table:

| Class | Examples | Retry same executor? | Escalate? |
|-------|----------|----------------------|-----------|
| `transient` | 503, overload | Once (+ optional short delay) | Then next tier |
| `rate_limited` | 429, retry-after | Once after delay | Then next tier |
| `auth` | 401, key rejected | **Never** | BYOK → system |
| `quota_exhausted` | BYOK/provider quota | No | BYOK → system; slot 0 → slot 1 |
| `capacity_exhausted` | Daily system cap | No | Next slot / fail |
| `parse_failed` | Invalid resume JSON | No | slot 0 → slot 1 |
| `empty_response` | Zero content | Once | Then escalate |
| `permanent` | Safety block, bad request | No | Next tier / fail |

Aligns with Vercel AI SDK transport retries (`maxRetries`) **plus** application-level escalation the SDK does not provide.

### Escalation ladder (frozen)

```
BYOK attempt 1
  → classify → retry BYOK once if transient / rate_limited
  → auth / exhausted customer retries → system slot 0

System slot 0 (OpenRouter free)
  → classify → retry slot 0 once if transient
  → parse_failed / empty (after retry) → slot 1 (DeepSeek)
  → pool HTTP error → slot 1

System slot 1 (DeepSeek paid)
  → classify → retry once if transient
  → fail → MISSION_FAILED

MISSION_FAILED → pipeline deterministic fallback (last resort only)
```

**Response drives next step** — not a fixed path where OpenRouter HTTP success ends the ladder.

### Replaces (do not patch separately)

- Duplicate retry in `run-enhance.ts`, `run-resume-enhance-pipeline.ts`, `byok-auth-system-fallback.ts`
- `executeWithPoolRetry` “success on throw-only” semantics for max-ATS (pool becomes executor inside kernel)
- `resolveEnhanceTraceOutcome` reporting “AI success” when API rows are green but `aiSucceeded: false`

### Kernel logging (operator / QA)

Per attempt: `ai.call.start` · `ai.call.classified` · `ai.call.decision` · `ai.call.done`  
Trace report reads **`aiCallLedger` first**, then `api_call_logs`.

---

## Part 2 — Outcome types (kernel → product)

Do not conflate **delivery success** with **AI mission success**.

| Outcome | Kernel / pipeline | User message kind | Resume saved? |
|---------|-------------------|-------------------|---------------|
| **AI success** | `aiSucceeded: true`, `engineMode: "ai"` | None (optional success toast) | Yes — AI version |
| **AI degraded** | `aiAttempted: true`, `aiSucceeded: false`, `success: true` | **Warning** — rules-based saved | Yes — deterministic fallback |
| **AI blocked (pre-call)** | `aiAttempted: false`, gates failed, `success: true` | **Warning** — rules-based saved | Yes — full deterministic baseline |
| **Hard fail** | `success: false` (brief/baseline throw, persist fail) | **Error** — nothing usable saved | No |

**AI degraded = application AI mission failed.** Delivery still succeeds (north-star baseline rule). UX must say so loudly.

**Capture gap ≠ AI failure.** Short JD, missing URL, missing profile → existing capture-gap / `issueMessage` copy. Separate icon/copy from AI-degraded warnings.

---

## Part 3 — Two UX buckets

| Bucket | Trigger | User mental model | UX contract |
|--------|---------|-------------------|-------------|
| **A — First run** | Extension save → auto tailor; dashboard manual capture → tailor | “System ran enhance without me asking” | **Persistent** — reopen job later |
| **B — Manual enhance** | Review “Enhance with AI”; Studio dialog; extension document enhance | “I just clicked Enhance” | **Session** — loading; alert when finished if mission failed |

Same server outcome contract feeds both. Bucket B **also persists** so Bucket A surfaces stay in sync.

---

## Part 4 — Server contract

### Unified outcome (pipeline output)

```ts
type AiEnhanceOutcome = {
  aiAttempted: boolean;
  aiSucceeded: boolean;
  engineMode: "ai" | "deterministic";
  aiBlockCode?: string | null;
  warning?: string | null;       // REQUIRED when allowAi && !aiSucceeded
  action?: "fix_key" | "add_key" | "enable_ai" | "wait" | null;
  actionHref?: string | null;    // e.g. /dashboard/settings#ai-keys
  aiCallLedger?: AiCallLedgerEntry[];  // from kernel — QA + support
};
```

Built by **`resolveEnhanceOutcome()`** in `lib/ai/enhance-failure-messages.ts` (new) — single entry for copy + action from `aiBlockCode`, gate reason, route, and last ledger classification.

### Warning rules (required)

In `runResumeEnhancePipeline`, when `allowAi && !aiSucceeded`:

| Condition | Warning source |
|-----------|----------------|
| `aiAttempted` | `resolveEnhanceAiRuntimeFallbackWarning()` — use **last ledger `classification`** for accurate copy (e.g. `parse_failed` ≠ “empty response”) |
| `!aiAttempted` | `resolveEnhanceBlockedMessage()` — gate block |

Today gate-block paths often leave `warning` empty — **fix before UI**.

### Copy improvements (kernel-aware)

| Code / classification | User message theme | Notes |
|----------------------|-------------------|--------|
| `parse_failed` | AI response could not be read; rules saved | Replace generic “empty response” when ledger shows parse fail |
| `invalid_response` / `empty_response` | AI returned no usable text; rules saved | Keep distinct from parse_failed |
| `rate_limited` / transient | AI busy; rules saved | v1: message only (kernel already retried) |
| auth / `no_customer_key` | Key rejected; rules saved | **Update API key** |
| `capacity_exhausted` / pool | System AI unavailable; rules saved | **Add key** if no BYOK |

Copy source of truth remains `lib/ai/enhance-failure-messages.ts`; add `resolveEnhanceOutcome()` + `resolveEnhanceOutcomeAction()`.

### Persistence (Bucket A)

| Field | Location | When |
|-------|----------|------|
| Full outcome + ledger | `job_resume_tailor.enhanceMeta` | Always |
| Row sub-label | `job_tracker_entry.metadata.pipelineAiWarning` | When `allowAi && !aiSucceeded` |

**Clear rule:** Later run with `aiSucceeded: true` → clear `pipelineAiWarning` and degraded flags in `enhanceMeta`.

Manual Review enhance must write `pipelineAiWarning` (today auto-tailor only).

---

## Part 5 — User copy & actions (v1 — no UI retry)

| `aiBlockCode` / situation | Message theme | Primary action (v1) |
|---------------------------|---------------|---------------------|
| `no_customer_key` / `no_key` | Add key for full AI; rules saved | **Add / update API key** → Settings → AI Keys |
| `provider_error` (auth / key rejected) | Key rejected; rules saved | **Update API key** |
| `insufficient_quota` (BYOK) | Provider limit; rules saved | **Check AI Keys** |
| `quota_exceeded` / `capacity_exhausted` | Daily limit; rules saved | **Add your key** (if no BYOK) or message only |
| `rate_limited` / overload / `timeout` | AI busy; rules saved | **Message only** (kernel retried server-side) |
| `parse_failed` / `invalid_response` | AI could not produce resume; rules saved | **Message only** (or Enhance again later — no retry button v1) |
| `user_disabled` / `feature_disabled` | AI off; rules saved | **Enable AI in Settings** |
| `pool_down` / `system_pool_exhausted` | System AI unavailable; rules saved | **Add API key** if no BYOK |
| Hard fail | Could not save resume | Error — no fix CTA v1 |

**Deferred:** User-facing “Retry with AI” buttons (kernel handles server-side retry).

---

## Part 6 — Surface matrix

One persisted outcome drives Bucket A; Bucket B adds session feedback.

| Surface | Bucket A (persisted) | Bucket B (session) |
|---------|----------------------|-------------------|
| **Extension card** | Warning line after pipeline completes | Loading → alert if `!aiSucceeded` |
| **Job tracker row** | Amber ⚠ + truncated sub-label | Refresh after manual enhance |
| **Review header** | ⚠ beside status when degraded | Same after alert closes |
| **Review resume preview** | Amber strip on mount from DB | Strip after enhance |
| **Studio enhance dialog** | — | Loading → alert if `!aiSucceeded` |

### Review placement

1. **Header:** ⚠ when `aiAttempted && !aiSucceeded` or `pipelineAiWarning` — avoid bare “Resume ready”.
2. **Preview strip:** One-line callout + optional fix link from `resolveEnhanceOutcome()`.

Shared component: **`AiOutcomeBanner`** (message + optional `actionHref`, no retry).

---

## Part 7 — Known gaps (pre-implementation)

| Gap | Layer | Impact |
|-----|-------|--------|
| No unified call kernel | Backend | DeepSeek skipped; parse fail = silent success |
| API log success before parse | Backend | Trace lies |
| `resolveEnhanceTraceOutcome` ignores `aiSucceeded` when API rows green | Observability | QA reports false success |
| Gate-block → no `warning` | Server | Silent deterministic save |
| Tracker omits `metadata` in pipeline view | UI | `pipelineAiWarning` never on row |
| Review ignores `enhanceMeta` on mount | UI | No banner on reopen |
| Manual Review enhance skips `pipelineAiWarning` | Persist | Inconsistent Bucket A |
| “Resume ready” ignores `aiSucceeded` | UI | Header contradicts state |
| `invalid_response` copy says “empty” for parse fail | Messaging | Misleading (Run 2) |

---

## Part 8 — Implementation phases (ordered)

### Phase 0 — Kernel (backend truth)

1. `lib/ai/call-kernel/` — classify, decide, loop, ledger  
2. Table-driven tests for escalation ladder (no provider mocks required for decide)  
3. Wire `runResumeEnhance` through kernel; remove scattered retry helpers  
4. Fix `api_call_logs` + `resolveEnhanceTraceOutcome` to respect ledger / `aiSucceeded`  
5. Extend `enhance:trace:prod` to print ledger summary first line  

### Phase 1 — Server outcome + messaging

1. `resolveEnhanceOutcome()` — warning + action + actionHref  
2. `runResumeEnhancePipeline`: always `warning` when `allowAi && !aiSucceeded`  
3. Split `parse_failed` vs `empty_response` user copy  
4. Persist `aiCallLedger` on `enhanceMeta`  

### Phase 2 — Persist everywhere

1. Auto tailor + manual Review → `pipelineAiWarning`  
2. Clear on `aiSucceeded: true`  

### Phase 3 — Dashboard reads

1. Tracker passes `metadata`; row ⚠ + sub-label  
2. Review header ⚠ + preview strip on mount (`AiOutcomeBanner`)  

### Phase 4 — Extension + Studio

1. API returns `warning`, `action`, `actionHref` on degraded success  
2. Bucket B alert rules; persist after manual enhance  

### Phase 5 — Optional

1. JD AI extract fail secondary note (`jdAiAttempted && !jdAiCallMade`)  
2. OpenRouter `response_format` / pinned `:free` model (after kernel proves escalation)  

---

## Explicit non-goals (v1)

- Do **not** block save on AI mission failure (baseline still delivers).
- Do **not** show generic “Enhanced without AI” when `aiAttempted && !aiSucceeded` — use failure-specific copy from ledger/code.
- Do **not** rely on session-only toasts for Bucket A.
- Do **not** add user-facing retry CTAs (kernel retries server-side).

---

## Code map

| What | Where |
|------|-------|
| **AI call kernel** | `lib/ai/call-kernel/` (new) |
| Error classification | `lib/ai/call-kernel/classify-ai-error.ts` ← merge `map-enhance-provider-error.ts` |
| Parse / output validation | `lib/ai/call-kernel/classify-ai-output.ts` ← wraps `parseEnhancedResumeBody` |
| Max-ATS entry | `src/lib/ai/engine/run-enhance.ts` |
| Pipeline outcome + warning | `lib/job-tracker/enhance/run-resume-enhance-pipeline.ts` |
| User copy + actions | `lib/ai/enhance-failure-messages.ts` (+ `resolveEnhanceOutcome`) |
| Auto tailor persist | `lib/extension/pipeline-tailor.ts` |
| Manual review enhance | `lib/job-tracker/enhance-review-documents.ts` |
| Persist enhanceMeta | `lib/job-tracker/persist-enhanced-resume.ts` |
| Trace / QA | `scripts/enhance-trace-report.ts`, `lib/ai/enhance-trace-outcome.ts` |
| Tracker sub-label | `lib/job-tracker/pipeline-tracker-view.ts`, `JobTrackerPipeline.tsx` |
| Review UI | `ReviewScreen.tsx`, `ReviewResumePanel.tsx`, `AiOutcomeBanner` (new) |
| Studio manual enhance | `components/resume/useResumeEnhanceFlow.tsx` |
| Extension card | `extension/src/content/index.ts`, `apply-pipeline-user-messages.ts` |

---

## Open product choices (defaults)

| Question | Default |
|----------|---------|
| Manual enhance AI success | Silent (no toast) |
| Review strip when preview exists | Show until AI success on later run |
| Tracker row | Icon + one truncated line |
| Status when `aiAttempted && !aiSucceeded` | Stay `RESUME_READY` when AI incomplete blocks apply; show ⚠ + `pipelineAiWarning` on tracker/Review when degraded but saved |
