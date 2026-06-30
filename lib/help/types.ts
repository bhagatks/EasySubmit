import type { LegalBlock } from "@/src/lib/services/legal-documents-config";
import type { LucideIcon } from "lucide-react";

export type HelpCategoryId =
  | "getting-started"
  | "chrome-extension"
  | "resume-tailoring"
  | "job-tracker"
  | "account-settings"
  | "billing"
  | "troubleshooting";

export type HelpCategory = {
  id: HelpCategoryId;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type HelpArticle = {
  slug: string;
  categoryId: HelpCategoryId;
  title: string;
  summary: string;
  blocks: LegalBlock[];
  updatedLabel?: string;
};

export type HelpSearchResult = {
  article: HelpArticle;
  category: HelpCategory;
  score: number;
};
