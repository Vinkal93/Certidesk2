import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
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
          "/verify/",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
