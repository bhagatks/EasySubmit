import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { bustAvatarImageCache } from "@/lib/profile/avatar-cache-bust";
import { deleteUserAvatarFile, saveUserAvatar } from "@/lib/profile/avatar-storage";

export type AvatarMutationResult =
  | { success: true; image: string }
  | { success: false; error: string };

function revalidateAvatarPaths(): void {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
}

export async function uploadUserAvatar(
  userId: string,
  file: File,
): Promise<AvatarMutationResult> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true, imageIsCustom: true },
  });

  const saved = await saveUserAvatar(userId, file);
  if (!saved.ok) {
    return { success: false, error: saved.error };
  }

  if (existing?.imageIsCustom && existing.image && existing.image !== saved.url) {
    await deleteUserAvatarFile(userId, existing.image);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      image: saved.url,
      imageIsCustom: true,
    },
  });

  revalidateAvatarPaths();
  return { success: true, image: bustAvatarImageCache(saved.url) };
}

export async function removeUserAvatar(userId: string): Promise<{ success: true } | { success: false; error: string }> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true, imageIsCustom: true },
  });

  if (existing?.imageIsCustom && existing.image) {
    await deleteUserAvatarFile(userId, existing.image);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      image: null,
      imageIsCustom: false,
    },
  });

  revalidateAvatarPaths();
  return { success: true };
}
