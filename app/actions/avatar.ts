"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  removeUserAvatar,
  uploadUserAvatar,
  type AvatarMutationResult,
} from "@/lib/profile/avatar-mutations";

export async function uploadProfileAvatar(formData: FormData): Promise<AvatarMutationResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Sign in required." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "Choose an image file." };
  }

  try {
    return await uploadUserAvatar(session.user.id, file);
  } catch {
    return { success: false, error: "Could not upload photo." };
  }
}

export async function removeProfileAvatar(): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Sign in required." };
  }

  try {
    return await removeUserAvatar(session.user.id);
  } catch {
    return { success: false, error: "Could not remove photo." };
  }
}
