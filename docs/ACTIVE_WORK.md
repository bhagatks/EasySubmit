# Active work — agent coordination

**Update this file before each Cursor or Claude session.**  
Both agents should read it first. Only one agent should edit a given path at a time.

Last updated: **2026-07-07** (gate decisions)

**Canonical status:** [`PROJECT_STATE.md`](./PROJECT_STATE.md) (shipped) · [`ACTION_ITEMS.md`](./ACTION_ITEMS.md) (open work)

---

## Gate decisions (2026-07-07 — user locked)

| Decision | Choice |
|----------|--------|
| **Git commit** | **After prod** — not before; large working tree stays uncommitted until post–Track 3 |
| **OpenRouter `:free` full suite** | **Hard gate** — must run properly before prod (`scripts/openrouter-free-models-suite.ts`) |
| **Manual test** | **Before Track 3** — prod blocked until manual pass |
| **Track 3 prod** | **After** manual test + OpenRouter hard gate |
| **Full manual E2E checklist** | **After prod** — broader Resume/Job/Workday W9 pass on live |

**Dependency:** Prod deploy of *this* dev slice still requires **push to remote** at some point before Vercel picks it up. If commit stays post-prod, either deploy from local/preview only first, or reorder so commit+push precedes prod. Confirm before Track 3.

**Execution order (revised):**

```
OpenRouter full suite (hard gate)
  → Manual test (pre-prod)
    → Track 3 prod
      → Git commit (single Track 0–2 slice)
        → Full manual E2E (post-prod)
```

---

## Track 0 — cleanup inventory

| Item | Status | Notes |
|------|--------|-------|
| Single v1 autofill gate (`V1_OFFER_AUTOFILL_PHASE`) | **Done** | `src/shared/extension/v1-apply-scope.ts` — server + extension |
| Remove dead `runDeterministicResumeEnhance` | **Done** | Zero imports; pipeline is canonical |
| CWS / force-upgrade URL fix | **Ready (uncommitted)** | Migration + brand + extension config in working tree |
| Legacy pipeline audit (apply-pipeline, autofill stub) | **Done** | Gated for v1 via `shouldOfferAutofillPhase` |
| Deprecated brand exports | Open | Low priority — audit `BRAND_*` aliases |
| Resume engine alignment vs `docs/resume/RULES.md` | Open | No drift found in this pass |
| Doc tracker sync (CWS done, three-track) | Partial | This file + playbook updated |

---

## Track 1 — dev (after Track 0)

| Item | Notes |
|------|-------|
| O1/D1 | CWS live migration + extension config — **ready, uncommitted** |
| O2 | Dev pool — **healthy** (`diagnose-system-pool`: OpenRouter slot 0 + DeepSeek slot 1) |
| D5 | Workday W2–W10 — **code done** except W9 live E2E (manual checklist) |
| D2–D4 | P-01 / P-02 / P-03 — **done** (role suggestions, feedback tiers, base export) |
| D6 | Extension card polling B6 — **done** (busy label through CAPTURED→RESUME_READY) |
| O3/O4/D8 | Docs partial sync |

---

## Track 1.5 — coverage

`npm run test:coverage` — must pass pre-push thresholds before Track 2.

---

## Track 2 — testing (before prod)

- **Hard gate (prod path):** `npx tsx scripts/openrouter-router-smoke.ts --case 001 --attempts 5` — **PASS 4/5** (2026-07-07, vault key)
- **Catalog telemetry:** `npx tsx scripts/openrouter-free-models-suite.ts --case 001 --attempts 2` — 23/48 OK (24 `:free` models); many provider errors expected
- D-22: `scripts/enhance-qa-pipeline-regression.ts` — deterministic slices (automated, already green)
- Existing: `scripts/enhance-qa-switch-matrix.ts`, `scripts/compare-system-models-qa.ts`
- **Pre-prod manual (user):** smoke Resume/Job flows, Workday capture, BYOK + system paths — blocks Track 3
- **Post-prod manual (user):** full checklist — Resume E2E (6), Job E2E (8), Workday W9 (3+ tenants), extension B7 on CWS, degraded-path smoke

---

## Track 3 — prod (user triggers)

Deploy, vault keys, RLS, prod smoke — see `PROD_CUTOVER.md`.  
**Blocked until:** OpenRouter full suite green + pre-prod manual test.  
**Commit/push:** user wants single commit **after** prod — confirm deploy source before starting (see gate decisions above).

---

## Conflict rules

1. **Schema:** One Prisma migration owner per PR.  
2. **`extension/src/content/index.ts`:** High-churn — coordinate before parallel edits.  
3. **Source of truth:** Code on `main` → `PROJECT_STATE.md` → `decisions.md`.
