# Cursor Prompt 05 — Rename "AI Keys" → "AI" in Nav and Alerts

## Status

**✅ COMPLETED — 2026-06-26** — small copy-only changes, 4 locations

---

## Context

The AccountSettings section was renamed from "AI Keys" to "AI" and the page at
`/dashboard/keys` now manages the full AI experience (enable/disable + key vault). Four
user-visible strings still say "AI Keys" and need to match.

---

## Changes Required

### 1. Sidebar nav — `components/dashboard/DashboardShell.tsx` line 64

```ts
// Before
{ title: "AI Keys", href: "/dashboard/keys", icon: Key },

// After
{ title: "AI", href: "/dashboard/keys", icon: Key },
```

### 2. Health alert messages — `components/dashboard/AiHealthAlert.tsx`

Line 20:
```ts
// Before
key_missing: "Add your API key in AI Keys to continue",
// After
key_missing: "Add your API key in AI Settings to continue",
```

Line 21:
```ts
// Before
key_invalid: "Your API key is failing — verify it in AI Keys",
// After
key_invalid: "Your API key is failing — verify it in AI Settings",
```

Line 182:
```ts
// Before
const fixLabel = fixHref === "/dashboard/keys" ? "AI Keys" : "Settings";
// After
const fixLabel = fixHref === "/dashboard/keys" ? "AI Settings" : "Settings";
```

### 3. BYOK nudge — `components/dashboard/DashboardByokNudge.tsx` line 56

```tsx
// Before
Connect AI Keys
// After
Connect AI key
```

---

## Files to Edit

| File | Lines | Change |
|---|---|---|
| `components/dashboard/DashboardShell.tsx` | 64 | `"AI Keys"` → `"AI"` |
| `components/dashboard/AiHealthAlert.tsx` | 20, 21, 182 | `"AI Keys"` → `"AI Settings"` |
| `components/dashboard/DashboardByokNudge.tsx` | 56 | `"Connect AI Keys"` → `"Connect AI key"` |

## Files NOT to touch

- `components/dashboard/AccountSettings.tsx` — already updated
- `components/dashboard/BYOKStatus.tsx` — lines 55 and 78 are comments only, no user-visible strings

---

## Definition of Done

- [x] Sidebar nav shows "AI" not "AI Keys"
- [x] AiHealthAlert messages reference "AI Settings" not "AI Keys"
- [x] BYOK nudge says "Connect AI key"
- [x] `npx tsc --noEmit` — zero new errors
- [x] Update this file: change `🔶 OPEN` to `✅ COMPLETED — <date>` in the Status section above
