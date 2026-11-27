import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { BLOG_ARTICLES, FEATURE_PAGES, SOLUTION_PAGES } from "@/config/seo-pages";
import { TOPICAL_SEO_PAGES } from "@/config/topical-seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "", changeFrequency: "weekly", priority: 1.0 },
    { path: "/download", changeFrequency: "weekly", priority: 0.95 },
    { path: "/features", changeFrequency: "weekly", priority: 0.9 },
    { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
    { path: "/how-it-works", changeFrequency: "monthly", priority: 0.8 },
    { path: "/security", changeFrequency: "monthly", priority: 0.8 },
    { path: "/faq", changeFrequency: "monthly", priority: 0.75 },
    { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
    { path: "/about", changeFrequency: "monthly", priority: 0.7 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
  ];

  const topicalRoutes = TOPICAL_SEO_PAGES.map((t) => ({
    path: `/${t.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.88,
  }));

  const featureRoutes = FEATURE_PAGES.map((f) => ({
    path: `/features/${f.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const solutionRoutes = SOLUTION_PAGES.map((s) => ({
    path: `/solutions/${s.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const blogRoutes = BLOG_ARTICLES.map((a) => ({
    path: `/blog/${a.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  return [
    ...staticRoutes,
    ...topicalRoutes,
    ...featureRoutes,
    ...solutionRoutes,
    ...blogRoutes,
  ].map((item) => ({
    url: `${siteConfig.url}${item.path}`,
    lastModified: now,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));
}
