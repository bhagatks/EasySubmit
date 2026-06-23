import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteUserAvatarFile, saveUserAvatar } from "@/lib/profile/avatar-storage";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ success: false, error: "Sign in required." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ success: false, error: "Invalid upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ success: false, error: "Choose an image file." }, { status: 400 });
  }

  const userId = session.user.id;
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true, imageIsCustom: true },
  });

  const saved = await saveUserAvatar(userId, file);
  if (!saved.ok) {
    return Response.json({ success: false, error: saved.error }, { status: 400 });
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

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");

  return Response.json({ success: true, image: saved.url });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ success: false, error: "Sign in required." }, { status: 401 });
  }

  const userId = session.user.id;
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

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");

  return Response.json({ success: true });
}
