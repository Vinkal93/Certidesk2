import { siteConfig } from "@/config/site";
import { founderProfile } from "@/config/founder";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface FaqSchemaItem {
  question: string;
  answer: string;
}

export interface ArticleSchemaInput {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
  authorName: string;
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function buildOrganizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/icon`,
    description: siteConfig.description,
    areaServed: "IN",
    founder: {
      "@id": `${siteConfig.url}/#vinkal-prajapati`,
      "@type": "Person",
      name: founderProfile.name,
      url: `${siteConfig.url}/vinkal-prajapati`,
    },
    sameAs: [founderProfile.links.certidesk, founderProfile.links.sbci],
    contactPoint: {
      "@type": "ContactPoint",
      email: siteConfig.supportEmail,
      contactType: "customer support",
      availableLanguage: ["English", "Hindi"],
    },
  };
}

export function buildFounderPersonJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${siteConfig.url}/#vinkal-prajapati`,
    name: founderProfile.name,
    alternateName: [
      "Vinkal Prajapati Developer",
      "Vinkal Prajapati Android Developer",
      "Vinkal Prajapati Software Engineer",
    ],
    url: `${siteConfig.url}/vinkal-prajapati`,
    email: `mailto:${founderProfile.email}`,
    jobTitle: "Software Developer, Android Engineer & Founder",
    description: founderProfile.positioning,
    knowsAbout: [
      "Android Development",
      "Kotlin",
      "Jetpack Compose",
      "Next.js",
      "React",
      "Firebase",
      "Firestore",
      "SaaS Architecture",
      "Multi-Tenant Software",
      "Education Technology",
    ],
    sameAs: [...founderProfile.sameAs],
    worksFor: {
      "@type": "EducationalOrganization",
      name: founderProfile.experience.organization,
      url: founderProfile.experience.website,
    },
    owns: [
      {
        "@type": "Organization",
        name: siteConfig.name,
        url: siteConfig.url,
      },
      {
        "@type": "EducationalOrganization",
        name: founderProfile.experience.organization,
        url: founderProfile.experience.website,
      },
    ],
  };
}

export function buildKnowledgeGraphJsonLd(): Record<string, unknown> {
  const personId = `${siteConfig.url}/#vinkal-prajapati`;
  const orgId = `${siteConfig.url}/#organization`;
  const websiteId = `${siteConfig.url}/#website`;
  const sbciId = `${founderProfile.links.sbci}/#organization`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": personId,
        name: founderProfile.name,
        url: `${siteConfig.url}/vinkal-prajapati`,
        email: `mailto:${founderProfile.email}`,
        jobTitle: "Software Developer, Android Developer & Founder",
        description: founderProfile.heroSubheading,
        sameAs: [...founderProfile.sameAs],
        knowsAbout: [
          "Kotlin",
          "Android Development",
          "Jetpack Compose",
          "React.js",
          "Next.js",
          "Firebase",
          "Firestore",
          "SaaS Development",
          "Multi-Tenant Architecture",
          "Education Technology",
        ],
        worksFor: { "@id": sbciId },
      },
      {
        "@type": "EducationalOrganization",
        "@id": sbciId,
        name: founderProfile.experience.organization,
        url: founderProfile.experience.website,
        founder: { "@id": personId },
      },
      {
        "@type": "Organization",
        "@id": orgId,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: `${siteConfig.url}/icon`,
        description: siteConfig.description,
        areaServed: "IN",
        founder: { "@id": personId },
        sameAs: [siteConfig.url, founderProfile.links.sbci],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: siteConfig.name,
        url: siteConfig.url,
        inLanguage: "en-IN",
        description: siteConfig.description,
        publisher: { "@id": orgId },
        creator: { "@id": personId },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteConfig.url}/#software`,
        name: siteConfig.name,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        inLanguage: "en-IN",
        url: siteConfig.url,
        description: siteConfig.description,
        author: { "@id": personId },
        creator: { "@id": personId },
        publisher: { "@id": orgId },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
          description:
            "Self-service institute registration with ₹0 upfront setup and prepaid Razorpay wallet recharge options.",
        },
      },
    ],
  };
}

export function buildFounderProfilePageJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${siteConfig.url}/vinkal-prajapati`,
    name: `${founderProfile.name} — Software Developer, Android Engineer & Founder`,
    description: founderProfile.heroSubheading,
    inLanguage: "en-IN",
    mainEntity: buildFounderPersonJsonLd(),
  };
}

export function buildWebSiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: "en-IN",
    description: siteConfig.description,
  };
}

export function buildSoftwareApplicationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    inLanguage: "en-IN",
    url: siteConfig.url,
    description: siteConfig.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      description:
        "Self-service institute registration with ₹0 upfront setup and prepaid Razorpay wallet recharge options.",
    },
  };
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.path === "/" ? siteConfig.url : `${siteConfig.url}${item.path}`,
    })),
  };
}

export function buildFaqJsonLd(items: FaqSchemaItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildArticleJsonLd(input: ArticleSchemaInput): Record<string, unknown> {
  const url = `${siteConfig.url}${input.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: {
      "@type": "Person",
      name: input.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/icon`,
      },
    },
  };
}
