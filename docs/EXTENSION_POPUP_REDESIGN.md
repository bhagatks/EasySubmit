# Extension toolbar popup — v1 plan (two parts)

Last updated: **2026-06-27**

Scope: Chrome toolbar popup (`extension/src/popup/`) + the in-page **job card** flow it launches. Web **dashboard** is separate.

Product constraints: [`decisions.md`](./decisions.md) — **no one-click apply** in v1.

---

## Delivery split

| Part | Name | Surfaces | Ship first? |
|------|------|----------|-------------|
| **Part 1** | **Manual detection & force capture** | Content script + card (+ minimal popup wiring) | **Yes** |
| **Part 2** | **Popup redesign** | `popup.html` / `popup.ts` / styles | After Part 1 |

Part 1 fixes **reliability** (card always opens, manual fallback). Part 2 fixes **look & launcher UX** (stats, settings, states, brand).

---

# Part 1 — Manual detection & force capture

**Goal:** When auto-detect fails or the card never loaded, the user can still save a job via **Show job card** → force mount → **manual capture** (URL + JD + resume profile).

### Already in codebase

| Piece | Where |
|-------|--------|
| `FORCE_SHOW_CARD` from popup | `popup.ts` → `forceShowCard()` |
| Manual launch path | `resolveCardContent(..., launch: "manual")` |
| Loading → timeout → manual | 12s hydration → `manual_capture` |
| Manual form | URL, description, title, company |
| Profile picker on card | Header on all card modes |
| Save from manual | Same API as auto capture |

### Gaps to close (Part 1 scope)

| # | Work item | Why |
|---|-----------|-----|
| 1.1 | **Popup “Show job card” always injects content script** if missing | Fixes “extension didn’t load” defect |
| 1.2 | **Force path never dead-ends on `no_job`** when user explicitly forces | Manual launch should prefer `loading` → `manual_capture`, not “job not detected” only |
| 1.3 | **`no_job` card → “Add manually”** entry on auto-open pages | User on weird page can switch to manual without reopening popup |
| 1.4 | **Manual capture UX polish** — profile picker visible, min JD hint, CTA “Save to tracker” | Today CTA is “Add details”; align copy |
| 1.5 | **Context menu + popup parity** — both use same force → manual pipeline | Already share `FORCE_SHOW_CARD`; verify |
| 1.6 | **Return tab status to popup** (minimal) — `GET_TAB_STATUS`: `detected` \| `loading` \| `manual` \| `no_job` \| `restricted` | Popup can show one line before Part 2 redesign |

### Part 1 flow (authoritative)

```
User clicks "Show job card" (popup or context menu)
        │
        ▼
Inject content.js if needed → FORCE_SHOW_CARD
        │
        ▼
forceShowCard() — launch: "manual", always mount card
        │
        ├─ JD scraped (≥ min chars) ──────► Normal job card → Save to tracker
        │
        ├─ Job URL signal, JD loading ────► "Reading job details…"
        │         │
        │         └─ timeout / still empty ► Manual capture form
        │
        └─ No JD / weak page ─────────────► Manual capture form immediately
                                              │
                                              ├─ Job URL (prefilled, editable)
                                              ├─ Job description (paste JD)
                                              ├─ Role / Company (optional)
                                              ├─ Resume profile (header picker)
                                              └─ Save → same tracker pipeline
```

### Part 1 — out of scope

- Popup visual redesign, mini stats, brand tokens
- Removing one-click toggle (Part 2)
- New dashboard UI

### Part 1 — done when

- [x] Force show works on pages where auto-detect failed or script wasn’t injected
- [x] Manual capture reachable from every force-show path that lacks a JD
- [x] User can pick resume profile and save to tracker manually
- [x] Popup shows basic tab status string (optional minimal UI, not full redesign)

---

# Part 2 — Popup redesign

**Goal:** Replace the cluttered toolbar popup with a **launcher**: connect, this-tab context, show card, open tracker, mini stats, settings. **No one-click toggle.**

### Part 2 scope

| # | Feature |
|---|---------|
| 2.1 | State machine UI (not connected / connected / wrong tab / needs attention) |
| 2.2 | Account chip (email + connection dot) |
| 2.3 | **This tab** line — uses Part 1 `GET_TAB_STATUS` |
| 2.4 | Primary **Show job card** (wording from status: detected / add manually / card open) |
| 2.5 | **Open Job Tracker** secondary |
| 2.6 | **Mini stats** — e.g. `3 captured · 1 ready · 12 total` |
| 2.7 | **Settings** footer link → `/dashboard/settings` |
| 2.8 | Banners: **force upgrade** OR **stale session → Reconnect** (never both; upgrade wins) |
| 2.9 | Remove one-click apply toggle |
| 2.10 | Brand pass — engine glow, fonts, 12px radius |

### Part 2 — banners (#6 clarified)

| Condition | Show | Action |
|-----------|------|--------|
| Force upgrade required | Update banner only | Open store URL |
| Stale session (no `connectedUser`) | Reconnect banner only | Bridge login |
| Normal | No banner | Stats + Settings visible |

### Part 2 — out of scope

- Autofill / auto-submit
- Full job list in popup
- Resume edit / enhance in popup

---

## Current popup problems (Part 2 motivation)

| Problem | Today |
|---------|--------|
| No clear hierarchy | Two equal full-width buttons + toggle + two ghost links |
| Defensive copy | “If saves are missing… click Reconnect” reads like internal docs |
| Connect + Reconnect confusion | Both can appear; reconnect is demoted to footer link |
| Wrong feature in popup | One-click apply toggle — **removed from v1 scope** |
| No tab context | Doesn’t say if this page is a job, saved, or unsupported |
| Visual mismatch | Light generic chrome vs glossy in-page card + navy dashboard |
| Duplicates card | Settings menu on card already has Reconnect + Open Job Tracker |

---

## Competitor research (2026)

Patterns from the URLs you shared plus category leaders cited in [Resume Optimizer Pro’s autofill roundup](https://resumeoptimizerpro.com/blog/autofill-job-applications-chrome-extension).

### [FastApply](https://fastapply.co/how-it-works) — auto-apply volume

| Pattern | Takeaway for EasySubmit |
|---------|-------------------------|
| **Copilot default** — preview before submit | Aligns with our “no blind auto-submit” decision |
| Extension + **web dashboard** split | Toolbar = launcher; dashboard = tracker + analytics |
| 3-step story on marketing | We can use same narrative: connect → save on job site → track in dashboard |
| Modes (Copilot / Autopilot / Swipe) | **Skip** — we are not an auto-apply bot |

### [LazyApply](https://app.lazyapply.com/dashboard) — sidebar-as-dashboard

| Pattern | Takeaway |
|---------|----------|
| Click icon → **sidebar**, not tiny popup | Consider **side panel or wide popup** later; v1 can stay ~360px if dense |
| Recent applications + analytics in extension | **Mini stats** in popup (saved count, ready to review) — data we already have via API |
| Login **through extension** (Google) | We already use bridge; popup should show connection state clearly |
| Pause automation toggle | N/A — no automation product |

### [Careerflow](https://www.careerflow.ai/) — all-in-one copilot

| Pattern | Takeaway |
|---------|----------|
| **Job tracker** as core pillar | Match: “Open Job Tracker” stays primary nav |
| Chrome extension mentioned on homepage | Popup should feel like entry to **tracker + resume**, not settings |
| Autofill marketed heavily | **Do not copy** — we differentiate on **ATS resume quality**, not form spam |
| Free tier + upgrade | Popup can show quota/AI status chip (optional v1.1) |

### [JobWizard](https://jobwizard.ai/dashboard) — sidebar toolkit

| Pattern | Takeaway |
|---------|----------|
| **7 tabs in sidebar** on job page (Highlight, Autofill, Insight, Cover, Referrers, Chat, Track) | Heavy — our **card** already owns job-page UX; popup stays thin |
| **Track tab stats**: Applied / Saved / Autofilled / Viewed | Steal: **4 stat pills** at top of popup (we have pipeline statuses) |
| Match % + resume version on each row | We have ATS readiness / tailor state — show on “this job” row when detected |
| Never auto-submit | Same as our philosophy |

### Category table (from ROP article + store listings)

| Tool | Popup / entry UX | Tracker | Autofill / auto-apply | EasySubmit stance |
|------|------------------|---------|------------------------|-------------------|
| **Simplify Copilot** | In-page copilot on apply forms | Yes | Autofill + Easy Apply | Learn: **detect job page**, one primary action |
| **JobWizard** | Sidebar + stat dashboard | Built-in Track tab | Autofill + AI answers | Learn: **stats row**; skip autofill tab |
| **Huntr** | Save job + kanban | Kanban (100 free) | Autofill bundle | Learn: **save-first** CTA wording |
| **Careerflow** | Extension + web app | 10 free tracked | Autofill + LinkedIn focus | Learn: **Open dashboard** secondary |
| **FastApply / LazyApply** | Auto-apply bot / sidebar | Analytics-heavy | One-click volume | **Explicitly not us** |

---

## EasySubmit v1 popup — what we can build (real data today)

### Must ship (uses existing APIs)

| # | Feature | Source |
|---|---------|--------|
| 1 | **Connection chip** — email + green/amber/red dot | `GET /api/extension/config` → `connectedUser` |
| 2 | **This tab** context line | Content script ping + job detection (`detectJobPage`, saved status GET) |
| 3 | **Primary CTA** — context-aware | `FORCE_SHOW_CARD` / focus card if already open |
| 4 | **Open Job Tracker** | `OPEN_DASHBOARD` → `/dashboard/job-tracker` |
| 5 | **Reconnect** (when stale) | `OPEN_LOGIN` → bridge — same as card banner |
| 6 | **Connect account** (when no token) | Bridge flow |
| 7 | **Restricted tab message** | chrome://, dashboard, etc. |

### Should ship (small additions)

| # | Feature | Effort |
|---|---------|--------|
| 8 | **This job row** — title, company, pipeline status if saved on URL | Extend PING or new `GET_TAB_JOB_STATUS` message |
| 9 | **Mini tracker stats** — e.g. Captured / Ready / Applied counts | New lightweight `GET /api/extension/jobs/stats` or dashboard aggregate |
| 10 | **Open Settings** link | `OPEN_DASHBOARD` → `/dashboard/settings` (AI keys) |
| 11 | **Force upgrade** banner | Already in runtime config |

### Do not ship in popup v1

- One-click apply toggle (**cancelled** — [`decisions.md`](./decisions.md))
- Autofill / auto-submit controls
- Resume editor, enhance, PDF export
- Profile picker
- Full job list (that’s the dashboard)

---

## Proposed layouts (state machine)

### A — Not connected (~320×auto)

```
┌──────────────────────────────────┐
│ [ES] EasySubmit.ai               │
│      Job Tracker                 │
├──────────────────────────────────┤
│ Save roles from LinkedIn,        │
│ Indeed, Workday, and more —      │
│ tailor in your dashboard.        │
│                                  │
│ ┌──────────────────────────────┐ │
│ │     Connect account          │ │
│ └──────────────────────────────┘ │
│                                  │
│ Sign in at easysubmit.ai         │
└──────────────────────────────────┘
```

### B — Connected, job site tab

```
┌──────────────────────────────────┐
│ ● bstar@…          [Reconnect ↗]   │
├──────────────────────────────────┤
│ THIS PAGE                          │
│ Senior Engineer · Acme Inc       │
│ Saved · Resume ready               │  ← optional if known
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │   Show job card              │ │  primary
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │   Open Job Tracker           │ │  secondary
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│  3 captured · 1 ready · 12 total │  ← optional stats row
├──────────────────────────────────┤
│ Settings · Help                  │
└──────────────────────────────────┘
```

Primary label variants:
- Job not detected → **Show job card anyway**
- Card already open → **Job card is open** (disabled or “Scroll to card”)

### C — Connected, wrong tab

```
┌──────────────────────────────────┐
│ ● Connected                      │
├──────────────────────────────────┤
│ Open a job posting to use the    │
│ EasySubmit card on this page.    │
│                                  │
│ ┌──────────────────────────────┐ │
│ │   Open Job Tracker           │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

### D — Stale session / upgrade

Amber or red **banner** above actions (mirror in-card reconnect banner):
- **Reconnect** button → bridge
- Or **Update extension** → store URL from `forceUpgrade`

---

## Visual direction

| Token | Direction |
|-------|-----------|
| Width | 320–360px |
| Theme | Light shell OK for Chrome convention; use **engine glow** primary from `brand-colors` |
| Type | Space Grotesk title, DM Sans body (match dashboard) |
| Radius | 12px (`rounded-xl`) |
| Buttons | `PurposeButton`-equivalent styles from `brand-buttons` (extension variant) |
| Remove | Native checkbox one-click row |

---

## Comparison: popup vs card vs dashboard

| Job | Toolbar popup | In-page card | Dashboard |
|-----|---------------|--------------|-----------|
| Detect / save job | Launch card | **Primary** | View all saved |
| Tailor / enhance | — | Start pipeline / view status | **Review Screen** |
| Tracker stats | Mini summary | Per-job journey | **Full pipeline** |
| Connect account | **Primary when logged out** | Settings → Reconnect | Settings |
| AI keys | Link only | Fix banner → Settings | **Settings** |
| Autofill / auto-apply | **Never** | Assist only (future) | — |

---

## Implementation order (when we code)

1. **Part 1** — Manual detection & force capture (content script + card + minimal popup status)
2. **Part 2** — Popup redesign (UI, stats, settings, remove one-click toggle)

Do **not** start Part 2 visual work until Part 1 force → manual path is verified on: LinkedIn, Workday, unknown URL, and content-script-not-injected tab.

---

## References (competitor research — Part 2 input)

- [FastApply — How it works](https://fastapply.co/how-it-works)
- [LazyApply dashboard](https://app.lazyapply.com/dashboard)
- [Careerflow](https://www.careerflow.ai/)
- [JobWizard](https://jobwizard.ai/dashboard)
- [Autofill extensions ranked (Huntr, Simplify, etc.)](https://resumeoptimizerpro.com/blog/autofill-job-applications-chrome-extension)
- Internal: [`decisions.md`](./decisions.md), [`JOB_TRACKER.md`](./JOB_TRACKER.md)
