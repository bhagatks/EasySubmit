import { redirect } from "next/navigation";

type LegacyPipelineDebugPageProps = {
  searchParams?: { entryId?: string };
};

/** Legacy URL — canonical dev route is `/dashboard/pipeline`. */
export default function LegacyPipelineDebugRedirect({ searchParams }: LegacyPipelineDebugPageProps) {
  const entryId = searchParams?.entryId?.trim();
  if (entryId) {
    redirect(`/dashboard/pipeline?entryId=${encodeURIComponent(entryId)}`);
  }
  redirect("/dashboard/pipeline");
}
