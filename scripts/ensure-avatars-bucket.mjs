#!/usr/bin/env node
/**
 * Ensure the public Supabase Storage bucket for profile avatars exists.
 * Run: npm run prod:ensure-avatars-bucket  (ephemeral Vercel Production env)
 */
import { createClient } from "@supabase/supabase-js";

const BUCKET = "avatars";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceRoleKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: buckets, error: listError } = await admin.storage.listBuckets();
if (listError) {
  console.error(`❌ Could not list buckets: ${listError.message}`);
  process.exit(1);
}

const existing = buckets?.find((b) => b.name === BUCKET);
if (existing) {
  console.log(`✔ Bucket "${BUCKET}" already exists (public=${existing.public})`);
  process.exit(0);
}

const { error: createError } = await admin.storage.createBucket(BUCKET, {
  public: true,
  fileSizeLimit: MAX_BYTES,
  allowedMimeTypes: ALLOWED_MIME,
});

if (createError) {
  console.error(`❌ Could not create bucket "${BUCKET}": ${createError.message}`);
  process.exit(1);
}

console.log(`✔ Created public bucket "${BUCKET}"`);
