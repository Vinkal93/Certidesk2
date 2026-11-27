export type LegalDocSlug =
  | "privacy"
  | "terms"
  | "refund-policy"
  | "cookie-policy"
  | "acceptable-use"
  | "dpa"
  | "sla";

export interface LegalSection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocument {
  slug: LegalDocSlug;
  href: string;
  title: string;
  shortTitle: string;
  eyebrow: string;
  description: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  jurisdiction: string;
  audience: string;
  pdfFilename: string;
  highlights: string[];
  sections: LegalSection[];
}

export const LEGAL_ENTITY = {
  brandName: "CertiDesk Pro",
  operatorName: "CertiDesk Pro Platform Operations",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@certidesk.app",
  grievanceSubject: "Legal / Grievance Officer — CertiDesk Pro",
  jurisdiction: "India (IT Act 2000 & DPDP Act 2023)",
  effectiveDate: "November 1, 2026",
  lastUpdated: "November 27, 2026",
};

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: "privacy",
    href: "/privacy",
    title: "Privacy Policy",
    shortTitle: "Privacy Policy",
    eyebrow: "Data Protection & Privacy",
    description:
      "How CertiDesk Pro collects, processes, isolates, and safeguards institutional, staff, student, and verification data in compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology Act, 2000.",
    version: "v2.4",
    effectiveDate: LEGAL_ENTITY.effectiveDate,
    lastUpdated: LEGAL_ENTITY.lastUpdated,
    jurisdiction: LEGAL_ENTITY.jurisdiction,
    audience: "Institutes, Staff, Students & Public Verifiers",
    pdfFilename: "CertiDesk-Pro-Privacy-Policy.pdf",
    highlights: [
      "Institutes retain 100% ownership of student, fee, attendance, exam, and certificate records.",
      "Zero third-party ad tracking or sale of student or institutional personal data.",
      "Strict tenant isolation via instituteId scoping, server-verified Firebase Admin sessions, and redacted audit logs.",
    ],
    sections: [
      {
        id: "scope-and-roles",
        heading: "1. Scope, Platform Role & Regulatory Alignment",
        paragraphs: [
          "This Privacy Policy governs the collection, use, storage, and disclosure of personal data across CertiDesk Pro, including our public website, Progressive Web App (PWA), Institute Administration Portal, Student Portal, Staff Workspace, Super Admin Operations Console, and Public Credential Verification endpoints.",
          "CertiDesk Pro is designed in alignment with the Digital Personal Data Protection Act, 2023 (DPDP Act), the Information Technology Act, 2000, and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.",
          "Under applicable data protection law, each registered educational or training institute acts as the Data Fiduciary (Data Controller) for its enrolled students, staff, fee ledgers, and academic records. CertiDesk Pro acts as a Data Processor on behalf of the Institute, except for direct platform account registration, billing, support, and security telemetry where CertiDesk Pro acts as a Data Fiduciary.",
        ],
      },
      {
        id: "data-we-collect",
        heading: "2. Categories of Information We Collect",
        paragraphs: [
          "We collect only the information strictly necessary to provision multi-tenant institute workspaces, process prepaid platform transactions, and deliver academic and credential workflows:",
        ],
        bullets: [
          "Institute & Owner Registration Data: Institute name, campus address, owner full name, email address, contact phone number, student ID prefix, academic year configuration, and authorized certificate signatory details.",
          "Staff & Role Credentials: Staff names, role assignments, login identifiers, authentication UIDs, and workspace permission scopes.",
          "Student Academic & Administrative Records (Entered by Institute): Student full name, guardian/parent contact details, enrollment/roll number, course and batch assignments, attendance logs, fee structures, payment receipts, online exam responses, marksheets, and issued certificates.",
          "Prepaid Wallet & Billing Metadata: Razorpay order IDs, payment IDs, transaction timestamps, invoice numbers, and wallet ledger entries. CertiDesk Pro never stores raw debit/credit card numbers, CVV, or UPI PINs.",
          "Security, Audit & Technical Telemetry: HTTP-only session verification metadata, login timestamps, IP/user-agent risk signals, and redacted audit trails (passwords, OTPs, session cookies, API keys, and tokens are automatically redacted before logging).",
        ],
      },
      {
        id: "how-we-use-data",
        heading: "3. Purpose & Lawful Basis of Processing",
        paragraphs: [
          "Personal data is processed exclusively for legitimate operational and contractual purposes:",
        ],
        bullets: [
          "Provisioning and isolating each institute's dedicated workspace, student portal, and staff access.",
          "Generating attendance registers, fee receipts, profit-and-loss ledgers, online examinations, marksheets, and QR-verifiable digital certificates.",
          "Executing atomic prepaid wallet recharges and platform fee deductions via Razorpay.",
          "Preventing fraud, unauthorized cross-tenant access, credential forgery, and account compromise.",
          "Responding to institute support inquiries, regulatory obligations, and grievance redressal requests.",
        ],
      },
      {
        id: "public-verification",
        heading: "4. Public Certificate & Marksheet Verification",
        paragraphs: [
          "When an institute issues a verifiable certificate or marksheet through CertiDesk Pro, a unique verification ID and QR code are generated. Any employer, university, or third party scanning that QR code or visiting the public verification route (/verify/[verificationId]) can view only the minimum verification fields required to confirm authenticity (recipient name, institute name, course/credential title, issue date, and verification status).",
          "Private student records, phone numbers, addresses, fee balances, and internal institute ledgers are never exposed on public verification pages.",
        ],
      },
      {
        id: "student-and-minor-data",
        heading: "5. Student & Minor Data Safeguards",
        paragraphs: [
          "Institutes using CertiDesk Pro may enroll learners who are minors under applicable law. Institutes are solely responsible for obtaining verifiable parental or guardian consent prior to uploading minor student records to the platform.",
          "CertiDesk Pro does not display behavioral advertising, build marketing profiles on students, or sell or rent student personal data to third parties.",
        ],
      },
      {
        id: "subprocessors-and-storage",
        heading: "6. Cloud Infrastructure & Authorized Sub-Processors",
        paragraphs: [
          "CertiDesk Pro relies on enterprise-grade infrastructure providers bound by strict confidentiality and security obligations:",
        ],
        bullets: [
          "Google Cloud Platform & Firebase (Authentication, Cloud Firestore, Cloud Storage): Encrypted authentication, real-time tenant-isolated database storage, and document asset hosting.",
          "Razorpay Software Pvt. Ltd.: PCI-DSS compliant payment gateway for institute prepaid wallet recharges and verified webhook reconciliation.",
        ],
      },
      {
        id: "data-retention-and-rights",
        heading: "7. Data Retention & Your Rights",
        paragraphs: [
          "Institutional academic and financial records are retained for as long as the institute maintains an active workspace or as required by statutory accounting and educational record-keeping obligations. Upon verified workspace termination, institutes may export their records in CSV/PDF format before scheduled deletion.",
          "Subject to applicable law, individuals may request access, correction, or erasure of their personal data. Students and staff should direct record correction or deletion requests to their respective Institute Administrator, who controls the tenant workspace. Institute Owners may contact CertiDesk Pro support for workspace-level exports or account closure.",
        ],
      },
      {
        id: "grievance-officer",
        heading: "8. Grievance Officer & Contact Information",
        paragraphs: [
          `In accordance with the Information Technology Act, 2000 and the DPDP Act, 2023, any privacy concern, data correction request, or security report may be submitted to our Grievance & Data Protection Desk at ${LEGAL_ENTITY.supportEmail} with the subject line "${LEGAL_ENTITY.grievanceSubject}". We acknowledge all formal privacy requests within 48 business hours and resolve them within statutory timelines.`,
        ],
      },
    ],
  },
  {
    slug: "terms",
    href: "/terms",
    title: "Terms of Service",
    shortTitle: "Terms of Service",
    eyebrow: "Master Platform Agreement",
    description:
      "Contractual terms governing access to CertiDesk Pro, multi-tenant institute workspaces, prepaid wallet billing, credential issuance responsibilities, and platform governance.",
    version: "v2.4",
    effectiveDate: LEGAL_ENTITY.effectiveDate,
    lastUpdated: LEGAL_ENTITY.lastUpdated,
    jurisdiction: LEGAL_ENTITY.jurisdiction,
    audience: "Institute Owners, Authorized Staff & Students",
    pdfFilename: "CertiDesk-Pro-Terms-of-Service.pdf",
    highlights: [
      "Clear governance across Institute Admin, Staff, Student, and Super Admin roles.",
      "Institutes are solely responsible for the academic validity of issued marksheets and certificates.",
      "Transparent prepaid wallet model with no hidden recurring lock-in.",
    ],
    sections: [
      {
        id: "acceptance-of-terms",
        heading: "1. Acceptance of Terms & Eligibility",
        paragraphs: [
          "These Terms of Service ('Terms') constitute a legally binding agreement between you (acting on behalf of your educational or training institute, or as an authorized staff member or student) and CertiDesk Pro ('Platform', 'we', 'us'). By registering an institute, signing into a portal, or accessing any CertiDesk Pro service, you agree to be bound by these Terms.",
          "If you register an institute workspace, you represent and warrant that you are at least 18 years of age and hold legal authority to bind the institution to these Terms.",
        ],
      },
      {
        id: "platform-scope",
        heading: "2. Platform Services & Multi-Tenant Architecture",
        paragraphs: [
          "CertiDesk Pro provides a cloud-based multi-tenant SaaS platform comprising student admissions, batch and course management, daily attendance tracking, fee structure and ledger management, income/expense accounting, online examinations and question banks, marksheet generation, QR-verifiable certificates, and dedicated Institute and Student portals.",
          "Each institute operates inside a logically isolated tenant workspace scoped by a unique Institute ID. Access is strictly governed by server-enforced role-based permissions.",
        ],
      },
      {
        id: "account-security",
        heading: "3. Account Credentials & Security Responsibilities",
        paragraphs: [
          "Institute Owners are responsible for maintaining the confidentiality of their login credentials, staff accounts, and student portal credentials generated within their workspace.",
        ],
        bullets: [
          "Institutes must immediately disable or reset credentials for departing staff members via the Manage Logins & Staff controls.",
          "Users must not share Super Admin secret keys, session cookies, or administrative passwords with unauthorized persons.",
          "CertiDesk Pro reserves the right to temporarily lock or suspend accounts exhibiting suspicious login patterns or unauthorized access attempts.",
        ],
      },
      {
        id: "wallet-and-pricing",
        heading: "4. Prepaid Wallet, Platform Charges & Fee Separation",
        paragraphs: [
          "CertiDesk Pro operates on a transparent prepaid wallet model. Institutes recharge their Platform Wallet via supported payment gateways (Razorpay). Applicable platform charges (such as per-student admission charges, profile update fees, or plan entitlements) are deducted atomically from the Institute's Platform Wallet at the time the action is executed.",
          "Important Financial Separation: Student tuition and course fees recorded or collected by an institute through the Fee Management module belong strictly to the institute's own accounting ledger and remain completely separate from the CertiDesk Pro Platform Wallet.",
        ],
      },
      {
        id: "academic-authenticity",
        heading: "5. Credential Authenticity & Institutional Responsibility",
        paragraphs: [
          "CertiDesk Pro supplies software tools for generating and verifying certificates and marksheets. CertiDesk Pro is not an accrediting body, university, or government board.",
          "The issuing Institute is solely responsible for verifying student identity, examination integrity, grading accuracy, and legal authorization to issue any certificate, diploma, or marksheet bearing its name and signatory.",
        ],
      },
      {
        id: "intellectual-property",
        heading: "6. Intellectual Property Rights",
        paragraphs: [
          "All software source code, UI designs, database schemas, certificate/marksheet template engines, trademarks, and documentation of CertiDesk Pro remain the exclusive intellectual property of CertiDesk Pro.",
          "Institutes retain 100% ownership of their institutional branding, logos, course curricula, question banks, student records, and issued academic documents. You grant CertiDesk Pro a limited, non-exclusive license to host, process, and render such content solely to deliver the Platform services.",
        ],
      },
      {
        id: "suspension-and-termination",
        heading: "7. Suspension & Termination",
        paragraphs: [
          "We may suspend or terminate access to a workspace immediately if an institute violates our Acceptable Use & Anti-Fraud Policy, engages in credential forgery, initiates fraudulent payment chargebacks, or poses a security risk to the Platform.",
          "Institutes may cease using the Platform at any time and request a data export prior to account closure, subject to our Refund, Cancellation & Wallet Policy.",
        ],
      },
      {
        id: "liability-and-law",
        heading: "8. Limitation of Liability, Indemnification & Governing Law",
        paragraphs: [
          "To the maximum extent permitted by applicable law, CertiDesk Pro shall not be liable for indirect, incidental, consequential, or punitive damages, or loss of institutional revenue arising from user-entered inaccuracies, third-party payment gateway outages, or force majeure events. Aggregate liability for any claim shall not exceed the total platform fees paid by the institute in the three (3) months preceding the claim.",
          "These Terms are governed by the laws of India. Any dispute arising hereunder shall be subject to the exclusive jurisdiction of competent courts in India.",
        ],
      },
    ],
  },
  {
    slug: "refund-policy",
    href: "/refund-policy",
    title: "Refund, Cancellation & Wallet Policy",
    shortTitle: "Refund & Wallet Policy",
    eyebrow: "Billing & Financial Terms",
    description:
      "Clear rules for Institute Prepaid Wallet recharges via Razorpay, consumed platform credits, failed or duplicate payment reversals, and student fee separation.",
    version: "v2.1",
    effectiveDate: LEGAL_ENTITY.effectiveDate,
    lastUpdated: LEGAL_ENTITY.lastUpdated,
    jurisdiction: LEGAL_ENTITY.jurisdiction,
    audience: "Institute Owners & Finance Administrators",
    pdfFilename: "CertiDesk-Pro-Refund-and-Wallet-Policy.pdf",
    highlights: [
      "Failed or duplicate Razorpay recharges are auto-reconciled or refunded within 5-7 business days.",
      "Consumed admission or document credits are non-refundable once the record is created.",
      "Student fee refunds are handled directly between the Institute and the Student.",
    ],
    sections: [
      {
        id: "prepaid-wallet-model",
        heading: "1. Prepaid Institute Wallet Model",
        paragraphs: [
          "CertiDesk Pro utilizes a pay-as-you-go Prepaid Wallet system. Institutes add funds to their Platform Wallet using Razorpay (UPI, NetBanking, Credit/Debit Cards, or supported wallets). Wallet balances do not expire while the institute account remains active and in good standing.",
        ],
      },
      {
        id: "consumed-credits",
        heading: "2. Non-Refundable Consumed Platform Charges",
        paragraphs: [
          "Once a billable platform action is successfully executed — including but not limited to student admission activation, billable profile updates, or active subscription plan activation — the corresponding wallet deduction is final and non-refundable.",
          "We encourage institutes to verify student details carefully before confirming admissions or issuing official documents.",
        ],
      },
      {
        id: "failed-or-duplicate-payments",
        heading: "3. Failed, Pending & Duplicate Razorpay Transactions",
        paragraphs: [
          "CertiDesk Pro verifies all Razorpay payments server-side using cryptographic signature checks and idempotent Firestore transactions so a single payment is never credited twice and failed orders never debit your wallet.",
        ],
        bullets: [
          "Debited but Not Credited: If your bank/UPI account is debited during a wallet recharge and the balance does not reflect within 30 minutes, our automated webhook reconciliation or Razorpay auto-refund mechanism will either credit the wallet or reverse the amount.",
          "Duplicate Payments: Verified duplicate charges for the same recharge attempt are refunded in full to the original payment method within 5 to 7 business days.",
          "Support Escalation: Share your Institute ID, Razorpay Payment ID, and transaction date with support@certidesk.app for priority reconciliation.",
        ],
      },
      {
        id: "unutilized-wallet-closure",
        heading: "4. Account Cancellation & Unutilized Wallet Balance",
        paragraphs: [
          "Institutes may cancel their use of CertiDesk Pro at any time. Unutilized prepaid wallet balances are generally non-cashable promotional/service credits; however, in cases of verified duplicate deposits or verified platform discontinuation, eligible net balances (less applicable payment gateway processing charges and taxes) may be reviewed for refund upon written request from the registered Institute Owner.",
        ],
      },
      {
        id: "student-fee-separation",
        heading: "5. Student Tuition & Course Fee Refunds",
        paragraphs: [
          "CertiDesk Pro provides fee tracking, receipt generation, and refund recording tools for institutes. CertiDesk Pro does not hold or custody student tuition fees. Any refund of tuition, exam, or admission fees paid by a student to an institute is governed exclusively by that institute's own refund policy and must be settled directly between the institute and the student.",
        ],
      },
    ],
  },
  {
    slug: "cookie-policy",
    href: "/cookie-policy",
    title: "Cookie & Local Storage Policy",
    shortTitle: "Cookie Policy",
    eyebrow: "Session & Browser Storage",
    description:
      "Transparent breakdown of strictly necessary authentication cookies, PWA offline storage, and UI preferences used by CertiDesk Pro — with zero third-party ad trackers.",
    version: "v2.0",
    effectiveDate: LEGAL_ENTITY.effectiveDate,
    lastUpdated: LEGAL_ENTITY.lastUpdated,
    jurisdiction: LEGAL_ENTITY.jurisdiction,
    audience: "All Website & Portal Visitors",
    pdfFilename: "CertiDesk-Pro-Cookie-Policy.pdf",
    highlights: [
      "Strictly necessary HTTP-only cookies for secure portal authentication.",
      "Zero third-party advertising, retargeting, or cross-site tracking cookies.",
      "LocalStorage and Service Worker cache used only for theme and PWA offline fallback.",
    ],
    sections: [
      {
        id: "what-are-cookies",
        heading: "1. What Cookies & Browser Storage We Use",
        paragraphs: [
          "Cookies and local browser storage are small files saved on your device to keep authenticated sessions secure, remember interface preferences, and power Progressive Web App (PWA) offline capabilities.",
        ],
      },
      {
        id: "essential-cookies",
        heading: "2. Strictly Necessary Authentication Cookies",
        paragraphs: [
          "When you sign in to the Institute Portal, Student Portal, or Super Admin Console, CertiDesk Pro issues an encrypted, HTTP-only session cookie verified on the server via Firebase Admin SDK.",
        ],
        bullets: [
          "Purpose: Authenticates your active session, enforces role-based access control, and prevents Cross-Site Scripting (XSS) token theft.",
          "Duration: Session-scoped or configured security expiry; cleared immediately upon clicking Sign Out or when revoked by an administrator.",
          "Requirement: Essential for portal login. Blocking strictly necessary cookies will prevent signing into authenticated dashboards.",
        ],
      },
      {
        id: "local-storage-and-pwa",
        heading: "3. Local Storage & Service Worker Cache",
        paragraphs: [
          "CertiDesk Pro uses browser localStorage and the PWA Service Worker cache strictly for functional reliability:",
        ],
        bullets: [
          "Theme Preference: Remembers whether you selected Light or Dark mode.",
          "PWA Offline Support: Caches static assets and the /offline fallback page so installed mobile and desktop apps launch reliably even on unstable networks.",
        ],
      },
      {
        id: "no-ad-tracking",
        heading: "4. Zero Third-Party Advertising Cookies",
        paragraphs: [
          "CertiDesk Pro does not embed third-party ad-network pixels, behavioral retargeting cookies, or data-broker trackers on public pages or inside institute/student portals.",
        ],
      },
      {
        id: "managing-cookies",
        heading: "5. Managing Browser Cookies",
        paragraphs: [
          "You can inspect, clear, or restrict cookies and site storage at any time through your browser settings (Chrome, Edge, Safari, Firefox). Clearing cookies will sign you out of active CertiDesk Pro portals.",
        ],
      },
    ],
  },
  {
    slug: "acceptable-use",
    href: "/acceptable-use",
    title: "Acceptable Use & Anti-Fraud Policy",
    shortTitle: "Acceptable Use Policy",
    eyebrow: "Trust, Safety & Integrity",
    description:
      "Rules prohibiting forged certificates, unauthorized data scraping, cross-tenant probing, exam automation abuse, and spam across CertiDesk Pro.",
    version: "v2.0",
    effectiveDate: LEGAL_ENTITY.effectiveDate,
    lastUpdated: LEGAL_ENTITY.lastUpdated,
    jurisdiction: LEGAL_ENTITY.jurisdiction,
    audience: "All Institutes, Staff & Students",
    pdfFilename: "CertiDesk-Pro-Acceptable-Use-Policy.pdf",
    highlights: [
      "Zero tolerance for issuing fraudulent, forged, or misleading academic credentials.",
      "Strict prohibition on probing multi-tenant boundaries or scraping verification endpoints.",
      "Immediate suspension and audit preservation for security or anti-fraud violations.",
    ],
    sections: [
      {
        id: "credential-integrity",
        heading: "1. Credential & Academic Integrity",
        paragraphs: [
          "CertiDesk Pro's QR verification system exists to build employer and public trust in legitimate educational credentials. Institutes must never:",
        ],
        bullets: [
          "Issue certificates or marksheets for courses not actually completed or without genuine institutional assessment.",
          "Misrepresent affiliation with government bodies, UGC/AICTE-recognized universities, or statutory boards.",
          "Falsify student identities, backdate credentials fraudulently, or alter issued records to deceive third parties.",
        ],
      },
      {
        id: "technical-and-security-prohibitions",
        heading: "2. Technical, Security & Multi-Tenant Prohibitions",
        paragraphs: [
          "Users must not attempt to undermine the security, availability, or tenant isolation of CertiDesk Pro:",
        ],
        bullets: [
          "Attempting to access, enumerate, or query another institute's data, Firestore collections, or student records.",
          "Running automated scrapers, brute-force credential attacks, or bulk enumeration against /verify/[verificationId] or authentication endpoints.",
          "Deploying automated scripts, bots, or tampering tools during Student Online Examinations.",
          "Uploading malware, executable payloads, or abusive scripts into profile fields, communication notices, or support forms.",
        ],
      },
      {
        id: "communication-standards",
        heading: "3. Communication & Notification Module",
        paragraphs: [
          "Institutes using internal announcements and student notifications must send only legitimate academic, attendance, examination, and fee-related notices. Phishing, unsolicited commercial spam, or defamatory content is strictly prohibited.",
        ],
      },
      {
        id: "enforcement",
        heading: "4. Enforcement & Reporting Violations",
        paragraphs: [
          `Suspected violations trigger automated security alerts, audit log preservation, and may result in immediate workspace suspension or permanent termination without refund. Report suspected certificate fraud or abuse to ${LEGAL_ENTITY.supportEmail}.`,
        ],
      },
    ],
  },
  {
    slug: "dpa",
    href: "/dpa",
    title: "Data Processing Addendum (DPA)",
    shortTitle: "Data Processing Addendum",
    eyebrow: "Enterprise B2B Compliance",
    description:
      "Standard Data Processing Addendum between Registered Institutes (Data Fiduciary) and CertiDesk Pro (Data Processor) covering security controls, sub-processors, breach notification, and data portability.",
    version: "v2.1",
    effectiveDate: LEGAL_ENTITY.effectiveDate,
    lastUpdated: LEGAL_ENTITY.lastUpdated,
    jurisdiction: LEGAL_ENTITY.jurisdiction,
    audience: "Institute Owners, Legal & Compliance Teams",
    pdfFilename: "CertiDesk-Pro-Data-Processing-Addendum.pdf",
    highlights: [
      "Defines Institute as Data Fiduciary and CertiDesk Pro as Data Processor under DPDP Act 2023.",
      "Commits to 72-hour security incident notification and full CSV/PDF data export.",
      "Documents technical safeguards including TLS encryption, Firestore tenant rules, and audit redaction.",
    ],
    sections: [
      {
        id: "dpa-parties-and-scope",
        heading: "1. Parties, Roles & Incorporation",
        paragraphs: [
          "This Data Processing Addendum ('DPA') forms part of the Terms of Service between the registered Institute ('Data Fiduciary' or 'Customer') and CertiDesk Pro ('Data Processor').",
          "CertiDesk Pro processes Personal Data solely on documented instructions from the Institute to deliver student management, attendance, fee accounting, examinations, marksheets, and verifiable certificates.",
        ],
      },
      {
        id: "technical-and-organizational-measures",
        heading: "2. Technical & Organizational Security Measures (TOMs)",
        paragraphs: [
          "CertiDesk Pro maintains industry-standard safeguards proportionate to educational and financial SaaS workloads:",
        ],
        bullets: [
          "Encryption in Transit & at Rest: All traffic is encrypted via HTTPS/TLS; Firestore and Cloud Storage encrypt data at rest using AES-256.",
          "Logical Tenant Isolation: Every student, fee, exam, attendance, and certificate document is scoped by instituteId and enforced server-side.",
          "Role-Based Access Control (RBAC): Granular separation between Super Admin, Institute Admin, Staff, and Student portals.",
          "Audit Log Redaction: Security and administrative audit logs automatically redact secrets, passwords, OTPs, and session tokens.",
        ],
      },
      {
        id: "subprocessors",
        heading: "3. Authorized Sub-Processors",
        paragraphs: [
          "The Institute grants general authorization for CertiDesk Pro to engage the following vetted sub-processors solely for service delivery: (a) Google Cloud Platform / Firebase for authentication, database, and file storage; and (b) Razorpay Software Pvt. Ltd. for payment processing.",
        ],
      },
      {
        id: "breach-notification",
        heading: "4. Personal Data Breach Notification",
        paragraphs: [
          "In the event of a confirmed Personal Data Breach affecting Institute records, CertiDesk Pro will notify the affected Institute Owner without undue delay and no later than 72 hours after confirmation, providing known impact details, containment actions, and remediation guidance.",
        ],
      },
      {
        id: "return-and-deletion",
        heading: "5. Data Return, Export & Deletion",
        paragraphs: [
          "Throughout the active term, Institutes may export student rosters, attendance logs, fee reports, and issued certificates in CSV or PDF formats. Upon verified workspace termination, CertiDesk Pro will delete or anonymize tenant personal data within 30 days unless statutory retention is required by law.",
        ],
      },
    ],
  },
  {
    slug: "sla",
    href: "/sla",
    title: "Service Level & Support Policy (SLA)",
    shortTitle: "Service Level Agreement",
    eyebrow: "Reliability & Support",
    description:
      "Platform uptime commitments, incident severity response targets, scheduled maintenance practices, and backup recovery standards for CertiDesk Pro.",
    version: "v2.0",
    effectiveDate: LEGAL_ENTITY.effectiveDate,
    lastUpdated: LEGAL_ENTITY.lastUpdated,
    jurisdiction: LEGAL_ENTITY.jurisdiction,
    audience: "Institutes & Operations Teams",
    pdfFilename: "CertiDesk-Pro-Service-Level-Agreement.pdf",
    highlights: [
      "99.9% monthly uptime target for core portals and public QR verification.",
      "Priority response targets across P1 Critical through P4 General support tiers.",
      "Automated cloud database durability and point-in-time recovery safeguards.",
    ],
    sections: [
      {
        id: "uptime-target",
        heading: "1. Monthly Uptime Target (99.9%)",
        paragraphs: [
          "CertiDesk Pro targets 99.9% monthly availability for the Institute Portal, Student Portal, Payment Verification APIs, and Public Certificate Verification (/verify/[verificationId]).",
        ],
      },
      {
        id: "incident-response-tiers",
        heading: "2. Incident Severity & Response Targets",
        paragraphs: [
          "Support tickets submitted via the Contact page or support@certidesk.app are triaged according to operational impact:",
        ],
        bullets: [
          "Severity P1 (Critical — Complete Portal Outage or Payment Blocking): Initial response within 2 hours; continuous mitigation until restored.",
          "Severity P2 (High — Major Feature Degradation Affecting Exams or Admissions): Initial response within 6 business hours.",
          "Severity P3 (Medium — Non-Blocking UI or Report Issue): Initial response within 1 business day.",
          "Severity P4 (Low — How-To Questions, Feature Requests, Account Inquiries): Initial response within 2 business days.",
        ],
      },
      {
        id: "maintenance-and-backups",
        heading: "3. Scheduled Maintenance & Data Durability",
        paragraphs: [
          "Routine platform upgrades are deployed with zero-downtime rolling releases wherever possible. When maintenance requires brief service interruption, notices are published in advance via Super Admin announcements.",
          "Institutional data is backed by managed Google Cloud / Firestore multi-zone replication to protect against hardware failure.",
        ],
      },
      {
        id: "sla-exclusions",
        heading: "4. Exclusions",
        paragraphs: [
          "Uptime calculations exclude scheduled maintenance windows, internet connectivity issues on the user's device, third-party payment gateway or banking rail outages, and emergency security lockdowns triggered by abusive traffic.",
        ],
      },
    ],
  },
];

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((doc) => doc.slug === slug);
}
