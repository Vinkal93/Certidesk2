import { z } from "zod";

export const gatewayEnvironmentSchema = z.enum(["test", "live"]);

export const configureGatewaySchema = z
  .object({
    environment: gatewayEnvironmentSchema,
    keyId: z.string().trim().min(10, "Enter a valid Razorpay Key ID.").max(60),
    keySecret: z.string().trim().min(10, "Enter a valid Razorpay Key Secret.").max(120),
  })
  .superRefine((val, ctx) => {
    if (val.environment === "test" && !val.keyId.startsWith("rzp_test_")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["keyId"],
        message: "Test environment Key ID must start with 'rzp_test_'.",
      });
    }
    if (val.environment === "live" && !val.keyId.startsWith("rzp_live_")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["keyId"],
        message: "Live environment Key ID must start with 'rzp_live_'.",
      });
    }
  });

export const saveWebhookSecretSchema = z.object({
  environment: gatewayEnvironmentSchema,
  webhookSecret: z
    .string()
    .trim()
    .min(8, "Webhook secret must be at least 8 characters.")
    .max(120),
});

export const testConnectionSchema = z.object({
  environment: gatewayEnvironmentSchema,
});

export const activateGatewaySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("activate"),
    environment: gatewayEnvironmentSchema,
    liveMerchantApproved: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("disable"),
  }),
]);

export type ConfigureGatewayInput = z.infer<typeof configureGatewaySchema>;
export type SaveWebhookSecretInput = z.infer<typeof saveWebhookSecretSchema>;
export type TestConnectionInput = z.infer<typeof testConnectionSchema>;
export type ActivateGatewayInput = z.infer<typeof activateGatewaySchema>;
