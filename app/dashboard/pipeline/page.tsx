import { notFound } from "next/navigation";
import { PipelineDebugWorkspace } from "@/components/dashboard/dev/PipelineDebugWorkspace";
import { isPipelineDebugEnabled } from "@/src/shared/extension/pipeline-debug-gate";

type PipelinePageProps = {
  searchParams?: { entryId?: string };
};

export default function PipelinePage({ searchParams }: PipelinePageProps) {
  if (!isPipelineDebugEnabled()) notFound();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PipelineDebugWorkspace initialEntryId={searchParams?.entryId ?? ""} />
    </div>
  );
}
