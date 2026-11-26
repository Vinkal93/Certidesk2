import { z } from "zod";

export const portalSchema = z.enum(["super_admin", "institute", "student"]);

export const superAdminLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid Super Admin email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const instituteLoginSchema = z.object({
  instituteId: z
    .string()
    .trim()
    .min(3, "Institute ID is required.")
    .max(40, "Institute ID is too long.")
    .transform((v) => v.toUpperCase()),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const studentLoginSchema = z.object({
  studentId: z
    .string()
    .trim()
    .min(3, "Student ID is required.")
    .max(40, "Student ID is too long.")
    .transform((v) => v.toUpperCase()),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const resolveLoginIdentifierSchema = z.object({
  portal: z.enum(["institute", "student"]),
  identifier: z
    .string()
    .trim()
    .min(3, "Identifier is required.")
    .max(60)
    .transform((v) => v.toUpperCase()),
});

export const createSessionSchema = z.object({
  idToken: z.string().min(20, "Invalid authentication token."),
  portal: portalSchema,
});

export type SuperAdminLoginValues = z.infer<typeof superAdminLoginSchema>;
export type InstituteLoginValues = z.infer<typeof instituteLoginSchema>;
export type StudentLoginValues = z.infer<typeof studentLoginSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
