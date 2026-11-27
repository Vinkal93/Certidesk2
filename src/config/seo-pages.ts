export interface SeoFaqItem {
  question: string;
  answer: string;
}

import { BLOG_POSTS_DATA } from "./blog-posts";

export interface FeaturePageSpec {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  eyebrow: string;
  problem: string;
  audience: string[];
  howItWorks: string[];
  capabilities: Array<{ title: string; description: string }>;
  benefits: string[];
  limitations: string[];
  securityNote: string;
  relatedSlugs: string[];
  faqs: SeoFaqItem[];
}

export interface SolutionPageSpec {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  eyebrow: string;
  overview: string;
  challenges: string[];
  workflows: Array<{ title: string; detail: string }>;
  recommendedModules: string[];
  faqs: SeoFaqItem[];
}

export interface BlogArticleSpec {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  cluster: string;
  tags: string[];
  authorName: string;
  publishedAt: string;
  updatedAt: string;
  readTime: string;
  coverImage: string;
  excerpt: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
  relatedFeatures: Array<{ label: string; href: string }>;
}

export const FEATURE_PAGES: FeaturePageSpec[] = [
  {
    slug: "student-management",
    title: "Student Management Software for Institutes",
    metaTitle: "Student Management Software for Institutes",
    metaDescription:
      "Manage student admissions, unique student IDs, course and batch mapping, academic profiles, and student portal access with CertiDesk Pro.",
    keywords: [
      "student management software",
      "student admission management software",
      "student database management",
      "student portal software",
    ],
    eyebrow: "Student Lifecycle",
    problem:
      "Institutes relying on spreadsheets and paper admission registers struggle with duplicate student records, missing fee histories, and slow document lookups.",
    audience: [
      "Computer training institutes",
      "Coaching centres and tuition academies",
      "Skill development and vocational centres",
    ],
    howItWorks: [
      "Institute Admin checks available prepaid wallet balance before admitting a student.",
      "Submitting the admission form atomically debits the configured admission fee and assigns a unique Student ID.",
      "The student receives login credentials for the dedicated Student Portal to view attendance, fees, marksheets, and certificates.",
    ],
    capabilities: [
      {
        title: "Structured Admission Records",
        description:
          "Capture student contact details, guardian metadata, course selection, batch assignment, and admission status in one tenant-isolated record.",
      },
      {
        title: "Unique Student Identifiers",
        description:
          "Every admitted learner receives an immutable Student ID linked across attendance, fees, examinations, marksheets, and certificates.",
      },
      {
        title: "Dedicated Student Portal",
        description:
          "Students sign in at /student/login to check attendance, download fee receipts, view exam results, and access issued certificates.",
      },
      {
        title: "Status & Lifecycle Control",
        description:
          "Track active, completed, or suspended enrollments with full audit trails.",
      },
    ],
    benefits: [
      "Eliminates duplicate manual entries across departments",
      "Prevents unrecorded admissions via wallet-verified creation",
      "Reduces front-desk support calls with student self-service",
    ],
    limitations: [
      "Student admission requires sufficient prepaid wallet balance configured for the institute.",
    ],
    securityNote:
      "All student records are strictly scoped by instituteId on the server using Firebase Admin session verification and Firestore security rules.",
    relatedSlugs: ["institute-management", "batch-management", "wallet"],
    faqs: [
      {
        question: "Do students get their own login portal?",
        answer:
          "Yes. Admitted students can sign in to the CertiDesk Pro Student Portal to view their profile, attendance, fee payments, marksheets, and certificates.",
      },
      {
        question: "What happens if wallet balance is low during admission?",
        answer:
          "Admission does not complete until the institute recharges its prepaid wallet, preventing negative balances or unbilled records.",
      },
    ],
  },
  {
    slug: "institute-management",
    title: "Centralized Institute Management Software",
    metaTitle: "Institute Management Software | Multi-Tenant ERP",
    metaDescription:
      "Run admissions, courses, batches, staff roles, attendance, fees, marksheets, and certificates from one multi-tenant institute management platform.",
    keywords: [
      "institute management software",
      "institute ERP software",
      "training institute management software",
    ],
    eyebrow: "Institute Operations",
    problem:
      "Running admissions in one tool, attendance on paper, fees in Excel, and certificates in CorelDraw creates operational silos and human errors.",
    audience: [
      "Independent training academies",
      "Multi-branch computer & coaching institutes",
      "Educational organizations",
    ],
    howItWorks: [
      "Self-register your institute via /register to generate a unique Institute ID and isolated workspace.",
      "Configure courses, batches, staff accounts, and institutional branding in Settings.",
      "Operate all daily academic and billing workflows from the unified Institute Admin portal.",
    ],
    capabilities: [
      {
        title: "Self-Service Onboarding",
        description:
          "Launch a new institute workspace in minutes with instant Institute ID assignment and optional wallet recharge.",
      },
      {
        title: "Course & Academic Structure",
        description:
          "Define modular courses, durations, and fee structures tailored to short-term or long-term programs.",
      },
      {
        title: "Role-Based Access Control",
        description:
          "Separate Institute Admin, Staff, and Student portals with server-enforced authorization.",
      },
      {
        title: "Prepaid Service Wallet",
        description:
          "Pay only for active admissions and platform services without rigid annual seat lock-ins.",
      },
    ],
    benefits: [
      "Single source of truth for academic and financial data",
      "Faster staff onboarding with structured workflows",
      "Zero upfront annual contract barrier",
    ],
    limitations: [
      "Custom third-party hardware integrations (such as biometric devices) are not bundled natively.",
    ],
    securityNote:
      "Strict multi-tenant boundaries ensure one institute can never query or modify another institute's data.",
    relatedSlugs: ["student-management", "staff-management", "reports-analytics"],
    faqs: [
      {
        question: "How quickly can an institute start using CertiDesk Pro?",
        answer:
          "Institutes can self-register immediately via the Get Started flow, set up courses and batches, and skip or complete wallet recharge during onboarding.",
      },
    ],
  },
  {
    slug: "certificate-generator",
    title: "Certificate Generation & Verification Software",
    metaTitle: "Certificate Generation & Verification Software",
    metaDescription:
      "Generate verifiable student completion certificates directly from your institute database with public verification URLs on CertiDesk Pro.",
    keywords: [
      "certificate generation software",
      "online certificate generator",
      "institute certificate management",
      "student certificate management",
    ],
    eyebrow: "Verifiable Credentials",
    problem:
      "Manually typing student names into design templates leads to spelling mistakes, inconsistent numbering, and certificates that employers cannot verify.",
    audience: [
      "Computer training institutes",
      "Vocational & skill certification centres",
      "Coaching academies issuing course completion credentials",
    ],
    howItWorks: [
      "Select an enrolled student whose course and exam requirements are complete.",
      "CertiDesk Pro binds verified student and course fields into a numbered certificate record.",
      "Each issued certificate receives a public verification route (/verify/[verificationId]) showing live issued or revoked status.",
    ],
    capabilities: [
      {
        title: "Database-Driven Issuance",
        description:
          "Pulls student name, course title, and institute identity directly from verified records.",
      },
      {
        title: "Public Verification Portal",
        description:
          "Anyone with the verification ID can confirm certificate authenticity and revocation status online.",
      },
      {
        title: "Revocation & Audit Trail",
        description:
          "Super Admin and Institute controls preserve issuance and revocation integrity.",
      },
      {
        title: "Student Portal Access",
        description:
          "Students can view and access their issued certificates directly from their dashboard.",
      },
    ],
    benefits: [
      "Eliminates manual formatting and spelling errors",
      "Builds employer and parent trust with live verification",
      "Keeps a permanent searchable archive of issued credentials",
    ],
    limitations: [
      "Certificates are tied to registered institute student records rather than anonymous one-off uploads.",
    ],
    securityNote:
      "Verification pages expose only certificate validation status and credential fields, never private billing or contact secrets.",
    relatedSlugs: ["marksheet-generator", "student-management", "institute-management"],
    faqs: [
      {
        question: "Can employers verify certificates online?",
        answer:
          "Yes. Every issued certificate has a unique verification ID accessible at /verify/[verificationId] displaying authentic or revoked status.",
      },
    ],
  },
  {
    slug: "marksheet-generator",
    title: "Marksheet Generator & Examination Management",
    metaTitle: "Marksheet Generator & Exam Result Software",
    metaDescription:
      "Manage examinations, record student marks, calculate grades, and issue structured marksheets inside CertiDesk Pro.",
    keywords: [
      "marksheet generator software",
      "online marksheet generator",
      "exam result management software",
      "online marks entry software",
    ],
    eyebrow: "Examinations & Results",
    problem:
      "Calculating totals, percentages, and pass/fail grades across spreadsheets before every result day causes delays and arithmetic errors.",
    audience: [
      "Computer & technical institutes",
      "Coaching centres running periodic tests",
      "Vocational training centres",
    ],
    howItWorks: [
      "Create examinations and subject configurations for your courses.",
      "Enter student marks directly in the Institute Examination module.",
      "Publish structured marksheets visible to staff and students in the Student Portal.",
    ],
    capabilities: [
      {
        title: "Subject & Exam Configuration",
        description:
          "Configure subjects, maximum marks, and passing thresholds per examination.",
      },
      {
        title: "Structured Marks Entry",
        description: "Record marks per student with consistent validation.",
      },
      {
        title: "Automated Result & Grade View",
        description: "Compute totals and pass/fail status reliably from stored scores.",
      },
      {
        title: "Student Marksheet Portal",
        description:
          "Students can inspect published results and marksheets in their portal.",
      },
    ],
    benefits: [
      "Reduces manual calculation mistakes",
      "Connects exam performance directly to certificate eligibility",
      "Centralizes historical academic transcripts",
    ],
    limitations: [
      "Designed for institute academic and vocational exams rather than national OMR scanning hardware.",
    ],
    securityNote:
      "Only authorized institute admins and permitted staff can enter or update student examination marks.",
    relatedSlugs: ["certificate-generator", "student-management", "reports-analytics"],
    faqs: [
      {
        question: "Can students view their marksheets online?",
        answer:
          "Yes, published marksheets are accessible to the respective student inside the Student Portal.",
      },
    ],
  },
  {
    slug: "attendance-management",
    title: "Student Attendance Management Software",
    metaTitle: "Student Attendance Management Software for Institutes",
    metaDescription:
      "Track daily batch attendance, monitor student regularity, and share attendance visibility across staff and student portals.",
    keywords: [
      "attendance management software",
      "institute attendance tracking",
      "student attendance ledger",
    ],
    eyebrow: "Daily Operations",
    problem:
      "Paper attendance registers are hard to aggregate, easy to lose, and give institute owners zero real-time visibility into batch drop-offs.",
    audience: [
      "Coaching centres",
      "Computer lab & classroom training institutes",
      "Skill development centres",
    ],
    howItWorks: [
      "Select an active batch and date in the Institute Attendance module.",
      "Mark present, absent, or late statuses for enrolled learners.",
      "Attendance percentages sync immediately to student profiles and reports.",
    ],
    capabilities: [
      {
        title: "Batch-Wise Daily Marking",
        description:
          "Fast daily attendance marking organized by active institute batches.",
      },
      {
        title: "Student Attendance Visibility",
        description:
          "Students can review their attendance history directly inside /student/attendance.",
      },
      {
        title: "Operational Reporting",
        description:
          "Identify irregular batches or attendance trends from institute reports.",
      },
    ],
    benefits: [
      "Replaces fragile paper registers",
      "Improves student accountability with transparent attendance logs",
      "Saves faculty time during class start",
    ],
    limitations: [
      "Web-based manual batch marking; biometric hardware sync is not included natively.",
    ],
    securityNote:
      "Attendance records are tenant-isolated per institute and editable only by authorized institute personnel.",
    relatedSlugs: ["batch-management", "student-management", "reports-analytics"],
    faqs: [
      {
        question: "Can students see their own attendance record?",
        answer:
          "Yes, students can log in to the Student Portal to check their recorded attendance.",
      },
    ],
  },
  {
    slug: "fee-management",
    title: "Institute Fee Management & Dues Tracking",
    metaTitle: "Institute Fee Management Software | Dues & Receipts",
    metaDescription:
      "Track student course fees, installments, pending dues, and payment history cleanly inside CertiDesk Pro.",
    keywords: [
      "institute fee management software",
      "student fee tracking software",
      "coaching fee ledger",
    ],
    eyebrow: "Student Fee Ledger",
    problem:
      "Tracking partial fee installments in notebooks leads to missed follow-ups, disputed receipts, and inaccurate monthly cash-flow visibility.",
    audience: [
      "Coaching centres",
      "Computer & vocational institutes",
      "Short-term training academies",
    ],
    howItWorks: [
      "Assign fee structures or installments to enrolled students.",
      "Record collected payments and update outstanding dues in real time.",
      "Students can review their fee status and payment history in the Student Portal.",
    ],
    capabilities: [
      {
        title: "Installment & Dues Tracking",
        description:
          "Monitor total course fees, paid amounts, and remaining balances per student.",
      },
      {
        title: "Student Fee Transparency",
        description:
          "Students view fee schedules and recorded payments in /student/fees.",
      },
      {
        title: "Institute Financial Summary",
        description: "Give institute owners clarity on collected fees and pending dues.",
      },
    ],
    benefits: [
      "Prevents revenue leakage from forgotten installments",
      "Eliminates receipt disputes with a clear payment ledger",
      "Keeps student fee records separate from institute SaaS wallet billing",
    ],
    limitations: [
      "Student fee ledger tracks institute-to-student fees; platform Razorpay wallet is used for institute SaaS service charges.",
    ],
    securityNote:
      "All fee records are scoped to the owning institute and protected by server-side tenant validation.",
    relatedSlugs: ["student-management", "wallet", "reports-analytics"],
    faqs: [
      {
        question: "Is student fee tracking separate from the institute prepaid wallet?",
        answer:
          "Yes. Your student fee ledger tracks tuition collected from students, while the prepaid wallet covers CertiDesk Pro platform admission/service charges.",
      },
    ],
  },
  {
    slug: "batch-management",
    title: "Batch & Course Scheduling Software",
    metaTitle: "Batch Management Software for Coaching & Computer Institutes",
    metaDescription:
      "Organize courses, active batches, timings, and student batch mappings cleanly for coaching and computer institutes.",
    keywords: [
      "batch management software",
      "coaching batch scheduling",
      "course management software",
    ],
    eyebrow: "Academic Scheduling",
    problem:
      "Managing morning, afternoon, and evening batches across multiple courses quickly gets chaotic without structured batch-to-student mapping.",
    audience: [
      "Computer institutes running lab shifts",
      "Coaching centres with parallel batches",
      "Training academies",
    ],
    howItWorks: [
      "Create courses with clear names and durations.",
      "Open batches linked to each course with schedule details.",
      "Map students to batches during admission so attendance and exams stay organized.",
    ],
    capabilities: [
      {
        title: "Course Catalog Management",
        description: "Maintain active courses cleanly across academic cycles.",
      },
      {
        title: "Multi-Batch Organization",
        description: "Group learners by shift, start date, or instructor.",
      },
      {
        title: "Connected Attendance & Exams",
        description: "Attendance and batch operations pull directly from batch rosters.",
      },
    ],
    benefits: [
      "Prevents overcrowded lab or classroom shifts",
      "Speeds up attendance and exam administration",
      "Keeps course rosters accurate",
    ],
    limitations: [
      "Built for structured institute batches rather than automated university room-clash solvers.",
    ],
    securityNote:
      "Batch definitions and student enrollments are isolated strictly per institute tenant.",
    relatedSlugs: ["attendance-management", "student-management", "staff-management"],
    faqs: [
      {
        question: "Can one institute manage multiple courses and batches?",
        answer:
          "Yes, Institute Admins can create multiple courses and organize multiple active batches under each course.",
      },
    ],
  },
  {
    slug: "staff-management",
    title: "Institute Staff & Role Management Software",
    metaTitle: "Staff Management Software for Training Institutes",
    metaDescription:
      "Provision institute staff accounts, manage permissions, and keep faculty operations accountable inside CertiDesk Pro.",
    keywords: [
      "staff management software",
      "institute staff access control",
      "faculty role management",
    ],
    eyebrow: "Team Governance",
    problem:
      "Sharing a single admin login with front-desk counselors and teachers creates security risks and zero accountability.",
    audience: [
      "Growing coaching centres",
      "Multi-trainer computer academies",
      "Vocational training centres",
    ],
    howItWorks: [
      "Institute Admin creates individual staff accounts from the Staff module.",
      "Staff sign in with their own credentials and receive tenant-scoped access.",
      "Institute owners can update or revoke staff access anytime.",
    ],
    capabilities: [
      {
        title: "Individual Staff Accounts",
        description: "Eliminate shared passwords across front-desk and faculty members.",
      },
      {
        title: "Server-Enforced Permissions",
        description: "Authorization checks run on the backend for every protected route.",
      },
      {
        title: "Instant Access Revocation",
        description:
          "Deactivate departing staff without disrupting student or batch data.",
      },
    ],
    benefits: [
      "Protects sensitive institute wallet and financial settings",
      "Improves operational accountability",
      "Simplifies team onboarding",
    ],
    limitations: ["Automated statutory HR payroll/PF filing is not included."],
    securityNote:
      "Staff sessions are backed by Firebase Auth and HTTP-only session cookies with strict role verification.",
    relatedSlugs: ["institute-management", "attendance-management", "reports-analytics"],
    faqs: [
      {
        question: "Do staff members share the Institute Admin's password?",
        answer:
          "No. Institute Admins provision dedicated staff logins so permissions and access can be managed independently.",
      },
    ],
  },
  {
    slug: "wallet",
    title: "Prepaid Institute Wallet & Razorpay Recharge System",
    metaTitle: "Prepaid Institute Wallet & Pay-As-You-Grow Billing",
    metaDescription:
      "Start with ₹0 upfront, recharge via Razorpay (₹500, ₹1,000, or ₹2,000 with ₹200 bonus), and enjoy atomic, auditable wallet billing.",
    keywords: [
      "prepaid institute software",
      "pay per student admission software",
      "razorpay institute wallet",
    ],
    eyebrow: "Transparent Prepaid Billing",
    problem:
      "Small and growing institutes are often forced into expensive ₹25,000–₹50,000 annual software contracts before they even know their enrollment volume.",
    audience: [
      "New and growing computer institutes",
      "Seasonal coaching centres",
      "Cost-conscious training providers",
    ],
    howItWorks: [
      "Register your institute with ₹0 upfront commitment and skip recharge if you want to explore first.",
      "Recharge anytime via Razorpay using ₹500, ₹1,000, or ₹2,000 options (₹2,000 includes a ₹200 promotional bonus).",
      "Student admissions atomically verify and debit only available wallet credits with full ledger transparency.",
    ],
    capabilities: [
      {
        title: "Zero Negative Balance Enforcement",
        description:
          "Admissions require sufficient available credits and never leave unverified negative balances.",
      },
      {
        title: "Idempotent Razorpay Verification",
        description:
          "Signature verification and webhook reconciliation prevent duplicate credits or lost payments.",
      },
      {
        title: "Paid vs Promotional Bonus Ledger",
        description:
          "Every transaction is recorded atomically with clear audit history in /institute/wallet/transactions.",
      },
    ],
    benefits: [
      "No heavy upfront annual lock-in",
      "Clear per-transaction ledger visibility",
      "₹200 promotional bonus on ₹2,000 recharge",
    ],
    limitations: [
      "Admissions cannot complete when available wallet credits are below the configured admission charge.",
    ],
    securityNote:
      "All Razorpay signatures and wallet debits are verified server-side inside Firestore transactions.",
    relatedSlugs: ["student-management", "institute-management", "fee-management"],
    faqs: [
      {
        question: "Can I register without recharging immediately?",
        answer:
          "Yes. You can skip wallet recharge during onboarding and recharge whenever you are ready to admit students.",
      },
      {
        question: "Is the ₹200 bonus automatically credited on ₹2,000 recharge?",
        answer:
          "Yes. Verified ₹2,000 recharges automatically credit ₹2,000 paid balance plus ₹200 promotional bonus credits.",
      },
    ],
  },
  {
    slug: "reports-analytics",
    title: "Institute Reports & Operational Analytics",
    metaTitle: "Institute Reports Software | Admissions, Fees & Attendance",
    metaDescription:
      "Monitor student admissions, fee collections, attendance trends, and academic activity from real institute records without guesswork.",
    keywords: [
      "institute reports software",
      "coaching analytics dashboard",
      "student admission reports",
    ],
    eyebrow: "Operational Visibility",
    problem:
      "Institute owners spend hours reconciling attendance sheets, admission counts, and fee registers manually at the end of every month.",
    audience: [
      "Institute directors and owners",
      "Academic coordinators",
      "Multi-program training centres",
    ],
    howItWorks: [
      "Daily admissions, fees, attendance, and certificate actions write directly to your institute ledger.",
      "Open the Institute Reports view to inspect live operational totals.",
      "Use accurate numbers to plan new batches and follow up on pending dues.",
    ],
    capabilities: [
      {
        title: "Real-Time Operational Totals",
        description:
          "Aggregates live student, batch, fee, and certificate counts from Firestore.",
      },
      {
        title: "Wallet & Transaction Auditability",
        description:
          "Review every platform credit and debit alongside academic activity.",
      },
      {
        title: "Zero Fabricated Metrics",
        description:
          "Displays exact recorded data or honest empty states when records do not exist.",
      },
    ],
    benefits: [
      "Saves hours of manual end-of-month spreadsheet work",
      "Improves decision-making for upcoming batches",
      "Provides transparent audit trails",
    ],
    limitations: [
      "External third-party marketing ad spend metrics are not imported automatically.",
    ],
    securityNote:
      "Reports are strictly scoped to the authenticated institute's own records.",
    relatedSlugs: ["institute-management", "fee-management", "attendance-management"],
    faqs: [
      {
        question: "Are institute reports updated in real time?",
        answer:
          "Yes, reports read directly from your live institute records for students, fees, attendance, and wallet transactions.",
      },
    ],
  },
];

export const SOLUTION_PAGES: SolutionPageSpec[] = [
  {
    slug: "computer-institutes",
    title: "Software for Computer Training Institutes",
    metaTitle: "Computer Institute Management Software in India",
    metaDescription:
      "Manage modular computer courses, lab batches, student admissions, marksheets, and verifiable completion certificates on CertiDesk Pro.",
    keywords: [
      "computer institute management software",
      "computer training centre ERP",
      "computer institute certificate software",
    ],
    eyebrow: "Solution: Computer Institutes",
    overview:
      "Computer institutes juggle short-term courses (Tally, Python, CCC, Graphic Design, MS Office), overlapping lab batches, installment fees, practical exams, and completion certificates. CertiDesk Pro unifies every workflow in one workspace.",
    challenges: [
      "Managing multiple overlapping lab shifts and short-term batches",
      "Tracking partial fee installments across 3-to-12 month courses",
      "Generating accurate marksheets and verifiable certificates without manual formatting",
    ],
    workflows: [
      {
        title: "1. Modular Course & Batch Setup",
        detail:
          "Define computer courses and morning/afternoon/evening batches in minutes.",
      },
      {
        title: "2. Admission & Student Portal",
        detail:
          "Admit learners via prepaid wallet credits and issue instant Student Portal access.",
      },
      {
        title: "3. Exams, Marksheets & Verified Certificates",
        detail:
          "Record theory/practical marks and issue certificates backed by public /verify links.",
      },
    ],
    recommendedModules: [
      "student-management",
      "batch-management",
      "marksheet-generator",
      "certificate-generator",
      "wallet",
    ],
    faqs: [
      {
        question: "Why does a prepaid wallet work well for computer institutes?",
        answer:
          "Instead of paying large annual per-seat contracts upfront, computer institutes can start at ₹0 and recharge as new batches enroll.",
      },
    ],
  },
  {
    slug: "coaching-centres",
    title: "Software for Coaching Centres & Tuition Academies",
    metaTitle: "Coaching Institute Management Software India",
    metaDescription:
      "Organize coaching batches, daily student attendance, fee installments, test marks, and staff access with CertiDesk Pro.",
    keywords: [
      "coaching institute software",
      "coaching centre management software",
      "tuition management software India",
    ],
    eyebrow: "Solution: Coaching Centres",
    overview:
      "Coaching centres need fast batch attendance, transparent fee installment tracking, periodic test result publishing, and separate staff access without paying for bloated hardware bundles.",
    challenges: [
      "Keeping daily attendance accurate across multiple faculty and batches",
      "Following up on pending fee installments without manual register hunting",
      "Publishing test marksheets cleanly for students",
    ],
    workflows: [
      {
        title: "1. Batch & Faculty Organization",
        detail: "Map students to batches and give faculty individual staff accounts.",
      },
      {
        title: "2. Daily Attendance & Fee Tracking",
        detail: "Log attendance per session and keep fee ledgers synchronized.",
      },
      {
        title: "3. Examination & Progress Visibility",
        detail: "Publish test marksheets directly to the Student Portal.",
      },
    ],
    recommendedModules: [
      "attendance-management",
      "fee-management",
      "batch-management",
      "marksheet-generator",
      "staff-management",
    ],
    faqs: [
      {
        question:
          "Can faculty mark attendance without accessing institute wallet settings?",
        answer:
          "Yes. Staff accounts have scoped operational access while Institute Admins retain administrative controls.",
      },
    ],
  },
  {
    slug: "training-institutes",
    title: "Software for Skill & Vocational Training Institutes",
    metaTitle: "Training Institute Management & Certification Software",
    metaDescription:
      "Streamline trainee admissions, attendance, assessments, marksheets, and verifiable certificates for vocational and skill institutes.",
    keywords: [
      "training institute management software",
      "vocational institute ERP",
      "skill development institute software",
    ],
    eyebrow: "Solution: Training Institutes",
    overview:
      "Vocational and skill development providers need audit-ready trainee records, structured assessments, and verifiable completion certificates that employers can validate online.",
    challenges: [
      "Maintaining clean trainee admission and attendance archives",
      "Connecting assessment marks to official marksheets and certificates",
      "Providing employers with an instant way to verify issued certificates",
    ],
    workflows: [
      {
        title: "1. Trainee Registration & Cohort Mapping",
        detail:
          "Assign unique Student IDs and map trainees to trade courses and batches.",
      },
      {
        title: "2. Assessment & Marksheet Generation",
        detail: "Record subject marks and publish standardized marksheets.",
      },
      {
        title: "3. Public Certificate Verification",
        detail: "Issue numbered certificates verifiable at /verify/[verificationId].",
      },
    ],
    recommendedModules: [
      "student-management",
      "certificate-generator",
      "marksheet-generator",
      "attendance-management",
      "reports-analytics",
    ],
    faqs: [
      {
        question: "How can employers verify a trainee's certificate?",
        answer:
          "Every issued certificate has a unique verification ID that resolves on CertiDesk Pro's public verification page.",
      },
    ],
  },
];

export const BLOG_ARTICLES: BlogArticleSpec[] = BLOG_POSTS_DATA;

export function getFeatureBySlug(slug: string): FeaturePageSpec | undefined {
  return FEATURE_PAGES.find((f) => f.slug === slug);
}

export function getSolutionBySlug(slug: string): SolutionPageSpec | undefined {
  return SOLUTION_PAGES.find((s) => s.slug === slug);
}

export function getBlogArticleBySlug(slug: string): BlogArticleSpec | undefined {
  return BLOG_ARTICLES.find((a) => a.slug === slug);
}
