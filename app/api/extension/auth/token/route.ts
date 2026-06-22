import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createExtensionToken } from "@/lib/extension/auth-token";
import { getExtensionConnectedUser } from "@/lib/extension/connected-user";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return Response.json({ success: false, error: "Sign in required" }, { status: 401 });
  }

  if ((session.user.onboardingStep ?? 0) < 4) {
    return Response.json(
      { success: false, error: "Complete onboarding before using the extension" },
      { status: 403 },
    );
  }

  const connectedUser = await getExtensionConnectedUser(userId);
  if (!connectedUser) {
    return Response.json({ success: false, error: "Account not found" }, { status: 404 });
  }

  const token = createExtensionToken(userId);

  return Response.json({
    success: true,
    token,
    userId,
    email: connectedUser.email,
    name: connectedUser.name,
    expiresInDays: 30,
  });
}
