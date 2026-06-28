# Observability — logging is mandatory

Every new feature, pipeline step, gate, or server action MUST include structured logs. A PR is not complete without them. Trivial copy-only or pure CSS tweaks are exempt.

## What to log (minimum)

For each logical step in a transaction:

1. **`start`** — entry with `traceId` + key inputs (counts, flags, surface)
2. **`done`** — exit with outcome metrics
3. **`fail` / `block` / `skip`** — always include `errorCode` + `errorMessage` when applicable

Never swallow failures silently. If a branch returns early or falls back, log why.

## Which logger to use

| Area | Logger | Prefix |
|------|--------|--------|
| Enhance / AI pipeline | `logEnhanceDiag()` | `[EnhanceDiag]` |
| Enhance legacy / journey | `logEnhance()` | `[EnhanceAI]` |
| AI model HTTP calls | `logApiCall()` via `recordEnhanceModelCall` | `[ApiCall]` |
| Extension / sidepanel shared flows | existing journey or domain logger in `src/shared/` | match surrounding module |
| New non-enhance pipelines | add a domain helper mirroring `enhance-diagnostics.ts` pattern | `[FeatureDiag]` |

Reference implementation: `src/lib/ai/engine/enhance-diagnostics.ts` + catalog in `enhance-diagnostics-catalog.ts`.

## Severity levels

Assign `level` on every diagnostic event:

| Level | Use when |
|-------|----------|
| `light` | Verbose internals — flag values, cache hits, gate passed |
| `low` | Step completed with key params |
| `high` | Transaction boundaries, gate blocks, failures |

Filtered by `app_config.enhanceDiagnostics.logThreshold` (`light` = all, default).

## Required fields

Always include where applicable:

- `traceId` — correlate terminal, PostHog, `api_call_logs`
- `designStep` or domain step id — maps to design doc / runbook
- `track` — e.g. `jd`, `resume`, `gate`, `engine`, `persist`
- `phase` — `start` | `done` | `skip` | `fail` | `block`
- `flags` — feature flags, route mode, gate inputs
- `params` — counts, durations, safe previews (no secrets)

## Completion gate

Before marking work done:

- [ ] Every new branch / gate / external call has at least one log line
- [ ] Failures and fallbacks are `high` and include `errorCode`
- [ ] New pipeline steps added to the domain catalog (`enhance-diagnostics-catalog.ts` for enhance)
- [ ] Observability section updated if steps or failure codes changed (`docs/enhance-pipeline-design.md` for enhance)
