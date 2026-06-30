import { HelpCategoryGrid } from "@/components/help/help-category-grid";
import { HelpSearch } from "@/components/help/help-search";
import { DashboardWorkspacePage } from "@/components/dashboard/DashboardWorkspacePage";
import { HELP_CATEGORIES } from "@/lib/help";

const BASE = "/dashboard/help";

export default function DashboardHelpPage() {
  return (
    <DashboardWorkspacePage
      title="Help Center"
      description="Search our guides or browse topics below."
    >
      <div className="max-w-2xl">
        <HelpSearch basePath={BASE} />
      </div>
      <div className="mt-8">
        <HelpCategoryGrid categories={HELP_CATEGORIES} basePath={BASE} />
      </div>
    </DashboardWorkspacePage>
  );
}
