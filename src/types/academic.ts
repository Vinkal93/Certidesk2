export interface CourseSubject {
  id: string;
  name: string;
  code: string;
  order: number;
  maxMarks: number;
  passingMarks?: number | undefined;
  theoryMaxMarks?: number | undefined;
  practicalMaxMarks?: number | undefined;
  type?: "theory" | "practical" | "both" | undefined;
  active?: boolean | undefined;
}

export interface CourseRecord {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  category?: string;
  duration: string;
  durationMonths?: number;
  monthlyFeePaise?: number;
  feePaise: number;
  admissionFeePaise?: number;
  certificateEligible?: boolean;
  marksheetEnabled?: boolean;
  description: string;
  subjects: CourseSubject[];
  status: "active" | "inactive" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface BatchRecord {
  id: string;
  instituteId: string;
  name: string;
  code?: string;
  courseId: string;
  courseName: string;
  timing: string;
  startDate?: string;
  expectedEndDate?: string;
  workingDays?: string[];
  room?: string | null;
  description?: string;
  teacherUid: string | null;
  teacherName: string | null;
  capacity: number;
  enrolledCount: number;
  status: "active" | "completed" | "inactive" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface StudentBatchTransferRecord {
  id: string;
  instituteId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  oldCourseId: string | null;
  oldCourseName: string;
  oldBatchId: string | null;
  oldBatchName: string;
  newCourseId: string;
  newCourseName: string;
  newBatchId: string;
  newBatchName: string;
  effectiveDate: string;
  reason: string;
  actorUid: string;
  createdAt: string;
}

export type AttendanceStatus = "present" | "absent" | "leave";

export interface AttendanceRecord {
  id: string;
  instituteId: string;
  batchId: string;
  batchName: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  date: string;
  status: AttendanceStatus;
  markedByUid: string;
  editedByUid: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFeePlanRecord {
  id: string;
  instituteId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  courseName: string;
  totalFeePaise: number;
  monthlyFeePaise?: number;
  durationMonths?: number;
  admissionFeePaise?: number;
  startDate?: string;
  discountPaise: number;
  paidPaise: number;
  pendingPaise: number;
  createdAt: string;
  updatedAt: string;
}

export interface FeePaymentRecord {
  id: string;
  receiptNo: string;
  instituteId: string;
  feePlanId: string;
  studentId: string;
  studentName: string;
  amountPaise: number;
  paymentMode: "cash" | "upi" | "bank_transfer" | "card";
  note: string;
  collectedByUid: string;
  paidAt: string;
  createdAt: string;
}

export interface ExamSubject {
  id: string;
  name: string;
  maxMarks: number;
  passingMarks: number;
}

export interface ExaminationRecord {
  id: string;
  instituteId: string;
  title: string;
  batchId: string;
  batchName: string;
  examDate: string;
  subjects: ExamSubject[];
  status: "scheduled" | "published" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface ExamMarkEntry {
  subjectId: string;
  subjectName: string;
  maxMarks: number;
  obtainedMarks: number;
}

export interface StudentMarksheetRecord {
  id: string;
  instituteId: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  batchName: string;
  marks: ExamMarkEntry[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: string;
  result: "PASS" | "FAIL";
  published: boolean;
  updatedByUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateRecord {
  id: string;
  certificateNumber: string;
  verificationId: string;
  instituteId: string;
  instituteName: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  courseName: string;
  templateId: "classic" | "modern" | "merit";
  grade: string;
  status: "issued" | "revoked";
  revokeReason: string | null;
  issuedByUid: string;
  issuedAt: string;
  updatedAt: string;
}
