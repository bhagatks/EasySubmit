import type { MetadataRoute } from "next";
import {
  getAllHelpArticles,
  getArticleHref,
  HELP_CATEGORIES,
} from "@/lib/help/content";
import { getPublicSiteUrl } from "@/lib/seo/public-site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getPublicSiteUrl();
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/extension`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/help`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const categoryPages: MetadataRoute.Sitemap = HELP_CATEGORIES.map((category) => ({
    url: `${baseUrl}/help/${category.id}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const articlePages: MetadataRoute.Sitemap = getAllHelpArticles().map((article) => ({
    url: `${baseUrl}${getArticleHref(article)}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticPages, ...categoryPages, ...articlePages];
}
