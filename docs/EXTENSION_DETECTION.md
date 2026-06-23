# Extension job detection — architecture

Principal design for EasySubmit’s Chrome extension: **detect a single job posting**, scrape high-quality metadata, and never save careers hubs, search pages, or marketing fluff as jobs.

---

## Problem today

| Issue | Root cause |
|-------|------------|
| CVS `/careerareas` saved as job `"benefits"` | Trusted `jobs.cvshealth.com` host + generic DOM heuristics (Apply buttons, long body, nav labels scraped as title) |
| Lever/Ashby/etc. in types but no adapters | `ExtensionPlatform` and seed config ahead of `site-adapters.ts` |
| Two overlapping gates | `detectConfidence` (adapters) + `isJobPage` (fallback) + `isCareersListingOrHubUrl` (partial fix) |
| Hard to regression-test live sites | Cursor browser has **no extension**; agent cannot see Shadow DOM card |

Competitors optimize for **application forms**, not **job posting capture**:

| Product | Primary trigger | Job save on posting page? | Tailor per JD? |
|---------|-----------------|---------------------------|----------------|
| **Simplify** | Supported apply form → Copilot popup | Bookmark from 50+ boards (manual/extension) | Resume keyword gap + Simplify+ tailor |
| **LazyApply** | Form fields on LinkedIn/Indeed/Greenhouse | Tracks after apply | Bulk same profile |
| **Teal / CareerFlow** | Bookmark / tracker extension | Yes — CRM-style save | Resume versions, light match |
| **JobWizard / FastApply** | Auto-apply volume | Secondary | Template blast |
| **Jobright** | Copilot autofill + tracker | Yes | Match scoring + coach |
| **EasySubmit** | **Job posting detected → card** | Yes — core flow | **Deterministic + AI tailor pipeline** |

**Our wedge:** capture-quality-gated save → tailor → Review Screen → apply. Detection must be **conservative on hubs, aggressive on real postings**, with an **evidence trail** competitors don’t expose.

---

## Design: three layers (no dumb “score ≥ 5” alone)

```
URL + path taxonomy          Engine fingerprint           Platform adapter
(page-classifier.ts)    →    (ats-fingerprint.ts)    →   (site-adapters.ts)
        │                            │                          │
        └──────── reject hubs ───────┴── pick adapter family ────┘
                                          │
                              enrichment ladder (JSON-LD, og:title, URL slug)
                                          │
                              capture quality gate (capture-fields.ts)
                                          │
                              evidence bundle (capture-diagnostics.ts)
```

### Layer 1 — Page classifier (`page-classifier.ts`)

**PageKind** (single enum, used everywhere):

| Kind | Show card? | Save allowed? | Examples |
|------|------------|---------------|----------|
| `job_posting` | Yes | Yes | `/job/R0860007/...`, LinkedIn `/jobs/view/`, Greenhouse `/jobs/123` |
| `apply_form` | Yes (apply mode) | After capture | Workday `/apply`, Greenhouse apply step |
| `careers_hub` | No | No | CVS `/careerareas`, `/job-search`, Phenom home |
| `search_results` | No | No | `/jobs/search?q=`, LinkedIn search |
| `unknown` | Only if strong evidence | Gate on quality | Odd corporate pages |

**Rules (URL-first, DOM confirms — never invert):**

1. **Denylist paths** win before any positive signal (`/careerareas`, `/job-search`, `/browse`, …).
2. **Engine-specific posting shapes** (Phenom `/job/{req}/slug`, iCIMS `/job/{slug}/{id}`, Workday `/job/` or `/details/`).
3. **DOM only confirms** — hub pages with Apply CTAs and marketing copy must not pass on URL alone unless posting shape matches.

Phenom rule (fixes CVS class): `jobs.{brand}.com` **without** `/job/` in path → `careers_hub` unless JSON-LD `JobPosting` with matching `@id`.

### Layer 2 — ATS engine fingerprint (`ats-fingerprint.ts`)

Detect **engine**, not employer brand — same scraper covers many tenants:

| Engine | Host / script signals | Phase |
|--------|----------------------|-------|
| LinkedIn, Indeed | Known hosts | Live |
| Greenhouse, Workday | Known hosts + automation ids | Live |
| **Phenom** | `jobs.*`, `data-ph-at-id`, `/job/R\d+/` | Live |
| **iCIMS** | `icims.com`, `.iCIMS_*`, `/job/.../\d+` | Phase 1 |
| **Lever** | `jobs.lever.co`, `lever.co` | Phase 1 |
| **Ashby** | `jobs.ashbyhq.com` | Phase 1 |
| **SmartRecruiters** | `smartrecruiters.com` | Phase 1 |
| **Taleo** | `taleo.net`, Oracle career paths | Phase 1 |
| **Jobvite** | `jobvite.com` | Phase 1 |
| SuccessFactors, Workable, BambooHR, ADP, … | URL + meta patterns | Phase 2 |

Reuse `lib/job-tracker/ats/platform-rules.ts` URL patterns — **one registry**, consumed by extension + ATS panel.

### Layer 3 — Platform adapters (`site-adapters.ts`)

Each adapter: `urlPatterns`, `detectConfidence`, `scrape`, `mountSelectors`.

Phase 1 adds dedicated adapters (not generic) for: Lever, Ashby, iCIMS, SmartRecruiters, Taleo, Jobvite.

Generic adapter remains **last resort** when `genericFallbackEnabled` and page kind is `job_posting`.

### Enrichment ladder (already partial)

Order after adapter scrape:

1. JSON-LD `JobPosting`
2. `og:title` / `document.title` parsers (`careers-og-meta.ts`)
3. URL slug parsers (`job-url-parse.ts`)
4. Host → company (`KNOWN_CAREER_HOSTS`)

### Capture quality gate (differentiator)

`assessCaptureCompleteness` — required: url, title, description (≥120 chars). Critical: company.

**Future (no one else does this well):** block Save CTA when `missingBlockingQuality.length > 0` and page kind ≠ pre-hydration URL-only mode; show “Still loading job details…” with retry. Today we save with diagnostics logged.

Evidence: `buildCaptureDiagnostics` → `metadata.captureDiagnostics` on save.

---

## Testing without extension in agent browser

Cursor’s MCP browser **cannot load MV3 extensions**. Solve with a **Detection Replay Kit**:

| Tool | Purpose |
|------|---------|
| `buildScrapeDocument` + fixture matrix | Unit/integration tests without network (`lib/extension/job-scrape-integration.test.ts`) |
| `lib/extension/test-fixtures/negative-urls.ts` | Hub URLs that must **never** detect |
| `npm run extension:detect-eval -- --url <url>` | Fetch live HTML, parse with `linkedom`, print classifier + detect result |
| `npm run extension:detect-eval -- --fixture cvs-careerareas` | Offline replay from saved snapshot (optional) |
| Playwright + unpacked extension (later) | Full E2E card + Save |

**Workflow for engineers/agents:**

```bash
npm run extension:detect-eval -- --url "https://jobs.cvshealth.com/us/en/careerareas"
npm run extension:detect-eval -- --url "https://jobs.cvshealth.com/us/en/job/R0860007/Lead-Director-..."
npm test -- lib/extension/detection-eval.test.ts
```

---

## Rollout

### Phase 0 (now)

- [x] `page-classifier.ts` — hub denylist + Phenom posting shape
- [x] Wire `detect-job-page.ts` + `is-job-page.ts` through classifier
- [x] Negative URL matrix tests (CVS careerareas, job-search, …)
- [x] `extension:detect-eval` CLI
- [ ] Block Save on hub (already blocked at detect — verify extension content path)
- [ ] Commit + rebuild extension

### Phase 1 adapters

LinkedIn, Indeed, Greenhouse, Workday, Generic **+** Lever, Ashby, iCIMS, SmartRecruiters, Taleo, Jobvite — dedicated adapters, enabled in `app_config.extensionSites`.

### Phase 2 engines

SuccessFactors, Workable, BambooHR, ADP, Rippling, JazzHR, Paylocity, Paycom, ClearCompany, Teamtailor — fingerprint first, adapter second, community snapshot contributions.

---

## Config

`app_config.extensionSites`:

- `enabledPlatforms` — per-adapter toggles
- `genericFallbackEnabled` — default on; turn off to force explicit adapters only
- `minConfidence` — adapter score threshold (default 55)

Future: `hubDenyPatterns[]` in config for hotfix without deploy (optional).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-22 | Initial architecture doc; page classifier, Phase 1 adapter stubs, detect-eval CLI, negative fixture matrix |
