# Analytics — PostHog event rules

Every user-visible feature change must include analytics. This ensures product decisions are data-driven and every flow is observable in PostHog.

## What requires an analytics event

Any code change that adds or modifies:

- a new screen, page, or modal the user sees
- a CTA, button, or action the user can trigger
- a new flow, gate, or step in onboarding / enhance / extension
- a success or failure outcome the user experiences
- a new feature flag branch that changes user behavior

UI-only changes (Tailwind classes, copy tweaks, layout) do not require a new event — but if the copy change is part of a feature launch, fire the event anyway.

## Rules

### 1. Never call `posthog.capture()` directly

Always use the analytics module. Direct PostHog calls bypass sanitization and dev/prod routing.

| Surface | Use |
|---|---|
| Client / browser | `captureAnalyticsEvent()` from `@/src/shared/analytics` |
| Server / server action | `captureDevAnalyticsEvent()` or `captureApiCallLogged()` |
| Dev journey steps | `captureDevJourneyStep()` |
| Screen views | `captureAnalyticsPageView()` |

### 2. All event names must live in the catalog

No magic strings at the call site. Every event name must be added to `AnalyticsEvents` in `src/shared/analytics/events.ts` before use.

```ts
// ✅ correct
captureAnalyticsEvent(AnalyticsEvents.FEATURE_COMPLETED, { surface, userId });

// ❌ wrong — magic string, not in catalog
posthog.capture("feature_completed", { ... });
```

### 3. Required properties on every event

Every event must include:

- `surface` — which part of the app fired it (e.g. `"dashboard"`, `"extension"`, `"onboarding"`)
- Any feature-specific context (counts, flags, outcomes) that makes the event actionable

### 4. Never log PII

Strip before sending. Never include:

- Email addresses
- Full name
- Resume text or bullet content
- API keys or tokens

Use `sanitizeProperties()` from `@/src/shared/analytics/sanitize` if unsure.

### 5. Extension Apply pipeline step events (dev only)

Every step in the extension Apply pipeline (same catalog as the dev QA debug overlay) emits PostHog events **only in dev** (`NEXT_PUBLIC_ANALYTICS_ENV !== "prod"`) so you can reconstruct per-resume progress while debugging locally. Nothing from this feature runs in production deploys or store extension builds.

| Event | When |
|---|---|
| `extension_apply_pipeline_started` | Job captured; pipeline trace initialized |
| `extension_apply_pipeline_step` | Each step transitions to `active`, `done`, `skipped`, or `error` |

**Key properties on `extension_apply_pipeline_step`:**

- `entry_id` — job tracker entry (use to filter one resume)
- `trace_id` — pipeline trace (same as entry id after capture)
- `apply_session_id` — client Apply click session (pre-capture correlation)
- `step_id` — e.g. `ai_gates`, `ai_pass1`, `pre_keyword_gap`
- `step_status` — `active` \| `done` \| `skipped` \| `error`
- `step_group`, `step_label`, `step_description` — human-readable step context
- `detail` — short status line (truncated to 200 chars)
- `step_meta` — sanitized extras (model, route mode, etc.; PII stripped)

**PostHog (dev project 488025):** filter `extension_apply_pipeline_step`, group by `step_id`, breakdown by `step_status`. For one resume, filter `entry_id = <job id>` and sort by `$timestamp`.

**Gate:** `isPipelineDebugEnabled()` in `src/shared/extension/pipeline-debug-gate.ts` — overlay, API route, DB progress writes, and PostHog events all respect this.

## Completion gate

Before marking work done:

- [ ] New event name added to `AnalyticsEvents` in `src/shared/analytics/events.ts`
- [ ] Event fires at the right moment (not too early, not on every render)
- [ ] `surface` property included
- [ ] No PII in event properties
- [ ] No direct `posthog.capture()` calls
