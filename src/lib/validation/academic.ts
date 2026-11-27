import { z } from "zod";

export const courseSubjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Subject name is required.").max(80),
  code: z.string().trim().min(1).max(20),
  order: z.coerce.number().int().min(1),
  maxMarks: z.coerce.number().int().min(1).max(1000).default(100),
  passingMarks: z.coerce.number().int().min(0).max(1000).optional(),
  theoryMaxMarks: z.coerce.number().int().min(0).max(1000).optional(),
  practicalMaxMarks: z.coerce.number().int().min(0).max(1000).optional(),
  type: z.enum(["theory", "practical", "both"]).optional(),
  active: z.boolean().optional(),
});

export const createCourseSchema = z.object({
  name: z.string().trim().min(2, "Course name is required.").max(120),
  code: z.string().trim().min(2, "Course code is required.").max(20),
  category: z.string().trim().max(60).optional(),
  duration: z.string().trim().min(2, "Duration is required.").max(60),
  feeRupees: z.coerce.number().min(0).max(500000),
  admissionFeeRupees: z.coerce.number().min(0).max(100000).optional(),
  certificateEligible: z.boolean().optional(),
  marksheetEnabled: z.boolean().optional(),
  description: z.string().trim().max(500).default(""),
  subjects: z.array(courseSubjectSchema).default([]),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
});

export const createBatchSchema = z.object({
  name: z.string().trim().min(2, "Batch name is required.").max(80),
  code: z.string().trim().max(30).optional(),
  courseId: z.string().trim().min(1, "Select a course."),
  timing: z.string().trim().min(2, "Batch timing is required.").max(80),
  startDate: z.string().trim().optional(),
  expectedEndDate: z.string().trim().optional(),
  room: z.string().trim().max(60).optional().nullable(),
  description: z.string().trim().max(400).optional(),
  teacherUid: z.string().trim().optional().nullable(),
  capacity: z.coerce.number().int().min(1).max(500).default(30),
  status: z.enum(["active", "completed", "inactive", "archived"]).default("active"),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
