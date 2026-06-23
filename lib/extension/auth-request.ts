import type { NextRequest } from "next/server";
import { getExtensionConnectedUser } from "@/lib/extension/connected-user";
import { readBearerToken, verifyExtensionToken } from "@/lib/extension/auth-token";

/** Resolve extension bearer token to a live `users.id`, or null if invalid / stale. */
export async function getExtensionUserId(request: NextRequest): Promise<string | null> {
  const bearer = readBearerToken(request.headers.get("authorization"));
  const userId = verifyExtensionToken(bearer);
  if (!userId) return null;

  const user = await getExtensionConnectedUser(userId);
  return user?.id ?? null;
}

export function extensionUnauthorizedResponse(): Response {
  return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

/** Token verified but user row missing — extension must re-auth via dashboard/login. */
export function extensionReconnectResponse(): Response {
  return Response.json(
    {
      success: false,
      error:
        "Your extension session is out of date. Open EasySubmit, sign in again, and reconnect from Settings.",
      code: "EXTENSION_RECONNECT_REQUIRED",
    },
    { status: 401 },
  );
}

export async function resolveExtensionUserId(
  request: NextRequest,
): Promise<{ userId: string } | { response: Response }> {
  const bearer = readBearerToken(request.headers.get("authorization"));
  const tokenUserId = verifyExtensionToken(bearer);

  if (!tokenUserId) {
    return { response: extensionUnauthorizedResponse() };
  }

  const user = await getExtensionConnectedUser(tokenUserId);
  if (!user) {
    return { response: extensionReconnectResponse() };
  }

  return { userId: user.id };
}
