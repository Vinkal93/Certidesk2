import { siteConfig } from "@/config/site";
import { moduleSpotlights } from "@/config/landing";
import { PageContainer } from "@/components/layout";
import { HeroSection } from "@/components/marketing/hero-section";
import { CredibilitySection } from "@/components/marketing/credibility-section";
import { CoreFeaturesSection } from "@/components/marketing/core-features-section";
import { WorkflowSection } from "@/components/marketing/workflow-section";
import { ModuleSpotlightSection } from "@/components/marketing/module-spotlight-section";
import { ProductPreviewSection } from "@/components/marketing/product-preview-section";
import { SolutionsSection } from "@/components/marketing/solutions-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  contactPoint: {
    "@type": "ContactPoint",
    email: siteConfig.supportEmail,
    contactType: "customer support",
  },
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  description: siteConfig.description,
  url: siteConfig.url,
};

export default function HomePage() {
  return (
    <PageContainer>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd),
        }}
      />

      {/* 2. Hero */}
      <HeroSection />

      {/* 3. Product credibility & key benefits */}
      <CredibilitySection />

      {/* 4. Core feature grid */}
      <CoreFeaturesSection />

      {/* 5. Institute management workflow */}
      <WorkflowSection />

      {/* 6-11. Student, Fee, Attendance, Examination & Marksheet, Certificate, Reports */}
      {moduleSpotlights.map((spotlight, index) => (
        <ModuleSpotlightSection
          key={spotlight.id}
          spotlight={spotlight}
          reverse={index % 2 === 1}
          background={index % 2 === 1 ? "surface" : "default"}
        />
      ))}

      {/* 12. Product interface preview */}
      <ProductPreviewSection />

      {/* 13. Solutions for different institutes */}
      <SolutionsSection />

      {/* 14. Pricing */}
      <PricingSection />

      {/* 15. FAQ */}
      <FaqSection />

      {/* 16. Final CTA */}
      <FinalCtaSection />
    </PageContainer>
  );
}
