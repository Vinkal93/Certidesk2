import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export interface PublicMetadataInput {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  ogType?: "website" | "article";
  noIndex?: boolean;
}

export function buildPublicMetadata(input: PublicMetadataInput): Metadata {
  const normalizedPath = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const canonicalUrl =
    normalizedPath === "/" ? siteConfig.url : `${siteConfig.url}${normalizedPath}`;
  const fullTitle =
    normalizedPath === "/" ? input.title : `${input.title} | ${siteConfig.name}`;
  const ogImageUrl = `${siteConfig.url}/opengraph-image`;

  return {
    title: normalizedPath === "/" ? { absolute: input.title } : input.title,
    description: input.description,
    keywords: input.keywords,
    alternates: {
      canonical: normalizedPath,
    },
    openGraph: {
      type: input.ogType ?? "website",
      locale: "en_IN",
      url: canonicalUrl,
      siteName: siteConfig.name,
      title: fullTitle,
      description: input.description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} — ${input.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: input.description,
      images: [ogImageUrl],
    },
    robots: input.noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

export function buildPrivateNoIndexMetadata(
  title: string,
  description?: string | undefined
): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  };
}
