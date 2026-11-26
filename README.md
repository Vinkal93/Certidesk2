# CertiDesk — Institute Management Platform

CertiDesk is a modern SaaS platform built for educational and training institutes to manage admissions, student profiles, courses and batches, faculty, attendance, fee collection, pending dues, examinations, subject-wise marksheets, certificates, and institutional reports.

## Phase 1 Scope

This repository currently implements **Phase 1: Project Foundation, Design System & Complete Landing Page**:

- Next.js 16 App Router + React 19 + strict TypeScript
- Tailwind CSS 4 with centralized CSS custom properties and `@theme` design tokens
- Reusable UI component library (`src/components/ui/`)
- Responsive global layout, navigation, mobile menu, and footer (`src/components/layout/`)
- Complete 17-section SaaS landing page (`src/components/marketing/`, `src/app/page.tsx`)
- Supporting routes (`/about`, `/contact`, `/get-started`, `/sign-in`, `/privacy`, `/terms`)
- SEO metadata, `sitemap.ts`, `robots.ts`, and `Organization` / `SoftwareApplication` JSON-LD

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4, Lucide React
- **Validation & Forms**: Zod, React Hook Form
- **Tooling**: TypeScript (strict), ESLint, Prettier

## Project Structure

```text
src/
├── app/                 # App Router pages, metadata, error/loading/not-found, SEO
├── components/
│   ├── layout/          # Navbar, Footer, Logo, PageContainer, SectionHeader
│   ├── marketing/       # Landing page sections and validated inquiry forms
│   └── ui/              # Reusable design-system primitives
├── config/              # Site configuration and landing page content
├── hooks/               # Custom React hooks (mobile menu state)
├── lib/                 # Shared utilities (cn)
├── types/               # TypeScript domain interfaces
└── validation/          # Zod schemas for forms
```

## Getting Started

1. Copy the environment example file:

```bash
cp .env.example .env.local
```

2. Install dependencies:

```bash
npm install
```

3. Run development server:

```bash
npm run dev
```

## Verification Commands

```bash
npm run type-check
npm run lint
npm run format:check
npm run build
```
