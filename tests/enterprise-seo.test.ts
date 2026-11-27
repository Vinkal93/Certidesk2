import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { buildPrivateNoIndexMetadata, buildPublicMetadata } from "@/lib/seo/metadata";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
} from "@/components/seo/json-ld";
import { sanitizeAnalyticsParams } from "@/lib/analytics/events";
import { BLOG_ARTICLES, FEATURE_PAGES, SOLUTION_PAGES } from "@/config/seo-pages";

describe("Enterprise SEO Transformation QA", () => {
  it("generates unique self-referencing canonicals and en_IN OpenGraph metadata per public route", () => {
    const homeMeta = buildPublicMetadata({
      title: "CertiDesk Pro | Institute & Certificate Management Software",
      description: "Centralized institute management SaaS.",
      path: "/",
    });
    const featureMeta = buildPublicMetadata({
      title: "Student Management Software",
      description: "Manage student admissions and portals.",
      path: "/features/student-management",
    });

    expect(homeMeta.alternates?.canonical).toBe("/");
    expect(featureMeta.alternates?.canonical).toBe("/features/student-management");
    expect(featureMeta.openGraph?.locale).toBe("en_IN");
    expect(featureMeta.robots).toMatchObject({ index: true, follow: true });
  });

  it("enforces strict noindex/nofollow on private portals and utility routes", () => {
    const privateMeta = buildPrivateNoIndexMetadata("Super Admin Portal");
    expect(privateMeta.robots).toMatchObject({
      index: false,
      follow: false,
      nocache: true,
    });
  });

  it("disallows private portals, APIs, and auth routes in robots.ts", () => {
    const config = robots();
    const firstRule = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(firstRule).toBeDefined();
    expect(firstRule?.disallow).toEqual(
      expect.arrayContaining([
        "/su/",
        "/institute/",
        "/student/",
        "/api/",
        "/login",
        "/register",
        "/onboarding/",
        "/verify/",
      ])
    );
    expect(config.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it("lists all public feature, solution, and blog pages in sitemap.ts without private routes", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);

    for (const f of FEATURE_PAGES) {
      expect(urls.some((u) => u.endsWith(`/features/${f.slug}`))).toBe(true);
    }
    for (const s of SOLUTION_PAGES) {
      expect(urls.some((u) => u.endsWith(`/solutions/${s.slug}`))).toBe(true);
    }
    for (const b of BLOG_ARTICLES) {
      expect(urls.some((u) => u.endsWith(`/blog/${b.slug}`))).toBe(true);
    }

    for (const forbidden of [
      "/su",
      "/institute",
      "/student",
      "/login",
      "/register",
      "/sign-in",
    ]) {
      expect(urls.some((u) => u.endsWith(forbidden))).toBe(false);
    }
  });

  it("builds valid JSON-LD schemas without fabricated ratings or reviews", () => {
    const org = buildOrganizationJsonLd();
    const app = buildSoftwareApplicationJsonLd();
    const crumbs = buildBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Features", path: "/features" },
    ]);
    const faq = buildFaqJsonLd([{ question: "Q1", answer: "A1" }]);
    const article = buildArticleJsonLd({
      title: "Test Guide",
      description: "Desc",
      path: "/blog/test",
      datePublished: "2026-11-26",
      dateModified: "2026-11-26",
      authorName: "CertiDesk Editorial Team",
    });

    expect(org["@type"]).toBe("Organization");
    expect(app["@type"]).toBe("SoftwareApplication");
    expect(app).not.toHaveProperty("aggregateRating");
    expect(app).not.toHaveProperty("review");
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    expect(faq["@type"]).toBe("FAQPage");
    expect(article["@type"]).toBe("Article");
  });

  it("strips sensitive fields and PII from analytics conversion parameters", () => {
    const safe = sanitizeAnalyticsParams({
      plan: "2000_inr",
      password: "secret",
      otpCode: "123456",
      sessionToken: "tok",
      email: "owner@inst.edu",
      phone: "9876543210",
      step: 2,
    });

    expect(safe).toEqual({ plan: "2000_inr", step: 2 });
  });

  it("does not hardcode global canonical '/' in root layout.tsx", () => {
    const rootLayout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(rootLayout).not.toContain('canonical: "/"');
  });
});
