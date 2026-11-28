import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Code2,
  ExternalLink,
  Globe,
  Layers,
  Mail,
  Smartphone,
  Terminal,
} from "lucide-react";
import { founderProfile } from "@/config/founder";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import {
  JsonLd,
  buildBreadcrumbJsonLd,
  buildFounderProfilePageJsonLd,
} from "@/components/seo/json-ld";
import { PageContainer } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = buildPublicMetadata({
  title: "Vinkal Prajapati — Software Developer, Android Engineer & Founder",
  description:
    "Official profile of Vinkal Prajapati — Software Developer, Android Engineer (Kotlin, Jetpack Compose), Full-Stack SaaS Builder, and Founder of SBCI Computer Institute & CertiDesk Pro.",
  path: "/vinkal-prajapati",
  keywords: [...founderProfile.seoKeywords],
});

export default function VinkalPrajapatiPage() {
  return (
    <PageContainer>
      <JsonLd data={buildFounderProfilePageJsonLd()} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Vinkal Prajapati", path: "/vinkal-prajapati" },
        ])}
      />

      {/* Hero */}
      <Section spacing="md" background="surface">
        <Container>
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">Founder &amp; Independent Builder</Badge>
              <Badge variant="outline">Android &amp; Full-Stack SaaS</Badge>
            </div>

            <h1 className="text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              {founderProfile.name}
            </h1>
            <p className="text-primary mt-2 text-lg font-semibold sm:text-xl">
              {founderProfile.heroHeading}
            </p>
            <p className="text-muted mt-4 max-w-2xl text-base leading-relaxed">
              {founderProfile.heroSubheading}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#projects"
                className={buttonVariants({ variant: "primary", size: "md" })}
              >
                View Projects
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={`mailto:${founderProfile.email}`}
                className={buttonVariants({ variant: "outline", size: "md" })}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Contact Me
              </a>
              <a
                href={founderProfile.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "md" })}
              >
                <Code2 className="h-4 w-4" aria-hidden="true" />
                GitHub
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <a
                href={founderProfile.links.hashnode}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "md" })}
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Hashnode Blog
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </Container>
      </Section>

      {/* About */}
      <Section spacing="md">
        <Container>
          <div className="mx-auto max-w-4xl space-y-4">
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              About {founderProfile.name}
            </h2>
            <div className="text-muted space-y-3 text-sm leading-relaxed sm:text-base">
              {founderProfile.bioParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* Technical Skills */}
      <Section spacing="md" background="surface">
        <Container>
          <div className="mx-auto max-w-4xl space-y-6">
            <div>
              <h2 className="text-foreground text-2xl font-bold tracking-tight">
                Technical Skills &amp; Stack
              </h2>
              <p className="text-muted mt-1 text-sm">
                Technologies used across Android apps, multi-tenant web SaaS, and cloud
                backends.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {founderProfile.skillGroups.map((group) => (
                <Card key={group.category}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {group.category === "Mobile" ? (
                        <Smartphone className="text-primary h-4 w-4" aria-hidden="true" />
                      ) : group.category === "Backend" ? (
                        <Terminal className="text-primary h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Layers className="text-primary h-4 w-4" aria-hidden="true" />
                      )}
                      {group.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {group.items.map((skill) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* Featured Projects */}
      <Section id="projects" spacing="md">
        <Container>
          <div className="mx-auto max-w-4xl space-y-6">
            <div>
              <h2 className="text-foreground text-2xl font-bold tracking-tight">
                Featured Projects
              </h2>
              <p className="text-muted mt-1 text-sm">
                Android applications and education SaaS platforms built by Vinkal
                Prajapati.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {founderProfile.projects.map((project) => (
                <Card key={project.id} className="flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted text-xs font-medium">
                        {project.type}
                      </span>
                      <Badge
                        variant={
                          project.status === "Published" || project.status === "Active"
                            ? "success"
                            : "warning"
                        }
                      >
                        {project.status}
                      </Badge>
                    </div>
                    <CardTitle className="mt-2">{project.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted text-sm leading-relaxed">
                      {project.description}
                    </p>
                    {project.packageId && (
                      <p className="text-muted font-mono text-xs">
                        Package:{" "}
                        <span className="text-foreground">{project.packageId}</span>
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {project.techStack.map((tech) => (
                        <Badge key={tech} variant="outline">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3 pt-1 text-xs font-semibold">
                      {project.internalHref && (
                        <Link
                          href={project.internalHref}
                          className="text-primary inline-flex items-center gap-1 hover:underline"
                        >
                          Open Platform
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      )}
                      {project.liveUrl && (
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary inline-flex items-center gap-1 hover:underline"
                        >
                          Visit Website
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      )}
                      {project.privacyUrl && (
                        <a
                          href={project.privacyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted hover:text-foreground inline-flex items-center gap-1 hover:underline"
                        >
                          Privacy Policy
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* Experience & Entrepreneurship */}
      <Section spacing="md" background="surface">
        <Container>
          <div className="mx-auto max-w-4xl">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="text-primary h-5 w-5" aria-hidden="true" />
                    <CardTitle>{founderProfile.experience.organization}</CardTitle>
                  </div>
                  <Badge variant="primary">{founderProfile.experience.role}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="text-muted list-disc space-y-1.5 pl-5 text-sm">
                  {founderProfile.experience.focusAreas.map((area) => (
                    <li key={area}>{area}</li>
                  ))}
                </ul>
                <div>
                  <p className="text-foreground mb-2 text-xs font-semibold uppercase">
                    Training Domains
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {founderProfile.experience.trainingDomains.map((domain) => (
                      <Badge key={domain} variant="outline">
                        {domain}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* Contact */}
      <Section spacing="md">
        <Container>
          <div className="border-border bg-surface mx-auto max-w-4xl rounded-2xl border p-8">
            <h2 className="text-foreground text-2xl font-bold tracking-tight">
              Have an idea? Let&apos;s build something meaningful.
            </h2>
            <p className="text-muted mt-2 text-sm">{founderProfile.brandTagline}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={`mailto:${founderProfile.email}`}
                className={buttonVariants({ variant: "primary", size: "sm" })}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {founderProfile.email}
              </a>
              <a
                href={founderProfile.links.website}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Globe className="h-4 w-4" aria-hidden="true" />
                vinkal93.github.io
              </a>
              <a
                href={founderProfile.links.sbci}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                sbci.online
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </Container>
      </Section>
    </PageContainer>
  );
}
