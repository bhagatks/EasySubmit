import type { NextRequest } from "next/server";
import { getExtensionRuntimeConfig } from "@/lib/extension/runtime-config";
import {
  isExtensionGloballyEnabled,
  EXTENSION_GLOBAL_DISABLED_MESSAGE,
} from "@/src/shared/extension/extension-global-switch";

export { isExtensionGloballyEnabled, EXTENSION_GLOBAL_DISABLED_MESSAGE };

export async function extensionGlobalDisabledResponse(
  request: NextRequest,
): Promise<Response | null> {
  const config = await getExtensionRuntimeConfig(request.nextUrl.origin);
  if (isExtensionGloballyEnabled(config)) return null;
  return Response.json(
    { success: false, error: EXTENSION_GLOBAL_DISABLED_MESSAGE },
    { status: 503 },
  );
}
