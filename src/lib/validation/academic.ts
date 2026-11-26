import { z } from "zod";

export const courseSubjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Subject name is required.").max(80),
  code: z.string().trim().min(1).max(20),
  order: z.coerce.number().int().min(1),
  maxMarks: z.coerce.number().int().min(1).max(1000).default(100),
});

export const createCourseSchema = z.object({
  name: z.string().trim().min(2, "Course name is required.").max(120),
  code: z.string().trim().min(2, "Course code is required.").max(20),
  duration: z.string().trim().min(2, "Duration is required.").max(60),
  feeRupees: z.coerce.number().min(0).max(500000),
  description: z.string().trim().max(500).default(""),
  subjects: z.array(courseSubjectSchema).default([]),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const createBatchSchema = z.object({
  name: z.string().trim().min(2, "Batch name is required.").max(80),
  courseId: z.string().trim().min(1, "Select a course."),
  timing: z.string().trim().min(2, "Batch timing is required.").max(80),
  teacherUid: z.string().trim().optional().nullable(),
  capacity: z.coerce.number().int().min(1).max(500).default(30),
  status: z.enum(["active", "completed", "inactive"]).default("active"),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
