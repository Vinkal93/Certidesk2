export const APPROVED_CERTIFICATE_PLACEHOLDER_KEYS = [
  "institute_name",
  "institute_logo",
  "institute_address",
  "registration_number",
  "issue_date",
  "student_name",
  "student_id",
  "student_photo",
  "father_name",
  "dob",
  "enrollment_number",
  "batch_year",
  "course_name",
  "course_full_name",
  "duration",
  "marks",
  "percentage",
  "grade",
  "grade_text",
  "result",
  "certificate_number",
  "director_name",
  "director_signature",
  "authorized_signatory",
  "institute_seal",
  "verification_qr",
  "exam_name",
] as const;

export type CertificatePlaceholderKey =
  (typeof APPROVED_CERTIFICATE_PLACEHOLDER_KEYS)[number];

export type CertificatePlaceholderValues = Partial<
  Record<CertificatePlaceholderKey, string>
>;

export interface SampleProfileItem {
  id: string;
  name: string;
  badge: string;
  values: CertificatePlaceholderValues;
}

export const CERTIFICATE_SAMPLE_PROFILES: SampleProfileItem[] = [
  {
    id: "profile_rahul",
    name: "Rahul Kumar (Standard ADCA)",
    badge: "85% · Grade A+",
    values: {
      institute_name: "SBCI COMPUTER INSTITUTE",
      institute_address:
        "Bhuvalpur Road, Main Chauraha, Akbarpur, Ambedkar Nagar - 224122 (U.P.)",
      registration_number: "SBCI/2026/001",
      issue_date: "28 Nov 2026",
      student_name: "Rahul Kumar",
      student_id: "STU-SBCI-001",
      father_name: "Ram Chandra",
      dob: "15/08/2003",
      enrollment_number: "ENR-2026-0891",
      batch_year: "2025-2026",
      course_name: "ADCA",
      course_full_name: "Advanced Diploma in Computer Applications",
      duration: "12 Months",
      marks: "425 / 500",
      percentage: "85",
      grade: "A+",
      grade_text: "Distinction with Honours",
      result: "PASS",
      certificate_number: "CERT-SBCI-2026-0001",
      director_name: "Vinkal Prajapati",
    },
  },
  {
    id: "profile_priya",
    name: "Priya Sharma (Top Ranker DCA)",
    badge: "96% · Grade A++",
    values: {
      institute_name: "EXCELLENCE TECHNICAL ACADEMY",
      institute_address:
        "Knowledge Park III, Institutional Area, Greater Noida - 201310",
      registration_number: "ETA/UP/2026/902",
      issue_date: "28 Nov 2026",
      student_name: "Priya Sharma",
      student_id: "STU-ETA-104",
      father_name: "Suresh Sharma",
      dob: "22/11/2004",
      enrollment_number: "ENR-2026-1104",
      batch_year: "2026",
      course_name: "DCA",
      course_full_name: "Diploma in Computer Applications",
      duration: "06 Months",
      marks: "480 / 500",
      percentage: "96",
      grade: "A++",
      grade_text: "First Class with Distinction",
      result: "PASS",
      certificate_number: "CERT-ETA-2026-0084",
      director_name: "Dr. A. K. Verma",
    },
  },
  {
    id: "profile_long",
    name: "Mohammad Shahrukh Khan (Stress Test)",
    badge: "Long Name & Course",
    values: {
      institute_name:
        "MAHARAJA AGRASEN INSTITUTE OF ADVANCED INFORMATION TECHNOLOGY & RESEARCH",
      institute_address:
        "Campus Sector 12, VIP Highway Boulevard, Hazratganj, Lucknow - 226001 (Uttar Pradesh)",
      registration_number: "MAIAITR/REG/2026/9821/CENTRAL",
      issue_date: "28 Nov 2026",
      student_name: "Mohammad Shahrukh Khan",
      student_id: "STU-MAIAITR-2026-9921",
      father_name: "Late Janab Abdul Rashid Khan",
      dob: "05/01/2001",
      enrollment_number: "ENR-MAIAITR-2026-9921-A",
      batch_year: "2024-2026",
      course_name: "PGDCA",
      course_full_name:
        "Post Graduate Diploma in Computer Applications & Full Stack Software Development",
      duration: "18 Months Professional Track",
      marks: "870 / 1000",
      percentage: "87",
      grade: "A+",
      grade_text: "First Division with Star Honours",
      result: "PASS",
      certificate_number: "CERT-MAIAITR-2026-987621-PRO",
      director_name: "Prof. Narendra Pratap Singh",
    },
  },
];

export const CATEGORIZED_PLACEHOLDERS = [
  {
    category: "Student Details",
    icon: "GraduationCap",
    items: [
      { key: "{{student_name}}", label: "Student Full Name" },
      { key: "{{student_id}}", label: "Student ID" },
      { key: "{{father_name}}", label: "Father Name" },
      { key: "{{dob}}", label: "Date of Birth" },
      { key: "{{enrollment_number}}", label: "Enrollment No" },
      { key: "{{student_photo}}", label: "Student Photo (URL/Frame)" },
    ],
  },
  {
    category: "Course & Program",
    icon: "BookOpen",
    items: [
      { key: "{{course_name}}", label: "Course Short Code (e.g. ADCA)" },
      { key: "{{course_full_name}}", label: "Course Full Title" },
      { key: "{{duration}}", label: "Course Duration" },
      { key: "{{batch_year}}", label: "Batch Year" },
    ],
  },
  {
    category: "Marks & Performance",
    icon: "Trophy",
    items: [
      { key: "{{percentage}}", label: "Percentage (%)" },
      { key: "{{grade}}", label: "Grade (e.g. A+, A++)" },
      { key: "{{grade_text}}", label: "Grade Text (e.g. Distinction)" },
      { key: "{{marks}}", label: "Marks Obtained / Total" },
      { key: "{{result}}", label: "Result (PASS)" },
    ],
  },
  {
    category: "Institute & Authority",
    icon: "Building2",
    items: [
      { key: "{{institute_name}}", label: "Institute Name" },
      { key: "{{institute_address}}", label: "Institute Address" },
      { key: "{{registration_number}}", label: "Institute Reg No." },
      { key: "{{director_name}}", label: "Director Name" },
      { key: "{{institute_logo}}", label: "Institute Logo (URL/Default)" },
      { key: "{{institute_seal}}", label: "Institute Seal (SVG/Stamp)" },
      { key: "{{director_signature}}", label: "Director Signature" },
      { key: "{{authorized_signatory}}", label: "Authorized Signatory" },
    ],
  },
  {
    category: "Document Verification",
    icon: "ShieldCheck",
    items: [
      { key: "{{certificate_number}}", label: "Certificate Serial No." },
      { key: "{{issue_date}}", label: "Issue Date" },
    ],
  },
];

export function resolveApprovedPlaceholders(
  templateText: string,
  values: CertificatePlaceholderValues
): string {
  return templateText.replace(/\{\{([a-z_]+)\}\}/g, (_match, key: string) => {
    if ((APPROVED_CERTIFICATE_PLACEHOLDER_KEYS as readonly string[]).includes(key)) {
      const val = values[key as CertificatePlaceholderKey];
      return val !== undefined && val !== null ? String(val) : "";
    }
    return "";
  });
}

export function buildCertificateDownloadFilename(params: {
  instituteName: string;
  courseName: string;
  studentName: string;
}): string {
  const clean = (s: string, fallback: string) => {
    const out = s
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return out || fallback;
  };
  const instShort = clean(
    params.instituteName.split(/\s+/)[0] ?? params.instituteName,
    "CertiDesk"
  );
  const course = clean(params.courseName, "Course");
  const student = clean(params.studentName, "Student");
  return `${instShort}_${course}_${student}_Certificate.pdf`;
}
