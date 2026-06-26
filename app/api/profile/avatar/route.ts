import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { removeUserAvatar, uploadUserAvatar } from "@/lib/profile/avatar-mutations";

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

  try {
    const result = await uploadUserAvatar(session.user.id, file);
    if (!result.success) {
      return Response.json(result, { status: 400 });
    }
    return Response.json(result);
  } catch {
    return Response.json({ success: false, error: "Could not upload photo." }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ success: false, error: "Sign in required." }, { status: 401 });
  }

  try {
    const result = await removeUserAvatar(session.user.id);
    if (!result.success) {
      return Response.json(result, { status: 400 });
    }
    return Response.json(result);
  } catch {
    return Response.json({ success: false, error: "Could not remove photo." }, { status: 500 });
  }
}
