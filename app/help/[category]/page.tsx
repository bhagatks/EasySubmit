import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HelpArticleList } from "@/components/help/help-article-list";
import { HelpBreadcrumbs } from "@/components/help/help-breadcrumbs";
import { HelpShell } from "@/components/help/help-shell";
import { BRAND } from "@/lib/brand";
import { getArticlesForCategory, getHelpCategory } from "@/lib/help";

type HelpCategoryPageProps = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: HelpCategoryPageProps): Promise<Metadata> {
  const { category: categoryId } = await params;
  const category = getHelpCategory(categoryId);
  if (!category) {
    return { title: `Help Center | ${BRAND.full}` };
  }

  return {
    title: `${category.title} | Help Center | ${BRAND.full}`,
    description: category.description,
  };
}

export default async function HelpCategoryPage({ params }: HelpCategoryPageProps) {
  const { category: categoryId } = await params;
  const category = getHelpCategory(categoryId);
  if (!category) {
    notFound();
  }

  const articles = getArticlesForCategory(categoryId);
  const Icon = category.icon;

  return (
    <HelpShell>
      <HelpBreadcrumbs
        items={[
          { label: "Help", href: "/help" },
          { label: category.title },
        ]}
      />

      <div className="mb-8 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-primary">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{category.title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>
        </div>
      </div>

      <HelpArticleList articles={articles} />
    </HelpShell>
  );
}
