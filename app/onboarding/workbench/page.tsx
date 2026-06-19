import { redirect } from "next/navigation";

/** Canonical workbench lives at `/onboarding`. */
export default function WorkbenchAliasPage() {
  redirect("/onboarding");
}
