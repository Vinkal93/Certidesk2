import { z } from "zod";

export const contactFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(80, "Full name must be under 80 characters."),
  email: z.string().trim().email("Please enter a valid work or institute email."),
  instituteName: z
    .string()
    .trim()
    .min(2, "Institute name must be at least 2 characters.")
    .max(120, "Institute name must be under 120 characters."),
  instituteType: z.enum([
    "coaching",
    "vocational",
    "computer_training",
    "school_college",
    "multi_branch",
  ]),
  studentCount: z.enum(["under_100", "100_500", "500_2000", "above_2000"]),
  message: z
    .string()
    .trim()
    .min(10, "Please share a brief note about your institute requirements.")
    .max(1000, "Message must be under 1000 characters."),
  agreeToPolicy: z.boolean().refine((val) => val === true, {
    message: "Please confirm you agree to our privacy policy.",
  }),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const onboardingRequestSchema = z.object({
  adminName: z
    .string()
    .trim()
    .min(2, "Administrator name must be at least 2 characters."),
  adminEmail: z.string().trim().email("Please enter a valid email address."),
  instituteName: z
    .string()
    .trim()
    .min(2, "Institute name must be at least 2 characters."),
  branchesCount: z.enum(["1", "2_5", "6_plus"]),
  primaryFocus: z.enum([
    "admissions_fees",
    "attendance_exams",
    "certificates_marksheets",
    "full_suite",
  ]),
});

export type OnboardingRequestValues = z.infer<typeof onboardingRequestSchema>;
