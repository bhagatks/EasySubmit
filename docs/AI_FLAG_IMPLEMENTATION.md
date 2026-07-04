# Three-Level AI Control System Implementation

## Overview

Implemented a three-tier AI flag system to replace the redundant `quotas.system.enable` flag with a cleaner architecture:

1. **Global Flag** (`EASYSUBMIT_AI_GLOBALLY_ENABLED`) - Environment variable, kill-switch for legal/emergency
2. **System Flag** (`app_config.aiEngine.enabled`) - Admin control over shared Gemini AI pool
3. **User Flag** (`user.systemAiEnabled`) - Per-user setting for free tier users to allow/deny system AI

## Changes Made

### Database Schema
- **File:** `prisma/schema.prisma`
- **Change:** Added `systemAiEnabled: Boolean @default(true)` field to User model
- **Migration:** `prisma/migrations/20260704100000_add_system_ai_enabled_flag/migration.sql`

### Config Structure
- **File:** `src/lib/services/ai-engine-config.ts`
- **Removed:** `quotas.system.enable` flag (redundant)
- **Added:** Top-level `enabled: boolean` field to `AiEngineConfig`
- **Updated:** Type definitions, parser, and defaults

### Routing Logic
- **File:** `src/lib/ai/engine/router.ts`
- **Changed:** Parameter `systemAiEnabled` → `userSystemAiEnabled`
- **Logic:** Now combines `engine.enabled && (userSystemAiEnabled ?? true)` for final decision
- **Decision Tree:** Global → System → User → Fallback to BYOK

### Database Queries
Updated all Prisma selects that fetch user data for AI decisions:

- `lib/ai/system-quota-gate-for-user.ts` - Added `systemAiEnabled` to `SYSTEM_QUOTA_USER_SELECT`
- `lib/ai/byok-key-gate-for-user.ts` - Added `systemAiEnabled` to `BYOK_GATE_USER_SELECT`
- `src/lib/ai/engine/system-quota-gate.ts` - Updated `SystemQuotaUserRow` type

### Server Actions
- **File:** `app/actions/user/update-system-ai-setting.ts` (new)
- **Function:** `updateSystemAiSetting(enabled: boolean)`
- **Purpose:** Let free users toggle system AI access

### UI Component
- **File:** `components/dashboard/AiSettingsPanel.tsx` (new)
- **Props:** `systemAiEnabled`, `isSubscribed`, `onToggleSystemAi`, `isLoading`
- **Behavior:**
  - Shows warning when system flag is off (admin disabled)
  - Shows toggle for free users when system flag is on
  - Shows unlimited message for paid users
  - Displays actual quota limit from config

### Router Updates
Updated all callers of `resolveAiRoute()`:

- `lib/features/resolve-enhance.ts` - Pass `userSystemAiEnabled: user.systemAiEnabled`
- `lib/ai/enhance-cover-letter-for-user.ts` - Pass `userSystemAiEnabled: user.systemAiEnabled`
- `lib/ai/byok-key-gate-for-user.ts` - Pass `userSystemAiEnabled: options?.systemAiEnabled`
- `lib/ai/system-quota-gate-for-user.ts` - Pass `userSystemAiEnabled: user.systemAiEnabled`

### Tests
Updated tests to use new structure:

- `lib/ai/engine/ai-engine-config.test.ts` - Check `AI_ENGINE_DEFAULTS.enabled` instead of `quotas.system.enable`
- `lib/ai/system-quota-gate.test.ts` - Added `systemAiEnabled: true` to test user row

## Decision Flow

```
EASYSUBMIT_AI_GLOBALLY_ENABLED = false?
  → NO AI (end)

app_config.aiEngine.enabled = false?
  → BYOK ONLY (force user to provide key)
  → Show warning in settings

Subscription = true?
  → Always SYSTEM AI (ignore user flag)

Subscription = false (free tier)?
  → Check user.systemAiEnabled:
    → true → System AI available
    → false → BYOK ONLY, show warning
```

## Config Example

```json
{
  "aiEngine": {
    "enabled": true,
    "system": {
      "modelId": "gemini-2.5-flash-lite",
      "maxKeySlots": 3
    },
    "quotas": {
      "system": {
        "dailyEnhancements": 5,
        "dailyCalls": 20
      },
      "customer": {
        "aiDailyUnlimited": true,
        "dailyEnhancements": 50,
        "dailyCalls": 200
      }
    },
    "customerDailyEnhancementCap": 50
  }
}
```

## Next Steps

1. Run `npm run db:seed` or deploy migration
2. Regenerate Prisma client: `npx prisma generate`
3. Wire UI component into dashboard settings page
4. Test toggle behavior and warning messages
5. Update feature documentation
