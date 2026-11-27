import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

const DISALLOWED_PATHS = [
  "/su",
  "/su/",
  "/institute",
  "/institute/",
  "/student",
  "/student/",
  "/api/",
  "/login",
  "/sign-in",
  "/register",
  "/register/",
  "/onboarding",
  "/onboarding/",
  "/scan-login",
  "/offline",
  "/verify/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "PerplexityBot",
          "Googlebot",
          "Bingbot",
          "Applebot",
        ],
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
