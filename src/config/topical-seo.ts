export interface TopicalSeoPageConfig {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  problemSummary: string;
  capabilities: Array<{ title: string; detail: string }>;
  workflows: string[];
  faqs: Array<{ question: string; answer: string }>;
  relatedLinks: Array<{ label: string; href: string }>;
}

export const TOPICAL_SEO_PAGES: TopicalSeoPageConfig[] = [
  {
    slug: "institute-management-software",
    title: "Institute Management Software Built for Modern Training Centers",
    metaTitle: "Institute Management Software | CertiDesk Pro",
    metaDescription:
      "Run admissions, batches, student fee ledgers, attendance, online exams, marksheets, and verified certificates from one multi-tenant institute management platform.",
    eyebrow: "Institute Operations",
    problemSummary:
      "Training institutes often juggle disconnected spreadsheets for admissions, manual registers for attendance, separate accounting tools for fees, and error-prone desktop templates for certificates.",
    capabilities: [
      {
        title: "Unified Admissions & Prepaid Wallet",
        detail:
          "Admit students in seconds with automated Student ID generation, Firebase credentials, and transparent pay-per-admission wallet billing.",
      },
      {
        title: "Batch, Course & Staff RBAC",
        detail:
          "Configure courses, subjects, seat-capped batches, and staff permissions from one tenant-isolated workspace.",
      },
      {
        title: "Double-Entry Fee & Expense Accounting",
        detail:
          "Track student fee plans, receipts, refunds, income, expenses, and Profit & Loss separately from platform wallet balances.",
      },
    ],
    workflows: [
      "Register institute and configure courses, subjects, and batches",
      "Admit students with instant portal login credentials",
      "Collect student fees, track attendance, and conduct online or offline exams",
      "Generate verified marksheets and QR-enabled certificates",
    ],
    faqs: [
      {
        question: "How is CertiDesk Pro priced for institutes?",
        answer:
          "CertiDesk Pro uses a transparent prepaid wallet model with configurable per-admission and platform plans, avoiding heavy upfront annual ERP lock-in.",
      },
      {
        question: "Can multiple staff members manage one institute?",
        answer:
          "Yes. Institute Admins can create staff accounts with granular permissions across students, fees, attendance, exams, and certificates.",
      },
    ],
    relatedLinks: [
      { label: "Student Management System", href: "/student-management-system" },
      { label: "Institute Fee Management", href: "/institute-fee-management" },
      { label: "Download App", href: "/download" },
    ],
  },
  {
    slug: "student-management-system",
    title: "Student Management System for Admissions, Records & Self-Service",
    metaTitle: "Student Management System | CertiDesk Pro",
    metaDescription:
      "Centralize student profiles, unique Student IDs, batch enrollments, fee receipts, attendance, and downloadable certificates in one secure student management system.",
    eyebrow: "Student Lifecycle",
    problemSummary:
      "Scattered student files make it slow to verify enrollment status, track pending fees, or share official receipts and certificates with students.",
    capabilities: [
      {
        title: "Instant Student ID & Portal Access",
        detail:
          "Every admitted student receives a unique Student ID and dedicated Student Portal login for self-service access.",
      },
      {
        title: "Course & Batch Enrollment Tracking",
        detail:
          "Link every student to structured courses, seat-controlled batches, and attendance registers.",
      },
      {
        title: "Audited Profile Governance",
        detail:
          "Every profile edit, login reset, or status change is recorded with full audit history.",
      },
    ],
    workflows: [
      "Capture student and guardian details during admission",
      "Assign course, batch, and fee plan automatically",
      "Let students log in via Student ID or QR code to view receipts and results",
    ],
    faqs: [
      {
        question: "Can students log in directly without calling the office?",
        answer:
          "Yes. Students have a dedicated Student Portal to check attendance, download fee receipts, attempt online exams, and access marksheets and certificates.",
      },
    ],
    relatedLinks: [
      { label: "Student Record Management", href: "/student-record-management" },
      { label: "Batch Management Software", href: "/batch-management-software" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    slug: "certificate-management-software",
    title: "Certificate Management Software with Precision PDF & QR Verification",
    metaTitle: "Certificate Management Software | CertiDesk Pro",
    metaDescription:
      "Design templates in Certificate Studio, issue tamper-evident PDF certificates, and enable instant public QR verification with CertiDesk Pro.",
    eyebrow: "Digital Credentials",
    problemSummary:
      "Manually editing certificates in Word or Canva leads to misaligned text, inconsistent serial numbers, and no reliable way for employers to verify authenticity.",
    capabilities: [
      {
        title: "Visual Certificate Template Studio",
        detail:
          "Position dynamic student name, course, serial number, date, and QR verification blocks with exact millimeter/pixel coordinates.",
      },
      {
        title: "Vector PDF Rendering",
        detail:
          "Generate sharp, print-ready PDF certificates directly from verified student and exam records.",
      },
      {
        title: "Public Verification Endpoint",
        detail:
          "Every certificate carries a unique verification ID and QR code linking to an authentic public verification view.",
      },
    ],
    workflows: [
      "Select or customize a certificate template in the studio",
      "Issue certificates individually or after result declaration",
      "Students download PDFs directly and employers verify them online",
    ],
    faqs: [
      {
        question: "Can employers verify certificates online?",
        answer:
          "Yes. Every issued certificate includes a unique verification code and QR link to verify authenticity without exposing private student data.",
      },
    ],
    relatedLinks: [
      {
        label: "Online Certificate Verification",
        href: "/online-certificate-verification",
      },
      {
        label: "Digital Certificate Management",
        href: "/digital-certificate-management",
      },
      { label: "Marksheet Generation Software", href: "/marksheet-generation-software" },
    ],
  },
  {
    slug: "online-certificate-verification",
    title: "Online Certificate Verification for Employers & Academic Bodies",
    metaTitle: "Online Certificate Verification | CertiDesk Pro",
    metaDescription:
      "Eliminate fake credentials with instant QR-based online certificate verification backed by real institute issuance records.",
    eyebrow: "Trust & Verification",
    problemSummary:
      "Manual email or phone verification of student certificates wastes administrative hours and leaves employers uncertain about credential authenticity.",
    capabilities: [
      {
        title: "Instant QR & ID Lookup",
        detail:
          "Scanning the QR code or entering the verification ID confirms student name, course, institute, and issue status immediately.",
      },
      {
        title: "Privacy-Safe Public View",
        detail:
          "Displays only essential credential verification attributes while protecting private phone numbers, addresses, and financial records.",
      },
    ],
    workflows: [
      "Institute issues certificate with embedded verification ID",
      "Verifier scans QR code or opens the verification URL",
      "Real-time Firestore verification confirms credential status",
    ],
    faqs: [
      {
        question: "Does public verification expose sensitive student details?",
        answer:
          "No. Only the credential verification fields (student name, course, institute, status, and issue date) are displayed.",
      },
    ],
    relatedLinks: [
      {
        label: "Certificate Management Software",
        href: "/certificate-management-software",
      },
      { label: "Security & Privacy", href: "/security" },
    ],
  },
  {
    slug: "digital-certificate-management",
    title: "Digital Certificate Management for Multi-Batch Institutes",
    metaTitle: "Digital Certificate Management | CertiDesk Pro",
    metaDescription:
      "Store, issue, track, and verify digital student certificates across courses and batches with centralized audit trails.",
    eyebrow: "Credential Lifecycle",
    problemSummary:
      "Institutes often lose track of which students received certificates, what serial numbers were assigned, and whether records match final exam results.",
    capabilities: [
      {
        title: "Eligibility & Result Linking",
        detail:
          "Tie certificate issuance directly to declared examination results and course completion status.",
      },
      {
        title: "Student Self-Service Downloads",
        detail:
          "Students can access and re-download their verified digital certificates anytime from their portal.",
      },
    ],
    workflows: [
      "Declare exam results and verify passing criteria",
      "Issue digital certificate linked to student record",
      "Archive with immutable verification ID and audit log",
    ],
    faqs: [
      {
        question: "Can students download their digital certificates from mobile?",
        answer:
          "Yes. Students can sign in on mobile or desktop and download their official PDF certificates directly.",
      },
    ],
    relatedLinks: [
      {
        label: "Certificate Management Software",
        href: "/certificate-management-software",
      },
      {
        label: "Online Certificate Verification",
        href: "/online-certificate-verification",
      },
    ],
  },
  {
    slug: "institute-fee-management",
    title: "Institute Fee Management, Receipts & Profit-Loss Accounting",
    metaTitle: "Institute Fee Management Software | CertiDesk Pro",
    metaDescription:
      "Manage student fee structures, installment dues, instant receipts, refunds, income, expenses, and cash/bank ledgers in one institute fee management system.",
    eyebrow: "Finance & Accounting",
    problemSummary:
      "Tracking partial payments, pending student dues, and institute expenses in manual notebooks causes revenue leakage and reconciliation headaches.",
    capabilities: [
      {
        title: "Automated Fee Plans & Installments",
        detail:
          "Assign course fee structures, collect partial or full payments, and monitor pending student dues in real time.",
      },
      {
        title: "Instant Receipts & Refund Controls",
        detail:
          "Generate sequential fee receipts and process audited refunds without duplicate or silent ledger edits.",
      },
      {
        title: "Income, Expense & P&L Ledgers",
        detail:
          "Maintain Cash/Bank accounts, categorize income and expenses, and view real-time Profit & Loss statements.",
      },
    ],
    workflows: [
      "Create course fee structures and assign to students",
      "Record collections across Cash, UPI, Bank, or Card",
      "Issue receipts and automatically post ledger entries",
    ],
    faqs: [
      {
        question: "Are student fees kept separate from the platform wallet?",
        answer:
          "Yes. Student tuition collections and institute accounting ledgers are strictly separated from the prepaid platform wallet.",
      },
    ],
    relatedLinks: [
      { label: "Institute Management Software", href: "/institute-management-software" },
      { label: "Student Management System", href: "/student-management-system" },
    ],
  },
  {
    slug: "student-record-management",
    title: "Student Record Management with Tenant Isolation & Audit History",
    metaTitle: "Student Record Management Software | CertiDesk Pro",
    metaDescription:
      "Maintain accurate, searchable, tenant-isolated student academic, attendance, fee, and credential records with full audit history.",
    eyebrow: "Academic Records",
    problemSummary:
      "Paper folders and fragmented Excel sheets make it hard to trace student academic history, attendance, and fee status across years.",
    capabilities: [
      {
        title: "Unified Student 360° Record",
        detail:
          "View admission metadata, course/batch history, attendance logs, fee receipts, exam marks, and certificates together.",
      },
      {
        title: "Strict Multi-Tenant Isolation",
        detail:
          "Server-verified tenant boundaries ensure every institute accesses only its own student records.",
      },
    ],
    workflows: [
      "Admit student and generate immutable student code",
      "Log daily attendance, fee payments, and exam scores",
      "Preserve historical records with audit trail on every edit",
    ],
    faqs: [
      {
        question:
          "Are historical student records preserved if a student completes a course?",
        answer:
          "Yes. Completed student records, receipts, marksheets, and certificates remain archived and verifiable.",
      },
    ],
    relatedLinks: [
      { label: "Student Management System", href: "/student-management-system" },
      { label: "Security & Privacy", href: "/security" },
    ],
  },
  {
    slug: "marksheet-generation-software",
    title: "Marksheet Generation Software with Subject-Wise Theory & Practical Marks",
    metaTitle: "Marksheet Generation Software | CertiDesk Pro",
    metaDescription:
      "Configure custom subjects, theory/practical maximums, automated grade computation, and precision PDF marksheets with CertiDesk Pro.",
    eyebrow: "Examinations & Results",
    problemSummary:
      "Calculating subject-wise totals, pass/fail rules, and formatting marksheets manually for dozens of students is slow and error-prone.",
    capabilities: [
      {
        title: "Subject-Wise Marks & Grade Engine",
        detail:
          "Define theory and practical marks, passing thresholds, and automatic percentage/grade calculations.",
      },
      {
        title: "Marksheet Studio & PDF Export",
        detail:
          "Bind live exam scores directly to reusable marksheet templates for instant student-ready PDF downloads.",
      },
    ],
    workflows: [
      "Define course subjects with theory and practical limits",
      "Enter marks or conduct auto-graded online exams",
      "Declare results and generate official PDF marksheets",
    ],
    faqs: [
      {
        question: "Can marksheets be generated from online exam results automatically?",
        answer:
          "Yes. Both manual exam marks and auto-evaluated online exam scores feed into result declaration and marksheet generation.",
      },
    ],
    relatedLinks: [
      {
        label: "Certificate Management Software",
        href: "/certificate-management-software",
      },
      { label: "Institute Management Software", href: "/institute-management-software" },
    ],
  },
  {
    slug: "batch-management-software",
    title: "Batch Management Software with Capacity Controls & Attendance",
    metaTitle: "Batch Management Software | CertiDesk Pro",
    metaDescription:
      "Organize morning, afternoon, and evening batches with seat capacity enforcement, schedule tracking, and daily attendance registers.",
    eyebrow: "Batch Operations",
    problemSummary:
      "Overbooked classrooms and untracked batch transfers cause scheduling conflicts and inaccurate attendance records.",
    capabilities: [
      {
        title: "Seat Capacity Enforcement",
        detail:
          "Prevent over-enrollment automatically during student admission when a batch reaches its maximum seat limit.",
      },
      {
        title: "Daily Batch Attendance",
        detail:
          "Mark Present, Absent, or Leave per batch in seconds and sync summaries directly to the Student Portal.",
      },
    ],
    workflows: [
      "Create batches linked to specific courses and timings",
      "Enroll students up to configured seat capacity",
      "Mark daily attendance and schedule batch exams",
    ],
    faqs: [
      {
        question: "Can one course have multiple batches?",
        answer:
          "Yes. You can run unlimited batches per course with separate timings, instructors, and seat limits.",
      },
    ],
    relatedLinks: [
      { label: "Student Management System", href: "/student-management-system" },
      { label: "Institute Management Software", href: "/institute-management-software" },
    ],
  },
  {
    slug: "computer-institute-management-software",
    title: "Computer Institute Management Software for DCA, ADCA, Tally & Coding Centers",
    metaTitle: "Computer Institute Management Software | CertiDesk Pro",
    metaDescription:
      "Purpose-built computer institute management software for skill centers running DCA, ADCA, Tally, and programming courses with online tests and QR certificates.",
    eyebrow: "Computer Institutes",
    problemSummary:
      "Computer training centers need practical + theory marksheets, installment fee tracking, online MCQ tests, and verifiable certificates—all without expensive enterprise ERP overhead.",
    capabilities: [
      {
        title: "Theory + Practical Course Structure",
        detail:
          "Configure ADCA, DCA, Tally, and coding courses with separate theory and practical subject marks.",
      },
      {
        title: "Online MCQ Exams & Instant Grading",
        detail:
          "Run timed online exams from your question bank with server-side score calculation.",
      },
      {
        title: "QR-Verified Certificates & Marksheets",
        detail:
          "Issue branded PDF certificates and marksheets that employers can verify online.",
      },
    ],
    workflows: [
      "Set up computer courses, practical subjects, and lab batches",
      "Collect monthly or course-wise fees with printed receipts",
      "Conduct online exams and issue verified certificates",
    ],
    faqs: [
      {
        question:
          "Is CertiDesk Pro suitable for single and multi-branch computer institutes?",
        answer:
          "Yes. Each institute gets its own isolated workspace, custom certificate branding, and mobile/desktop PWA access.",
      },
    ],
    relatedLinks: [
      { label: "Marksheet Generation Software", href: "/marksheet-generation-software" },
      {
        label: "Certificate Management Software",
        href: "/certificate-management-software",
      },
      { label: "Download App", href: "/download" },
    ],
  },
  {
    slug: "school-management-software",
    title: "School & Coaching Management Software for Admissions, Fees & Exams",
    metaTitle: "School & Coaching Management Software | CertiDesk Pro",
    metaDescription:
      "Modern school and coaching center management software covering admissions, fee receipts, attendance, examinations, marksheets, and student portals.",
    eyebrow: "Schools & Coaching",
    problemSummary:
      "Schools and coaching academies need fast digital communication with students, transparent fee ledgers, and reliable exam result workflows.",
    capabilities: [
      {
        title: "Direct Student Popup Alerts & Reminders",
        detail:
          "Send fee reminders and exam notices that appear as first-time popups and stay saved in the student notification bell.",
      },
      {
        title: "Complete Fee & P&L Tracking",
        detail:
          "Manage fee collections, dues, receipts, staff accounts, and institutional income/expense ledgers.",
      },
    ],
    workflows: [
      "Onboard classes/courses and batches with fee plans",
      "Send fee reminders and exam schedules to students",
      "Publish results, marksheets, and completion certificates",
    ],
    faqs: [
      {
        question: "Can parents or students view fee receipts and attendance online?",
        answer:
          "Yes. Every admitted student receives Student Portal access to view attendance, receipts, marksheets, and notices.",
      },
    ],
    relatedLinks: [
      { label: "Institute Management Software", href: "/institute-management-software" },
      { label: "Institute Fee Management", href: "/institute-fee-management" },
    ],
  },
];

export function getTopicalSeoPage(slug: string): TopicalSeoPageConfig | undefined {
  return TOPICAL_SEO_PAGES.find((p) => p.slug === slug);
}
