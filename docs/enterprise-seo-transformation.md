# CertiDesk Pro — Enterprise SEO Transformation Report & Governance Plan

**Date:** 2026-11-26  
**Primary Target Market:** India (`en-IN`, INR billing)  
**Product Category:** Institute Management & Certificate Management SaaS

---

## 1. Initial Codebase & Technical SEO Audit

| Issue                                                         | Severity     | Affected URL(s)                                                           | Evidence                                                                                        | Recommended Fix                                                                                                                       | Status    | Verification                   |
| ------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------ |
| Global `alternates: { canonical: "/" }` in root layout        | **Critical** | All child routes                                                          | `src/app/layout.tsx` hardcoded `canonical: "/"` globally                                        | Remove global canonical; use `buildPublicMetadata({ path })` per route                                                                | **Fixed** | `tests/enterprise-seo.test.ts` |
| Unprotected `robots.txt` (`allow: "/"`)                       | **High**     | `/su/*`, `/institute/*`, `/student/*`, `/api/*`, `/login`, `/register`    | `src/app/robots.ts` had zero disallow rules                                                     | Disallow private portals, APIs, auth/onboarding & verification routes                                                                 | **Fixed** | `tests/enterprise-seo.test.ts` |
| Utility `/sign-in` & redirect `/get-started` in `sitemap.xml` | **High**     | `/sitemap.xml`                                                            | `src/app/sitemap.ts` listed `/sign-in` and `/get-started`, missing feature/solution/blog routes | Index only clean canonical public routes (`/features/*`, `/solutions/*`, `/pricing`, `/how-it-works`, `/security`, `/faq`, `/blog/*`) | **Fixed** | `tests/enterprise-seo.test.ts` |
| Missing `og:image` / `twitter:image` & `en_US` locale         | **Medium**   | All public pages                                                          | `src/app/layout.tsx` lacked OG image and used `en_US`                                           | Added dynamic `src/app/opengraph-image.tsx` (1200x630), `src/app/icon.tsx`, and `en_IN` locale                                        | **Fixed** | `next build`                   |
| Hash-only navbar/footer links (`/#features`)                  | **Medium**   | Header & Footer                                                           | `src/config/site.ts` pointed all module/solution links to `/#...`                               | Point navigation and footer links to dedicated indexable URLs                                                                         | **Fixed** | `src/config/site.ts`           |
| Stale Phase 1 FAQ copy on homepage                            | **Medium**   | `/`                                                                       | `src/config/landing.ts` claimed portals/DB were "subsequent phases"                             | Replaced with accurate live prepaid wallet & portal FAQ                                                                               | **Fixed** | `src/config/landing.ts`        |
| Missing `noindex` on private/utility routes                   | **High**     | `/login`, `/register`, `/verify/*`, `/su/*`, `/institute/*`, `/student/*` | Layouts/pages lacked `robots: noindex`                                                          | Applied `buildPrivateNoIndexMetadata` across all portal layouts and auth/verify routes                                                | **Fixed** | `tests/enterprise-seo.test.ts` |

---

## 2. Competitor & Differentiation Matrix (India Market, Nov 2026)

> Note: Competitor capabilities and pricing observations below are sourced from public product pages and SaaS directories (`classplusapp.com`, `teachmint.com`, `fedena.com`, `edusuite.net`, `certpie.com`, `aqtiverse.in`). Exact private customer counts and paid SEO tool backlink metrics are intentionally omitted where unverified.

| Platform              | Primary Focus                              | Pricing Model                                  | CertiDesk Pro Differentiation                                                                           |
| --------------------- | ------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Classplus**         | Branded mobile apps & video course selling | ₹24,999–₹39,999+/year annual tiers             | CertiDesk Pro requires **₹0 upfront** and uses a prepaid Razorpay wallet for admissions & operations    |
| **Teachmint**         | Hybrid smart boards & classroom LMS        | Custom quotes / hardware bundles (~₹150k+)     | Software-first, instant self-registration with zero hardware lock-in                                    |
| **Fedena / EduSuite** | Heavy K-12 school/college ERPs             | Annual per-student/custom enterprise contracts | Lightweight setup built specifically for coaching, computer & vocational institutes                     |
| **CertPie**           | Standalone certificate generator           | Standalone document tool                       | CertiDesk Pro links certificates & marksheets directly to live student, batch, attendance & fee ledgers |

---

## 3. Keyword-to-URL Map (Anti-Cannibalization)

> Search volume, CPC, and KD scores are **not fabricated** (requires connected Google Ads Keyword Planner / Semrush / Ahrefs API). Intent and priority are mapped below.

| Cluster               | Primary Target Keywords                                                                               | Intent        | Target URL                        | Priority |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ------------- | --------------------------------- | -------- |
| Core Brand & Category | `institute management software`, `institute and certificate management`                               | Commercial    | `/`                               | P0       |
| Platform Hub          | `institute management software features`                                                              | Commercial    | `/features`                       | P0       |
| Student Management    | `student management software`, `student admission management software`, `student portal software`     | Commercial    | `/features/student-management`    | P0       |
| Institute ERP         | `institute ERP software`, `training institute management software`                                    | Commercial    | `/features/institute-management`  | P0       |
| Certificates          | `certificate generation software`, `online certificate generator`, `institute certificate management` | Commercial    | `/features/certificate-generator` | P0       |
| Marksheets & Exams    | `marksheet generator software`, `online marksheet generator`, `exam result management software`       | Commercial    | `/features/marksheet-generator`   | P0       |
| Attendance            | `attendance management software`, `student attendance ledger`                                         | Commercial    | `/features/attendance-management` | P1       |
| Fees                  | `institute fee management software`, `student fee tracking software`                                  | Commercial    | `/features/fee-management`        | P1       |
| Batches               | `batch management software`, `coaching batch scheduling`                                              | Commercial    | `/features/batch-management`      | P1       |
| Staff                 | `staff management software`, `institute staff access control`                                         | Commercial    | `/features/staff-management`      | P2       |
| Prepaid Wallet        | `prepaid institute software`, `pay per student admission software`                                    | Commercial    | `/features/wallet`                | P0       |
| Reports               | `institute reports software`, `coaching analytics dashboard`                                          | Commercial    | `/features/reports-analytics`     | P1       |
| Solutions             | `computer institute management software`, `coaching institute software`, `vocational institute ERP`   | Commercial    | `/solutions/*`                    | P0       |
| Pricing               | `institute management software pricing`                                                               | Transactional | `/pricing`                        | P0       |
| Editorial Guides      | `how to manage a computer institute digitally`, `certificate management workflow`                     | Informational | `/blog/*`                         | P1       |

---

## 4. Analytics, Conversion Tracking & Governance

- **Analytics Implementation:** `src/lib/analytics/events.ts` (`trackConversionEvent`, `sanitizeAnalyticsParams`) and `src/components/analytics/analytics-scripts.tsx` (activates only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` or `NEXT_PUBLIC_GTM_ID` is configured).
- **Tracked Safe Events:** `page_view`, `view_pricing`, `view_feature`, `click_register`, `registration_started`, `registration_completed`, `onboarding_started`, `onboarding_completed`, `wallet_recharge_started`, `wallet_recharge_success`, `demo_requested`, `contact_submitted`.
- **PII / Secret Stripping:** `sanitizeAnalyticsParams` strips `password`, `otp`, `token`, `secret`, `cookie`, `authorization`, `email`, `phone`, `mobile`.
- **Core Web Vitals Measurement Policy:** Measure live LCP (<= 2.5s), INP (<= 200ms), and CLS (<= 0.1) via Google PageSpeed Insights & Search Console after deployment — never fabricate scores pre-deployment.
- **Weekly / Monthly SEO Operations Cadence:**
  - Weekly: Check Google Search Console indexing, excluded pages, crawl errors, and `sitemap.xml` status.
  - Monthly: Review non-branded CTR, organic `/register` conversion rate, Core Web Vitals field data, and publish 2-4 verified editorial guides.
