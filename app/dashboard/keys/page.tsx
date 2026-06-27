import { redirect } from "next/navigation";
import { SETTINGS_ADD_KEY_HREF, SETTINGS_KEYS_HREF } from "@/lib/dashboard/settings-ai-links";

type KeysPageProps = {
  searchParams?: { addKey?: string };
};

/** Legacy route — AI keys live in Settings. */
export default function KeysPage({ searchParams }: KeysPageProps) {
  if (searchParams?.addKey === "1") {
    redirect(SETTINGS_ADD_KEY_HREF);
  }
  redirect(SETTINGS_KEYS_HREF);
}
