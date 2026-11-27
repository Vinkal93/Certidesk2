export interface BenefitPillar {
  title: string;
  description: string;
  metricLabel: string;
}

export interface CoreFeatureItem {
  id: string;
  title: string;
  description: string;
  highlights: string[];
  iconName:
    | "users"
    | "bookOpen"
    | "calendarCheck"
    | "wallet"
    | "fileSpreadsheet"
    | "award"
    | "barChart3"
    | "building2";
}

export interface WorkflowStep {
  step: string;
  title: string;
  description: string;
}

export interface ModuleSpotlight {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  previewTitle: string;
  previewBadge: string;
  previewRows: {
    label: string;
    meta: string;
    status: string;
    tone: "success" | "warning" | "primary" | "default";
  }[];
}

export interface SolutionItem {
  title: string;
  subtitle: string;
  description: string;
  capabilities: string[];
}

export interface PricingTier {
  name: string;
  badge?: string;
  description: string;
  monthlyPrice: string;
  annualPrice: string;
  priceSuffix: string;
  ctaLabel: string;
  ctaHref: string;
  highlighted?: boolean;
  features: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const heroContent = {
  eyebrow: "Institute Operations Platform",
  title: "Run your entire educational institute from one structured workspace.",
  description:
    "CertiDesk unifies student admissions, batch scheduling, attendance tracking, fee & dues ledgers, subject-wise marksheets, and verifiable certificates—built for single campuses and multi-branch networks.",
  primaryCta: { label: "Get Started", href: "/get-started" },
  secondaryCta: { label: "Explore Interface", href: "/#preview" },
  highlights: [
    "Admissions to Certificates",
    "Multi-Branch Ready",
    "Role-Structured Workflows",
  ],
};

export const credibilityPillars: BenefitPillar[] = [
  {
    metricLabel: "Single Source of Truth",
    title: "Connected Academic & Fee Records",
    description:
      "Every admission automatically links to batch rosters, attendance registers, fee installments, and examination transcripts.",
  },
  {
    metricLabel: "Zero Spreadsheet Drift",
    title: "Standardized Marks & Certificates",
    description:
      "Eliminate manual formatting errors with structured subject-wise marks entry and consistent certificate templates.",
  },
  {
    metricLabel: "Multi-Campus Architecture",
    title: "Centralized Institute Oversight",
    description:
      "Designed to scale from a single training center to multiple branches with isolated campus operations and unified reporting.",
  },
  {
    metricLabel: "Fast Daily Operations",
    title: "Built for Front-Desk & Faculty Speed",
    description:
      "Clean, keyboard-accessible interfaces load quickly on ordinary connections so staff spend less time clicking and more time teaching.",
  },
];

export const coreFeatures: CoreFeatureItem[] = [
  {
    id: "admissions",
    title: "Student Admissions & Profiles",
    description:
      "Capture enrollment details, guardian contacts, academic history, and document checklists in one searchable student profile.",
    highlights: ["Structured intake forms", "Enrollment ID generation"],
    iconName: "users",
  },
  {
    id: "courses",
    title: "Courses, Batches & Faculty",
    description:
      "Organize programs into active batches, assign teachers and staff, and track seat capacity across terms.",
    highlights: ["Batch timetables", "Instructor assignment"],
    iconName: "bookOpen",
  },
  {
    id: "attendance",
    title: "Daily Attendance Ledger",
    description:
      "Mark batch-wise attendance in seconds, monitor threshold compliance, and review student participation trends.",
    highlights: ["Present/absent/late states", "Batch attendance summaries"],
    iconName: "calendarCheck",
  },
  {
    id: "fees",
    title: "Fee Collection & Pending Dues",
    description:
      "Configure course fee plans, record installment payments, issue receipts, and surface overdue balances clearly.",
    highlights: ["Installment schedules", "Due date visibility"],
    iconName: "wallet",
  },
  {
    id: "exams",
    title: "Exams & Subject-Wise Marksheets",
    description:
      "Schedule assessments, enter subject-wise theory and practical marks, and generate structured student marksheets.",
    highlights: ["Subject-level grading", "Automated totals & status"],
    iconName: "fileSpreadsheet",
  },
  {
    id: "certificates",
    title: "Certificate Issuance & Registry",
    description:
      "Generate course completion and merit certificates tied directly to verified student records and unique serial IDs.",
    highlights: ["Unique credential IDs", "Issuance audit trail"],
    iconName: "award",
  },
  {
    id: "reports",
    title: "Institutional Reports & Analytics",
    description:
      "Review admissions volume, fee collection vs. pending dues, batch attendance averages, and exam pass rates.",
    highlights: ["Departmental breakdowns", "Export-ready summaries"],
    iconName: "barChart3",
  },
  {
    id: "multi-institute",
    title: "Multi-Institute Administration",
    description:
      "Manage multiple branches or partner centers from a unified governance layer while keeping daily campus data organized.",
    highlights: ["Branch-level isolation", "Cross-campus visibility"],
    iconName: "building2",
  },
];

export const workflowSteps: WorkflowStep[] = [
  {
    step: "01",
    title: "Admit & Assign Batches",
    description:
      "Register new students, capture course preferences, and allocate them into active batches with assigned faculty.",
  },
  {
    step: "02",
    title: "Track Attendance & Fees",
    description:
      "Record daily classroom presence and manage tuition installments, payment receipts, and pending dues in parallel.",
  },
  {
    step: "03",
    title: "Conduct Exams & Grade",
    description:
      "Schedule term assessments, enter subject-wise marks, and review pass/fail status across every cohort.",
  },
  {
    step: "04",
    title: "Publish Marksheets & Certificates",
    description:
      "Issue consistent academic marksheets and serialized completion certificates backed by verified institute records.",
  },
];

export const moduleSpotlights: ModuleSpotlight[] = [
  {
    id: "student-management",
    eyebrow: "Student Lifecycle",
    title: "Complete student profiles from inquiry to graduation",
    description:
      "Keep every learner's admission record, batch transfers, guardian details, and academic milestones organized in one authoritative directory.",
    bullets: [
      "Unique student enrollment numbers and structured academic profiles",
      "Batch and course allocation with capacity tracking",
      "Faculty and staff directory linked to assigned cohorts",
    ],
    previewTitle: "Active Batch Roster — Full Stack Web Cohort",
    previewBadge: "32 Enrolled",
    previewRows: [
      {
        label: "Aarav Kulkarni",
        meta: "ID: CD-2026-014 • Morning Batch",
        status: "Active",
        tone: "success",
      },
      {
        label: "Sneha Nair",
        meta: "ID: CD-2026-019 • Morning Batch",
        status: "Active",
        tone: "success",
      },
      {
        label: "Rohan Deshmukh",
        meta: "ID: CD-2026-024 • Evening Batch",
        status: "Transfer Pending",
        tone: "warning",
      },
    ],
  },
  {
    id: "fee-management",
    eyebrow: "Financial Clarity",
    title: "Transparent fee collection and pending dues tracking",
    description:
      "Eliminate guesswork around tuition installments. Track collected amounts, upcoming due dates, and outstanding balances per student and batch.",
    bullets: [
      "Flexible installment plans tailored to course duration",
      "Clear separation of paid, partially paid, and overdue accounts",
      "Standardized fee receipts and collection summaries",
    ],
    previewTitle: "Installment & Dues Ledger",
    previewBadge: "Term 2",
    previewRows: [
      {
        label: "Installment #1 — Tuition",
        meta: "Receipt #REC-1042 • Paid on time",
        status: "Paid",
        tone: "success",
      },
      {
        label: "Installment #2 — Lab & Exam",
        meta: "Due in 5 days • Reminder queued",
        status: "Upcoming",
        tone: "primary",
      },
      {
        label: "Installment #3 — Final Term",
        meta: "Balance pending • 2 students",
        status: "Overdue",
        tone: "warning",
      },
    ],
  },
  {
    id: "attendance-management",
    eyebrow: "Daily Discipline",
    title: "Fast batch-wise attendance without paper registers",
    description:
      "Faculty can mark daily attendance in a few clicks while administrators monitor cohort attendance percentages and flag low-attendance risks early.",
    bullets: [
      "Batch-by-batch daily register with present, absent, and late states",
      "Automated attendance percentage calculation per subject or course",
      "Historical attendance logs ready for parent or audit review",
    ],
    previewTitle: "Daily Register — Data Analytics Batch B",
    previewBadge: "94% Avg",
    previewRows: [
      {
        label: "Session 18: SQL Joins & Indexing",
        meta: "28 Present • 2 Absent",
        status: "Recorded",
        tone: "success",
      },
      {
        label: "Session 19: Data Modeling Lab",
        meta: "29 Present • 1 Late",
        status: "Recorded",
        tone: "success",
      },
      {
        label: "Session 20: Cohort Review",
        meta: "Scheduled 10:00 AM",
        status: "Pending",
        tone: "default",
      },
    ],
  },
  {
    id: "examination-management",
    eyebrow: "Academic Evaluation",
    title: "Subject-wise marks entry and clean marksheets",
    description:
      "Structure theory, practical, and internal assessments per course. Enter marks once and generate uniform marksheets with accurate totals and grades.",
    bullets: [
      "Configurable subject-wise maximum and passing marks",
      "Automatic percentage, grade, and pass/fail computation",
      "Printable and archivable marksheet layouts",
    ],
    previewTitle: "Term Examination — Subject Breakdown",
    previewBadge: "Evaluated",
    previewRows: [
      {
        label: "Computer Fundamentals",
        meta: "Theory: 78/80 • Practical: 19/20",
        status: "97% (A+)",
        tone: "success",
      },
      {
        label: "Database Systems",
        meta: "Theory: 69/80 • Practical: 18/20",
        status: "87% (A)",
        tone: "success",
      },
      {
        label: "Networking Basics",
        meta: "Theory: 62/80 • Practical: 16/20",
        status: "78% (B+)",
        tone: "primary",
      },
    ],
  },
  {
    id: "certificate-management",
    eyebrow: "Credentialing",
    title: "Structured certificate issuance with verifiable records",
    description:
      "Issue course completion and achievement certificates directly from approved student and examination records—each with a unique credential identifier.",
    bullets: [
      "Eligibility checks tied to course completion and fee clearance",
      "Unique certificate serial numbers and issuance timestamps",
      "Centralized registry to prevent duplicate or unauthorized issuance",
    ],
    previewTitle: "Certificate Issuance Registry",
    previewBadge: "Verified",
    previewRows: [
      {
        label: "CERT-2026-0891 • Diploma in Python",
        meta: "Issued to Ananya Iyer • Mar 2026",
        status: "Issued",
        tone: "success",
      },
      {
        label: "CERT-2026-0892 • UI/UX Foundations",
        meta: "Issued to Kabir Verma • Mar 2026",
        status: "Issued",
        tone: "success",
      },
      {
        label: "CERT-2026-0893 • Tally & GST",
        meta: "Awaiting final exam approval",
        status: "Draft",
        tone: "warning",
      },
    ],
  },
  {
    id: "reports-analytics",
    eyebrow: "Operational Insights",
    title: "Clear reports across admissions, dues, and academics",
    description:
      "Make informed decisions with consolidated reports on enrollment growth, fee collection efficiency, attendance health, and examination outcomes.",
    bullets: [
      "Batch-wise and course-wise enrollment comparisons",
      "Fee collection vs. pending dues aging summaries",
      "Exam pass-rate and certificate issuance metrics",
    ],
    previewTitle: "Monthly Institute Snapshot",
    previewBadge: "Live Schema",
    previewRows: [
      {
        label: "Admissions & Active Batches",
        meta: "14 active batches across 4 programs",
        status: "On Track",
        tone: "primary",
      },
      {
        label: "Fee Collection Rate",
        meta: "91.4% collected for current cycle",
        status: "Healthy",
        tone: "success",
      },
      {
        label: "Pending Dues Follow-up",
        meta: "8 installment reminders scheduled",
        status: "Actionable",
        tone: "warning",
      },
    ],
  },
];

export const solutionsList: SolutionItem[] = [
  {
    title: "Coaching & Test Prep Centers",
    subtitle: "High-volume batches & regular testing",
    description:
      "Manage multiple daily batches, track test-series marks, monitor student attendance, and stay on top of installment schedules.",
    capabilities: [
      "Batch-wise schedules & attendance",
      "Periodic test marks & rank summaries",
      "Installment reminders & dues tracking",
    ],
  },
  {
    title: "Computer & Technical Academies",
    subtitle: "Lab cohorts & certification programs",
    description:
      "Coordinate theory and practical lab evaluations, issue subject-wise marksheets, and generate serialized completion certificates.",
    capabilities: [
      "Theory + practical marksheets",
      "Course completion certificates",
      "Lab batch capacity management",
    ],
  },
  {
    title: "Vocational & Skill Institutes",
    subtitle: "Structured cohorts & compliance records",
    description:
      "Maintain audit-ready attendance logs, competency assessments, and verifiable credential registries for every trainee.",
    capabilities: [
      "Audit-ready attendance registers",
      "Competency & assessment grading",
      "Verified certificate registries",
    ],
  },
  {
    title: "Multi-Branch Institute Networks",
    subtitle: "Centralized governance across campuses",
    description:
      "Standardize courses, fee structures, and certificate templates across branches while giving each campus its own daily workspace.",
    capabilities: [
      "Branch-level operational isolation",
      "Standardized course & fee templates",
      "Cross-branch reporting & oversight",
    ],
  },
];

export const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    description:
      "For single-campus academies replacing spreadsheets with structured records.",
    monthlyPrice: "$29",
    annualPrice: "$24",
    priceSuffix: "/month",
    ctaLabel: "Start with Starter",
    ctaHref: "/get-started",
    features: [
      "Up to 250 active student profiles",
      "Courses, batches & staff directory",
      "Daily batch attendance tracking",
      "Fee plans, receipts & pending dues",
      "Standard marksheet & certificate templates",
    ],
  },
  {
    name: "Growth",
    badge: "Most Popular",
    description:
      "For growing training institutes needing full academic and financial workflows.",
    monthlyPrice: "$69",
    annualPrice: "$58",
    priceSuffix: "/month",
    ctaLabel: "Choose Growth",
    ctaHref: "/get-started",
    highlighted: true,
    features: [
      "Up to 1,500 active student profiles",
      "Everything in Starter",
      "Subject-wise exam & practical grading",
      "Serialized certificate registry",
      "Batch, fee & attendance analytics",
      "Role-based staff permissions",
    ],
  },
  {
    name: "Multi-Branch",
    description:
      "For multi-campus networks requiring centralized administration and oversight.",
    monthlyPrice: "$149",
    annualPrice: "$124",
    priceSuffix: "/month",
    ctaLabel: "Contact for Multi-Branch",
    ctaHref: "/contact",
    features: [
      "Unlimited student profiles across branches",
      "Everything in Growth",
      "Multi-institute & branch hierarchy",
      "Centralized course & fee standardization",
      "Cross-campus consolidated reporting",
      "Dedicated onboarding assistance",
    ],
  },
];

export const faqItems: FaqItem[] = [
  {
    question: "What types of institutes is CertiDesk built for?",
    answer:
      "CertiDesk is designed for coaching centers, computer training academies, vocational and skill development institutes, and multi-branch educational networks that need structured student, fee, attendance, exam, and certificate workflows.",
  },
  {
    question: "Can we manage multiple branches from one platform?",
    answer:
      "Yes. The platform architecture is designed for multi-institute and multi-branch administration, allowing each campus to manage its daily batches and collections while leadership views consolidated reports.",
  },
  {
    question: "How does fee installment and pending dues tracking work?",
    answer:
      "Each course or batch can be mapped to structured fee plans with installment due dates. Staff record payments against installments, and pending or overdue balances are surfaced automatically.",
  },
  {
    question: "Does CertiDesk support both theory and practical marks?",
    answer:
      "Yes. Examination workflows support subject-wise components—such as theory, practical, and internal assessments—and compute totals, percentages, and pass/fail status for clean marksheets.",
  },
  {
    question: "How are certificates linked to student records?",
    answer:
      "Certificates are generated from verified student and examination records with unique serial numbers and issuance timestamps, reducing manual errors and duplicate issuance.",
  },
  {
    question: "How does CertiDesk Pro pricing and the prepaid wallet work?",
    answer:
      "You can self-register your institute with ₹0 upfront and even skip wallet recharge during onboarding. When ready to admit students, recharge via Razorpay (₹500, ₹1,000, or ₹2,000 with a ₹200 promotional bonus on ₹2,000) and pay only for actual student admissions with an auditable ledger.",
  },
];
