import type { NextRequest } from "next/server";
import { resolveExtensionUserId } from "@/lib/extension/auth-request";
import { extensionGlobalDisabledResponse } from "@/lib/extension/extension-global-gate";
import { patchExtensionUserPrefs } from "@/lib/profile/application-profile-merge";
import type { ApplicationProfile } from "@/lib/profile/application-profile";

function readApplicationProfilePatch(body: unknown): Partial<ApplicationProfile> | null {
  if (!body || typeof body !== "object") return null;
  const patch = (body as Record<string, unknown>).applicationProfile;
  if (patch == null) return null;
  if (typeof patch !== "object" || Array.isArray(patch)) return null;
  return patch as Partial<ApplicationProfile>;
}

export async function PATCH(request: NextRequest) {
  const disabled = await extensionGlobalDisabledResponse(request);
  if (disabled) return disabled;

  const auth = await resolveExtensionUserId(request);
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const autoApplyUserSwitch =
    body &&
    typeof body === "object" &&
    typeof (body as Record<string, unknown>).autoApplyUserSwitch === "boolean"
      ? ((body as Record<string, unknown>).autoApplyUserSwitch as boolean)
      : undefined;

  const applicationProfile = readApplicationProfilePatch(body);

  if (autoApplyUserSwitch === undefined && applicationProfile === null) {
    return Response.json(
      {
        success: false,
        error: "Provide autoApplyUserSwitch and/or applicationProfile in the body",
      },
      { status: 400 },
    );
  }

  const updated = await patchExtensionUserPrefs(userId, {
    ...(autoApplyUserSwitch !== undefined ? { autoApplyUserSwitch } : {}),
    ...(applicationProfile !== null ? { applicationProfile } : {}),
  });

  return Response.json({
    success: true,
    autoApplyUserSwitch: updated.autoApplyUserSwitch,
    applicationProfile: updated.applicationProfile,
  });
}
