import { redirect } from "next/navigation";

/** Legacy route — canonical workbench is `/onboarding`. */
export default function RefineryAliasPage() {
  redirect("/onboarding");
}
