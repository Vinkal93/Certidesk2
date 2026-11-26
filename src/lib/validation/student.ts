import { z } from "zod";

export const admitStudentSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Student name must be at least 2 characters.")
    .max(100),
  email: z.string().trim().email("Enter a valid student email."),
  phone: z.string().trim().min(8, "Enter a valid phone number.").max(20),
  guardianName: z.string().trim().max(100).optional(),
  guardianPhone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(300).optional(),
  admissionDate: z.string().trim().optional(),
  courseId: z.string().trim().optional(),
  batchId: z.string().trim().optional(),
  courseName: z.string().trim().min(2, "Course name is required.").max(120),
  batchName: z.string().trim().min(1, "Batch name is required.").max(80),
});

export const updateStudentSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(20),
  guardianName: z.string().trim().max(100).optional(),
  guardianPhone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(300).optional(),
  courseId: z.string().trim().optional(),
  batchId: z.string().trim().optional(),
  courseName: z.string().trim().min(2).max(120),
  batchName: z.string().trim().min(1).max(80),
});

export const studentActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("activate") }),
  z.object({ action: z.literal("disable") }),
  z.object({ action: z.literal("reset_password") }),
]);

export const createStaffSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email("Enter a valid staff email."),
  designation: z.string().trim().max(60).optional(),
  assignedSubjects: z.array(z.string().trim()).optional(),
  assignedBatchIds: z.array(z.string().trim()).optional(),
  permissions: z
    .array(
      z.enum([
        "students:read",
        "students:write",
        "courses:read",
        "courses:write",
        "batches:read",
        "batches:write",
        "staff:read",
        "staff:write",
        "attendance:read",
        "attendance:write",
        "fees:read",
        "fees:write",
        "exams:read",
        "exams:write",
        "certificates:read",
        "certificates:issue",
        "wallet:read",
        "reports:read",
        "communication:send",
        "settings:write",
      ])
    )
    .min(1, "Select at least one permission."),
});

export type AdmitStudentInput = z.infer<typeof admitStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
