# Enhance QA Playbook — AI On / Off Review

> **Active backlog:** open QA/E2E items tracked in [`docs/ACTION_ITEMS.md`](./ACTION_ITEMS.md) § **QA & E2E testing (priority)**.

> **System of record** for repeated resume-enhance testing.  
> Use this doc instead of re-explaining context in chat. Point the agent at: *“Read `docs/enhance-qa-playbook.md` and run review for case \<id\>.”*

**Related:** [`enhance-pipeline-design.md`](./enhance-pipeline-design.md) (pipeline architecture) · [`JD_BRAIN_ARCHITECTURE.md`](./JD_BRAIN_ARCHITECTURE.md) · [`ACTION_ITEMS.md`](./ACTION_ITEMS.md) (implementation backlog)

---

## 1. Purpose

We validate the **Enhance** pipeline in two modes before shipping fixes:

| Mode | User setting | Engine | What we prove |
|------|----------------|--------|----------------|
| **AI off** | Settings → AI enhancements **disabled** (`aiSourcePreference = disabled`) | Deterministic baseline only (`engineMode: deterministic`) | Rules engine is safe, honest, and doesn’t produce garbage |
| **AI on** | AI enabled (system key or BYOK) | Baseline + AI upgrade (`engineMode: ai`) | AI improves same-domain tailoring without hallucinations or ship bugs |

Each test run produces **three artifacts** from the **same base profile + same JD**. We review all three together — not in isolation.

---

## 2. Standard test protocol (repeat every time)

### 2.1 Artifacts

| # | Artifact | How to produce | Saved as |
|---|----------|----------------|----------|
| A | **Base resume** | Source profile — no JD tailor, or export before any enhance | Case folder / paste in review |
| B | **AI off** | Settings: AI off → Enhance on Review / pipeline tailor | Case folder / paste |
| C | **AI on** | Settings: AI on → same Enhance action on same job | Case folder / paste |

### 2.2 Preconditions

- Same **base profile** and **job entry** (full JD captured, ≥120 chars).
- Note **surface**: Review panel (`variant: dashboard`), extension pipeline (`variant: pipeline`), or Studio.
- Note **traceId** if enhance debug is on (`NEXT_PUBLIC_ANALYTICS_ENV=dev` → `[EnhanceAI]` server logs).
- Record **AI health** at test time (`/api/user/ai-health` → `ai_disabled` vs ok).

### 2.3 Review checklist (every run)

For each artifact A / B / C, score:

- [ ] **Honesty** — No fabricated credentials, spend, or scope not in base experience
- [ ] **Coherence** — Summary role ↔ job titles ↔ experience bullets aligned
- [ ] **Skills** — No junk tokens; canonical labels; no duplicate parent/child (`Patient` + `Patient Care`)
- [ ] **Summary** — 4 sentences, 70–80 words, no `[review]` placeholders, no banned words
- [ ] **Experience** — Typos fixed; dates valid (no `Present Present`); companies/titles preserved unless intentionally reframed
- [ ] **Header** — Contact + LinkedIn preserved
- [ ] **ATS/readiness** — Score delta explained (keyword ↑ vs alignment ↓)
- [ ] **UX** — Correct feedback card (`Enhanced without AI` vs `Resume enhanced`); warning shown when AI blocked

### 2.4 When to add a new case

Add a row to [§6 Case history](#6-case-history) when:

- Testing a new JD category (procurement, SWE, PM, etc.)
- Before/after a defect fix from [§4 Defect registry](#4-defect-registry)
- Cross-domain stress test (e.g. engineering profile × non-engineering JD)

---

## 3. Expected system behavior (current design)

From [`enhance-pipeline-design.md`](./enhance-pipeline-design.md). **This is what “working fine” means** — not “perfect resume for every JD.”

### 3.1 AI off (deterministic)

**Should:**

- Skip all LLM calls (`aiAttempted: false`, `engineMode: deterministic`).
- Run Phase 1 brief (JD analysis deterministic + O\*NET + bullet quality + enhance plan).
- Run Phase 2 baseline: skills merge, weak-bullet rewrite, optional JD weave, summary rewrite **only if summary validation fails**.
- Return success with warning: *“AI is disabled in settings — baseline enhancements were applied.”*
- Show amber UI: **“Enhanced without AI (rules engine)”**.
- Not consume AI quota / tokens.

**Should not (known limitations — warn, don’t pretend to fix with rules):**

- Invent new job history or re-title roles to match JD when candidate has no domain overlap.
- Fully reframe experience for a different career track (eng → procurement).
- Match AI-quality prose or JD understanding.

**Should not (defects — we are fixing these):**

- Inject junk skills from JD token fragments (`BIG`, `CARE`, `Annual`, …).
- Swap summary identity to JD title with zero experience overlap.
- Show green ATS improvement when only keyword stuffing occurred.

### 3.2 AI on (baseline + AI upgrade)

**Should:**

- Run same Phase 1 + Phase 2 baseline, then AI pass on baseline form (not raw).
- Use JD intelligence + brief in prompt; merge with guardrails.
- Fix grammar/typos in bullets; improve same-domain alignment when experience supports it.
- Produce clean skills list (no deterministic junk).
- Set `engineMode: ai`, show mint UI: **“Resume enhanced”**.
- Increment quota only when AI succeeds (or JD AI extract ran).

**Should not (defects — we are fixing these):**

- Fabricate quantified claims from JD text (e.g. “$100M spend”) without bullet anchors.
- Leave `[review]s` or other post-process artifacts in shipped text.
- Polish summary into a role the experience section contradicts without UI warning.
- Drop contact fields (LinkedIn) or introduce date typos (`Present Present`).

### 3.3 Cross-domain JD (both modes)

When base profile domain ≠ JD domain (e.g. **engineering leader** × **Director, Procurement**):

| Expectation | AI off | AI on |
|-------------|--------|-------|
| Honest about experience | Bullets stay engineering | Bullets stay engineering (OK) |
| Summary | May wrongly adopt JD title (defect — fixing) | May read as JD role (defect — fixing) |
| Submit-ready | **No** | **No** |
| System behavior | **Warn / gate** — not silent success | **Warn / gate** — not silent success |

### 3.4 Summary identity policy (fix for “Director, Procurement…” opening)

**Problem:** Summary sentence 1 uses the **JD job title** as if it were the candidate’s identity. Both paths do this today:

| Path | Where | Behavior |
|------|--------|----------|
| AI off | `buildDeterministicSummary()` | `targetRole: brief.targetRole` → job title from tracker (“Director, Procurement”) |
| AI on | `brain.ts` + `effectiveTargetRole` | Prompt: *“Align title and narrative to the target role”* + JD `extractedJobTitle` |

Job apply flow sets `targetRole` = scraped **job title**, not profile `targetTitle` (see `copy-profile-for-job.ts`). That is correct for **skills/ATS/coverage**, wrong for **summary identity**.

**Rule (both AI on and off):**

1. **`summaryIdentity`** — who the candidate *is* (sentence 1). Source priority:
   - Profile `targetTitle` if set (e.g. “Director of Engineering”)
   - Else most recent non-hidden experience **title** (normalized)
   - Else existing summary opening if valid
   - **Never** the JD job title by default

2. **`jdTargetRole`** — what the job asks for. Used for: skills merge, keyword gap, coverage, weave, readiness keyword pillar. Unchanged.

3. **When JD title may appear in summary** — only if `experienceOverlapScore(jd, experience) ≥ threshold` (e.g. 40%):
   - Same-domain: “Senior Software Engineer targeting Staff Platform Engineer roles” — OK
   - Cross-domain: do **not** open with “Director, Procurement”; use bridge language in sentence 3–4 only if any transfer exists

4. **Cross-domain template (Case 001 pattern)** — competitor-informed (`cross-domain-summary.ts`; Rezi/ResumeAdapter bridge model):
   - ✅ *“Head of Engineering with 20 years leading platform, mobile, and API engineering organizations…”*
   - ✅ Sentence 2: **resume-native skills only** (Cloud & DevOps, Docker — not Procurement)
   - ✅ Sentence 3: **transferable bridge** anchored in bullets (*vendor integrations*, *platform scale*) — not fake procurement tenure
   - ✅ JD keywords remain in **Skills section** only (Teal/Jobscan ATS pattern)
   - ❌ *“Director, Procurement with 20 years…”* when titles are Head of Engineering
   - ❌ *“Applies Procurement, Strategic Alliances…”* in summary when experience is engineering

**Implementation (D-04 — single helper, both paths):**

```
resolveSummaryIdentity({
  profileTargetTitle,
  experienceTitles,
  currentSummary,
  jdTargetRole,
  jdIntelligence,
}) → { identity: string; mayReferenceJdTitle: boolean; overlapScore: number }
```

| Component | Change |
|-----------|--------|
| `build-deterministic-summary.ts` | Sentence 1 uses `identity`, not `brief.targetRole` |
| `apply-baseline-enhance.ts` | Pass `resolveSummaryIdentity()` result |
| `brain.ts` | Replace “Align title to target role” with identity rule + forbid JD title when `mayReferenceJdTitle === false` |
| Post-AI validator | Reject summary if opening matches JD title and `overlapScore` low; retry or revert sentence 1 |
| UI | If cross-domain: warning *“Summary keeps your professional identity; this JD may not match your experience.”* |

**What we are NOT doing:** Silently renaming the candidate to the JD title for ATS keyword stuffing — that creates the Case 001 B/C failure and is worse with AI on (plausible fabrication).

---

## 4. Defect registry

Track status here and in [`ACTION_ITEMS.md`](./ACTION_ITEMS.md). Update status when fixing: `open` → `in_progress` → `done` (+ link commit / date in [§7 Change log](#7-change-log)).

### P0 — Ship blockers / integrity

| ID | Defect | Path | Status |
|----|--------|------|--------|
| D-01 | Skill token fragmentation — sub-tokens from `MASTER_SKILLS` (`big`, `patient`, …) promoted from JD marketing copy | Deterministic · `keyword-extract.ts`, `jd-skills-deterministic.ts` | done |
| D-02 | Skill filter bypass — `buildGroupedSkills()` injects `jdVocabulary.skills` without `filterMustAddSkills()` | Deterministic · `merge-skills-grouped.ts` | done |
| D-03 | `titleCaseSkill()` uppercases ≤4-char fragments → `BIG`, `CARE`, `JOB` | Deterministic · `jd-skills-deterministic.ts` | done |
| D-04 | Summary identity swap to JD title without experience-overlap check — see [§3.4 Summary identity policy](#34-summary-identity-policy-fix-for-director-procurement-opening) | Both · `resolveSummaryIdentity()`, `build-deterministic-summary.ts`, `brain.ts` | done |
| D-05 | `[review]s` — `stripBannedSummaryWords()` replaces `leverage` inside “Leverages” | AI post-process · `summary-rules.ts` | done |
| D-06 | Fabricated JD claims in summary (e.g. $100M spend) — no bullet anchor | AI generate + validate | done |
| D-07 | Cross-domain enhance with no coherence warning / gate | Both · pipeline + Review UI | done |

### P1 — Quality / misleading UX

| ID | Defect | Path | Status |
|----|--------|------|--------|
| D-08 | Engineering-biased summary templates (“systems design”, “technical requirements”) on non-tech JDs | Deterministic · `build-deterministic-summary.ts` | done |
| D-09 | Readiness score rewards keyword match without experience alignment | `resume-readiness-score.ts` + Review UI | done |
| D-10 | AI off still mutates summary/skills — tooltip-only warning | Review UI · `ReviewResumePanel.tsx` | done |
| D-11 | Summary vs experience inconsistency not surfaced | Pipeline meta + UI | done |
| D-12 | Duplicate skills — `Patient` + `Patient Care` | `merge-skills-grouped.ts` | done |
| D-13 | Missing domain signals — procurement, supply-chain, medtech | `jd-extractor.ts` · `jd-directive.ts` | done |
| D-14 | JD hybrid text misclassifies domain (analytics/algorithms → tech domain) | `jd-extractor.ts` | done |
| D-15 | Date typo `Present Present` after AI merge | AI merge · `post-process.ts` | done |
| D-16 | LinkedIn / contact dropped after enhance | Merge/export path | done |

### P2 — Polish

| ID | Defect | Path | Status |
|----|--------|------|--------|
| D-17 | Weak-bullet verbs engineering-default (`Built`, `Developed`) on non-tech JDs | `apply-enhance-plan-helpers.ts` | done |
| D-18 | HR/benefits JD noise not in stoplist (`first`, `big`, `annual`, …) | `keyword-extract.ts` | done |
| D-19 | Tier-3 skills use `isKnownSkillToken()` fragments not full labels | `jd-skills-deterministic.ts` | done |
| D-20 | AI summary aggressive vs conservative bullets — inconsistent grounding policy | AI prompt + validators | done |
| D-21 | Enhance journey debug logs not documented for QA | Dev env · `enhance-logger.ts` | done |
| D-22 | No automated regression fixture for 3-artifact protocol | Tests · `lib/job-tracker/enhance/` | partial — unit slices in `enhance-qa-case-001.test.ts`; full pipeline A/B/C **Todo** (see `ACTION_ITEMS.md`) |

### Product / process (not pure code)

| ID | Item | Status |
|----|------|--------|
| P-01 | Suggest realistic target roles on extreme cross-domain mismatch | open |
| P-02 | Feedback card tiers: formatting vs role-aligned | partial (coherence warnings + ATS cap) |
| P-03 | Export base profile without JD injection when AI off (optional) | open |

---

## 5. Fix plan (implementation order)

Work in order — later items depend on earlier guards.

| Phase | IDs | Goal |
|-------|-----|------|
| **1 — Deterministic safety** | D-01, D-02, D-03, D-18, D-19 | Stop junk skills and filter bypass |
| **2 — Summary integrity** | D-04, D-05, D-08, D-06, D-20 | Honest identity, no `[review]` leaks, no fabricated claims |
| **3 — Coherence & UX** | D-07, D-09, D-10, D-11, P-02 | Warn/gate cross-domain; honest ATS feedback |
| **4 — Domain & bullets** | D-13, D-14, D-17, D-12 | Better domain detection and verb/skill dedupe |
| **5 — Merge polish** | D-15, D-16 | Dates and contact preservation |
| **6 — Regression lock** | D-22, D-21 | Fixture test + debug doc for repeat QA |

After each phase: re-run **Case 001** (below) A/B/C and update case history + change log.

---

## 6. Case history

### Case 001 — Engineering profile × iRhythm Director, Procurement

| Field | Value |
|-------|--------|
| **Date** | 2026-06-27 |
| **Base profile** | Bhagath Siddi — Director / Head of Engineering (7-Eleven, CVS, mobile/platform) |
| **JD** | iRhythm `Director, Procurement` JR1437 (Orange County, medtech, $100M spend, ISO 13485, FDA) |
| **Surface** | Job Tracker Review (`job=cmqx4loo6000030xnced9qwyp`, `panel=resume`) |
| **AI setting** | Confirmed off via logs: `ai_enhancement_disabled`, code `ai_disabled` |
| **Career fit** | **Hard mismatch** — engineering leader, not procurement |

#### Artifact A — Base (excerpt)

- Summary: Director (engineering-adjacent), 20 years, Cloud/DevOps/skills
- Skills: Cloud & DevOps, Docker, Full-Stack & APIs, Mobile Development, …
- Experience: Head of Engineering, 7Now, Swift/Flutter, CVS Pay, etc.
- Typos: `ahigh-performing`, `capabilitywithin`, `i OS`, `Deployed played`

#### Artifact B — AI off (deterministic) — **re-test 2026-06-27 (post-fix)**

- Summary: **Head of Engineering** (not JD title); resume-native skills in S2; transferable bridge in S3; **10x metric** in S4
- Skills: JD procurement terms (capped at 6) + preserved resume-native skills (min 5 slots); **no junk tokens**
- Experience: Unchanged engineering content (expected for AI off); base typos preserved
- UI: “Enhanced without AI (rules engine)” + cross-domain coherence warning
- Verdict: **Pass** (Case 001 AI off) — honest identity, ATS keywords in skills only, no fabrication

#### Artifact B — AI off (deterministic) — *first run (pre-fix, historical)*

- Summary: **Director, Procurement** + engineering sentence 4 (7Now platform) — **incoherent**
- Skills: Valid procurement terms **plus junk** — `BIG`, `First`, `CARE`, `Patient`, `Annual`, `Direct`, `JOB`, `Investment`
- Verdict: **Fail** — defects D-01, D-02, D-04, D-08

#### Artifact C — AI on — **re-test 2026-06-27 (post-fix)**

- Summary: **Engineering Manager** (not JD title); Agile/SAFe/DevOps + Agentic AI; **10x grounded**; 7Now platform transformation — **no procurement prose, no fabricated spend, no `[review]`**
- Skills: Full procurement ATS list + engineering tail (Agile, SAFe, DevOps, Cloud-Native); **no junk tokens**
- Experience: Grammar/typo fixes (Node.js, TypeScript, iOS); titles still engineering; bullets still 7Now/Swift/MVVM — **honest**
- Verdict: **Pass** (Case 001 AI on) — identity + grounding hold; skills ATS-weighted as designed

#### Artifact C — AI on — *first run (pre-fix, historical)*

- Summary: Polished procurement prose; **fabricated** “$100M annual direct and indirect purchases”; **`[review]s`** in sentence 2
- Skills: Clean procurement list (Strategic Sourcing, Category Management, P2P, …) — **pass**
- Experience: Grammar fixed; titles still engineering; bullets still 7Now/Swift/MVVM
- Typos introduced: `Jan 2024 – Present Present`
- Verdict: **Fail** — defects D-05, D-06, D-04, D-11, D-15; skills **pass**

#### Case 001 — Review summary

| Check | Base | AI off (post-fix) | AI on (post-fix) |
|-------|------|-------------------|------------------|
| Honesty | ✅ | ✅ | ✅ |
| Coherence | ⚠️ wrong role if submitted | ✅ identity + bridge | ✅ eng summary + eng experience |
| Skills quality | ✅ eng | ✅ JD + native, no junk | ✅ JD-heavy + eng tail (ATS by design) |
| Summary quality | ⚠️ typos | ✅ cross-domain builder | ✅ polished, grounded |
| Experience | ⚠️ typos | ⚠️ unchanged (expected) | ✅ grammar + typos fixed |
| Submit to this JD | No | No (career mismatch) | No (career mismatch) |

**Fix verification:** Re-run Case 001 after Phase 1–3 complete; all three artifacts must meet [§2.3 checklist](#23-review-checklist) or document accepted limitation.

---

## 7. Change log

| Date | Change | Defect IDs | Verified (case) |
|------|--------|------------|-----------------|
| 2026-06-27 | Created playbook; documented Case 001 findings from first AI on/off review | — (discovery) | 001 |
| 2026-06-27 | Phases 1–6 shipped: skill filter, summary identity/grounding, coherence warnings, domain signals, merge polish, Case 001 regression test | D-01–D-22 | 001 (automated) |
| 2026-06-27 | Cross-domain summary builder (`cross-domain-summary.ts`) — identity + resume skills + experience-anchored bridge; JD keywords skills-only | D-04, D-08, D-11 | 001 |
| 2026-06-27 | AI-off polish: generic Director→experience title, metric bullet pick, JD skill cap 6 + min 5 resume skills, S3/S4 dedupe | D-04, D-08 | 001 |
| 2026-06-27 | Case 001 manual re-test: AI on pass — identity/grounding/brain rules hold; no fabrication or `[review]` | D-04, D-05, D-06 | 001 (manual) |
| 2026-06-28 | Case 001 BYOK debug: customer-route provider throws now log to `api_call_logs`; `enhanceMeta` persists `aiAttempted`/`aiSucceeded`/`warning`; `forceSystem` + `aiSourcePreference=system` honor system pool even when vault key exists | — | 001 (BYOK traces) |

---

## 8. How to use this doc in chat

**Starting a review session:**

```
Read docs/enhance-qa-playbook.md.
Case: [new or 001].
Artifacts attached: Base / AI off / AI on.
Review against §2.3 and §3. Update defect statuses if fixed.
```

**Starting implementation:**

```
Read docs/enhance-qa-playbook.md §4–§5.
Implement Phase [N]. Update defect status + §7 change log.
Run Case 001 A/B/C regression.
```

**Adding a new JD category:**

```
Add Case 00X to §6 with same A/B/C table.
Link any new defects to §4 with new D-XX IDs.
```

---

## 9. Debug reference (QA)

| What | Where |
|------|--------|
| AI disabled reason | Server log `[AiHealth] check.result` → `ai_enhancement_disabled` |
| Pipeline steps | `[EnhanceAI]` when `NEXT_PUBLIC_ANALYTICS_ENV=dev` (non-prod) |
| Engine mode | Response `engineMode`: `deterministic` \| `ai` |
| Block reason | `aiBlockCode`: `user_disabled`, `quota_exceeded`, … |
| BYOK failure w/ zero API rows | Pre-2026-06-28 bug: customer-route `generateText`/`generateObject` throws were not written to `api_call_logs`. Fixed — check trace for `aiMode: customer`, `errorCode`, `errorMessage`. |
| User warning | *“AI is disabled in settings — baseline enhancements were applied.”* |
| Code entry | `runResumeEnhancePipeline()` · `resolveAiUpgrade()` · `applyBaselineEnhance()` |

---

## 10. Accepted limitations (do not “fix” blindly)

Document in case review; do not count as regressions:

1. Deterministic path cannot invent experience in a new career domain.
2. AI cannot make a credible procurement director without real procurement history.
3. Cross-domain apply will always be a stretch — system must **flag**, not silently succeed.
4. Deterministic JD parsing is lower quality than AI — expected when AI is off.
