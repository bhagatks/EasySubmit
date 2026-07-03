import { redirect } from "next/navigation";
import { EXTENSION_BRIDGE_HREF } from "@/lib/dashboard/dashboard-extension-links";

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

/** Legacy URL — bridge auth handoff lives at /extension/bridge. */
export default function DashboardExtensionBridgeRedirect({ searchParams }: PageProps) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value)) {
      for (const entry of value) query.set(key, entry);
    }
  }
  const suffix = query.toString();
  redirect(suffix ? `${EXTENSION_BRIDGE_HREF}?${suffix}` : EXTENSION_BRIDGE_HREF);
}
