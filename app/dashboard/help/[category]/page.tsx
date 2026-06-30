import { notFound } from "next/navigation";
import { HelpArticleList } from "@/components/help/help-article-list";
import { HelpBreadcrumbs } from "@/components/help/help-breadcrumbs";
import { DashboardWorkspacePage } from "@/components/dashboard/DashboardWorkspacePage";
import { getArticlesForCategory, getHelpCategory } from "@/lib/help";

const BASE = "/dashboard/help";

type Props = { params: Promise<{ category: string }> };

export default async function DashboardHelpCategoryPage({ params }: Props) {
  const { category: categoryId } = await params;
  const category = getHelpCategory(categoryId);
  if (!category) notFound();

  const articles = getArticlesForCategory(categoryId);
  const Icon = category.icon;

  return (
    <DashboardWorkspacePage title={category.title} description={category.description}>
      <HelpBreadcrumbs
        items={[
          { label: "Help", href: BASE },
          { label: category.title },
        ]}
      />
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <HelpArticleList articles={articles} basePath={BASE} />
    </DashboardWorkspacePage>
  );
}
