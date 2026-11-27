import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { distributionConfig } from "@/config/distribution";
import { TOPICAL_SEO_PAGES } from "@/config/topical-seo";

describe("Enterprise PWA, Download Center & AI Search", () => {
  it("generates a valid installable PWA manifest with shortcuts and icons", () => {
    const m = manifest();
    expect(m.display).toBe("standalone");
    expect(m.icons?.length).toBeGreaterThanOrEqual(3);
    expect(m.shortcuts?.some((s) => s.url === "/download")).toBe(true);
    expect(m.shortcuts?.some((s) => s.url === "/scan-login")).toBe(true);
  });

  it("configures distribution platforms without fake native download URLs", () => {
    expect(distributionConfig.platforms).toHaveLength(6);
    expect(distributionConfig.faqs).toHaveLength(6);
  });

  it("allows legitimate AI search crawlers and blocks private portals in robots.txt", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const aiRule = rules.find(
      (rule) => Array.isArray(rule.userAgent) && rule.userAgent.includes("GPTBot")
    );
    expect(aiRule).toBeDefined();
    expect(aiRule?.disallow).toContain("/su/");
    expect(aiRule?.disallow).toContain("/institute/");
    expect(aiRule?.disallow).toContain("/api/");
  });

  it("includes /download and all 11 topical SEO pages in sitemap while excluding private routes", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/download"))).toBe(true);
    for (const page of TOPICAL_SEO_PAGES) {
      expect(urls.some((u) => u.endsWith(`/${page.slug}`))).toBe(true);
    }
    expect(urls.some((u) => u.includes("/su/"))).toBe(false);
    expect(urls.some((u) => u.includes("/institute/"))).toBe(false);
  });
});
