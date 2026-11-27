import { z } from "zod";

export const publicRegisterSchema = z
  .object({
    instituteName: z
      .string()
      .trim()
      .min(3, "Institute name must be at least 3 characters.")
      .max(120, "Institute name is too long."),
    ownerName: z
      .string()
      .trim()
      .min(2, "Owner full name must be at least 2 characters.")
      .max(80, "Owner name is too long."),
    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .transform((v) => v.toLowerCase()),
    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
    address: z
      .string()
      .trim()
      .min(5, "Institute address must be at least 5 characters.")
      .max(250, "Institute address is too long."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password is too long.")
      .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
      .regex(/[a-z]/, "Password must include at least one lowercase letter.")
      .regex(/\d/, "Password must include at least one number."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
    acceptTerms: z.literal(true, {
      errorMap: () => ({
        message: "You must accept the Terms of Service and Privacy Policy.",
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type PublicRegisterInput = z.infer<typeof publicRegisterSchema>;

export const onboardingActionSchema = z.object({
  action: z.enum(["mark_verified", "skip_wallet", "complete"]),
});
