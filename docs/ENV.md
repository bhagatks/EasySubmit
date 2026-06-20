# Environment

Two commands — local secrets on disk, production secrets on **Vercel only**.

| Command | Purpose |
|---------|---------|
| **`run easy`** | Local dev — `.env.local`, migrations, dev server, incognito login |
| **`run easy prod`** | Deploy pipeline — tests → prod migrations (env pulled from Vercel) → `vercel deploy --prod` |

## Local dev

```bash
run easy
```

Auto-creates `.env.local` from `.env.example` on first run. One-time: paste `DATABASE_URL` if still a placeholder.

## Production deploy

Prod config lives in **Vercel → Environment Variables** (see `.env.vercel.example` as a checklist).

```bash
run easy prod
```

Pipeline:

1. Removes any legacy local prod env files (`.env.production.local`, etc.)
2. `npm test`
3. Pulls production env from Vercel **temporarily** → runs `prisma migrate deploy` → deletes temp file
4. `vercel deploy --prod`

One-time: `vercel login` and `vercel link` (prompted automatically).

## Files

```
.env.example           → local dev template (committed)
.env.vercel.example    → Vercel prod checklist (committed, not copied locally)
.env.local             → local secrets only (gitignored)
.env.vercel.deploy.tmp → ephemeral during deploy (gitignored, auto-deleted)
```

## Troubleshooting

**P1000 on local dev:** update `DATABASE_URL` in `.env.local`, run `run easy` again.

**Deploy fails on env pull:** ensure `DATABASE_URL` is set in Vercel Production environment variables.

**OAuth loops locally:** use the incognito window `run easy` opens automatically.
