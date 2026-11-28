import { z } from "zod";

export const questionItemSchema = z.object({
  questionText: z.string().trim().min(3).max(2000),
  imageUrl: z.string().trim().max(500).optional(),
  questionType: z
    .enum(["single_mcq", "multi_mcq", "true_false", "fill_blank", "short_answer"])
    .default("single_mcq"),
  subject: z.string().trim().min(1).max(80),
  topic: z.string().trim().max(80).default("General"),
  courseName: z.string().trim().max(120).optional(),
  language: z.string().trim().max(40).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().trim().min(1).max(500),
      })
    )
    .max(6)
    .default([]),
  correctOptionIds: z.array(z.string().min(1)).default([]),
  correctText: z.string().trim().max(1000).optional(),
  marks: z.coerce.number().positive().max(100),
  negativeMarks: z.coerce.number().min(0).max(50).optional(),
  explanation: z.string().trim().max(1000).optional(),
  status: z.enum(["active", "archived"]).optional(),
});
