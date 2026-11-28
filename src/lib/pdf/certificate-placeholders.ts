export const APPROVED_CERTIFICATE_PLACEHOLDER_KEYS = [
  "institute_name",
  "institute_logo",
  "institute_address",
  "registration_number",
  "issue_date",
  "student_name",
  "student_id",
  "course_name",
  "course_full_name",
  "duration",
  "marks",
  "percentage",
  "grade",
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
