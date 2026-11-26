import { z } from "zod";

export const createInstituteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Institute name must be at least 2 characters.")
    .max(120, "Institute name is too long."),
  ownerName: z
    .string()
    .trim()
    .min(2, "Owner name must be at least 2 characters.")
    .max(80),
  phone: z
    .string()
    .trim()
    .min(8, "Enter a valid phone number.")
    .max(20, "Phone number is too long."),
  email: z.string().trim().email("Enter a valid institute email."),
  address: z.string().trim().min(5, "Address must be at least 5 characters.").max(300),
  passwordMode: z.enum(["auto", "manual"]).default("auto"),
  manualPassword: z.string().optional(),
  initialWalletRupees: z.coerce
    .number()
    .min(0, "Initial wallet balance cannot be negative.")
    .max(1000000, "Initial wallet balance exceeds limit."),
  admissionFeeRupees: z.coerce.number().min(0).max(50000).default(150),
  profileUpdateFeeRupees: z.coerce.number().min(0).max(50000).default(100),
  certificateFeeRupees: z.coerce.number().min(0).max(50000).default(0),
  status: z.enum(["active", "suspended"]).default("active"),
});

export const updateInstituteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(20),
  address: z.string().trim().min(5).max(300),
  admissionFeeRupees: z.coerce.number().min(0).max(50000),
  profileUpdateFeeRupees: z.coerce.number().min(0).max(50000),
  certificateFeeRupees: z.coerce.number().min(0).max(50000),
});

export const instituteActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("activate") }),
  z.object({ action: z.literal("suspend") }),
  z.object({ action: z.literal("reset_access") }),
]);

export type CreateInstituteInput = z.infer<typeof createInstituteSchema>;
export type UpdateInstituteInput = z.infer<typeof updateInstituteSchema>;
export type InstituteActionInput = z.infer<typeof instituteActionSchema>;
