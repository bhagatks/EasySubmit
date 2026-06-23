import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  AVATAR_STORAGE_BUCKET,
  createSupabaseAdminClient,
} from "@/lib/supabase/admin";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export type AvatarStorageResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

function avatarObjectPath(userId: string): string {
  return `${userId}/avatar.webp`;
}

function devAvatarFilePath(userId: string): string {
  return path.join(process.cwd(), "public", "avatars", `${userId}.webp`);
}

function devAvatarPublicUrl(userId: string): string {
  return `/avatars/${userId}.webp`;
}

async function processAvatarBuffer(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(256, 256, { fit: "cover", position: "centre" })
    .webp({ quality: 85 })
    .toBuffer();
}

export async function saveUserAvatar(
  userId: string,
  file: File,
): Promise<AvatarStorageResult> {
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: "Use a JPG, PNG, or WebP image." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Image must be 5 MB or smaller." };
  }

  const input = Buffer.from(await file.arrayBuffer());
  let processed: Buffer;

  try {
    processed = await processAvatarBuffer(input);
  } catch {
    return { ok: false, error: "Could not read that image file." };
  }

  const admin = createSupabaseAdminClient();
  const objectPath = avatarObjectPath(userId);

  if (admin) {
    const { error } = await admin.storage.from(AVATAR_STORAGE_BUCKET).upload(objectPath, processed, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "3600",
    });

    if (error) {
      return {
        ok: false,
        error:
          error.message ||
          "Avatar upload failed. Confirm the Supabase avatars bucket exists.",
      };
    }

    const { data } = admin.storage.from(AVATAR_STORAGE_BUCKET).getPublicUrl(objectPath);
    return { ok: true, url: data.publicUrl };
  }

  if (process.env.NODE_ENV === "development") {
    const filePath = devAvatarFilePath(userId);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, processed);
    return { ok: true, url: devAvatarPublicUrl(userId) };
  }

  return {
    ok: false,
    error:
      "Avatar upload is not configured. Set SUPABASE_SERVICE_ROLE_KEY and create a public avatars bucket.",
  };
}

export async function deleteUserAvatarFile(userId: string, imageUrl: string | null): Promise<void> {
  const admin = createSupabaseAdminClient();
  const objectPath = avatarObjectPath(userId);

  if (admin && imageUrl?.includes(`/storage/v1/object/public/${AVATAR_STORAGE_BUCKET}/`)) {
    await admin.storage.from(AVATAR_STORAGE_BUCKET).remove([objectPath]);
    return;
  }

  if (process.env.NODE_ENV === "development" && imageUrl?.startsWith("/avatars/")) {
    try {
      await unlink(devAvatarFilePath(userId));
    } catch {
      // File may already be gone.
    }
  }
}
