# Resume Rules V2

**Version 1 (`docs/resume/RULES.md`, `lib/resume/*`) remains the default when v2 is off.**

Version 2 is an isolated rule set for page-mode-aware validation, readiness scoring, repair, and enhance prompts. Opt in via env:

```bash
RESUME_RULES_V2_ENABLED=true          # server (pipeline, brief, repair)
NEXT_PUBLIC_RESUME_RULES_V2=true      # client (AtsPanel scorer)
```

---

## Page modes

| Mode | Status | Purpose |
|------|--------|---------|
| **1** | **Implemented** | Tight 1-page ATS budget (scaled down from mode 2) |
| **2** | **Implemented** | Default — conservative ATS-oriented budget |
| **3** | **Implemented** | Extended three-page narrative (scaled up from mode 2) |
| **4+** | **Implemented** | No content limits — ATS parse-risk warning only |

Default: **`2`**

Legacy stored value `"4"` normalizes to **`4+`**.

Mode **4+** always emits this warning in validation, readiness (ATS Compliance pillar), and Review ATS tab:

> Page mode 4+ extended — content limits are not enforced. Long resumes may parse poorly in some ATS systems.

---

## Rule profiles (summary)

### Mode 2 (baseline)

| Area | Rule |
|------|------|
| **Summary** | Target **3–4** sentences, **70–90** words; warn **91–110**; error **111+** |
| **Skills** | Chat-style **category lines** — max **5** lines, max **75** unique terms; **no tables** |
| **Bullets** | **No hard cap**; recent **5–6** (warn **>8**), mid **3–4** (warn **>6**), older **1–2** (warn **>4**) |
| **Bullet length** | Target **15–28** words; warn **>200** characters |

### Mode 1 (tight)

| Area | Rule |
|------|------|
| **Summary** | **2–3** sentences, **55–70** words |
| **Skills** | Max **4** lines, **55** unique terms |
| **Bullets** | Recent **4–5**, mid **2–3**, older **1–2** |

### Mode 3 (extended)

| Area | Rule |
|------|------|
| **Summary** | **4–5** sentences, **95–115** words |
| **Skills** | Max **6** lines, **90** unique terms |
| **Bullets** | Recent **6–7**, mid **4–5**, older **2–3** |

### Mode 4+ (unlimited)

| Area | Rule |
|------|------|
| **Summary / skills / bullets** | No upper limits — repair skips tier/skill trimming |
| **Layout** | Single-column plain text; **no tables** (still enforced) |
| **Warning** | Extended-mode ATS parse risk (informational) |

All modes: single-column plain text; standard sections; **no tables**.

Full numeric profiles: `lib/resume/v2/rules-config.ts`

---

## Code (v2 only)

| Module | Path |
|--------|------|
| Page mode types | `lib/resume/v2/page-mode.ts` |
| Rule profiles | `lib/resume/v2/rules-config.ts` |
| Validation | `lib/resume/v2/validate-resume.ts` |
| Readiness score | `lib/resume/v2/resume-readiness-score.ts` |
| Post-generate repair | `lib/resume/v2/readiness-repair.ts` |
| Keyword scoring (intel-first) | `lib/resume/v2/keyword-scoring.ts` |
| DeepSeek prompt (benchmark plain text) | `lib/resume/v2/prompt.ts` |
| Enhance JSON prompts (production AI pass) | `src/lib/ai/engine/brain.ts` — `buildEnhance*PromptV2` |
| Runtime flag | `lib/resume/v2/runtime.ts` — `isResumeRulesV2Enabled()` |
| Public API | `lib/resume/v2/index.ts` |

---

## Wiring

Registered in features framework as **`resumeRulesV2`** (`resolveFeature({ feature: "resumeRulesV2" })`). DB flag: `resume_rules_v2` (default **on**).

When enabled for any implemented page mode:

| Surface | Behavior |
|---------|----------|
| **Enhance pipeline** | Profile-aware `repairResumeFormV2`; `computeResumeReadinessV2` for before/after delta |
| **Enhance brief** | Baseline readiness uses v2 scorer with active page mode |
| **AI pass (`run-enhance`)** | Profile-aware `buildEnhanceSystemPromptV2` / `buildEnhanceUserPromptV2` |
| **AtsPanel** | `computeResumeReadinessV2()` with `skillsText` + page mode; 4+ warning banner |
| **Export** | No silent 6-bullet truncate for explicit v2 page modes |

**Testing:** see [`RULES-V2-TESTING.md`](./RULES-V2-TESTING.md)

---

## Prototype benchmark (not production)

```bash
npx tsx .tmp-debug/chat-parity-v2-2page.mts --dry-run
CHAT_PARITY_MODEL=deepseek-v4-flash npx tsx .tmp-debug/chat-parity-v2-2page.mts
```

Plain-text `buildDeepSeekPromptV2` is profile-aware for all page modes (benchmark scripts).
