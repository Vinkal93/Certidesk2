import "server-only";
import { z } from "zod";

function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizePrivateKey(value: string | undefined): string | undefined {
  const cleaned = cleanEnv(value);
  return cleaned ? cleaned.replace(/\\n/g, "\n") : undefined;
}

function normalizeBaseUrl(value: string | undefined): string {
  const cleaned = cleanEnv(value);
  if (!cleaned) return "http://localhost:3000";
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }
  return `https://${cleaned}`;
}

const serverEnvSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1).default("certidesk2-deb79"),
  FIREBASE_CLIENT_EMAIL: z.string().min(1).optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
  GCP_PROJECT_ID: z.string().min(1).default("certidesk2-deb79"),
  GCP_SECRET_MANAGER_CLIENT_EMAIL: z.string().min(1).optional(),
  GCP_SECRET_MANAGER_PRIVATE_KEY: z.string().min(1).optional(),
  APP_BASE_URL: z.string().min(1).default("http://localhost:3000"),
  SESSION_COOKIE_NAME: z.string().min(1).default("cd_session"),
  SESSION_EXPIRES_IN_DAYS: z.coerce.number().int().min(1).max(14).default(5),
  SUPER_ADMIN_EMAILS: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    FIREBASE_PROJECT_ID: cleanEnv(process.env.FIREBASE_PROJECT_ID) || "certidesk2-deb79",
    FIREBASE_CLIENT_EMAIL: cleanEnv(process.env.FIREBASE_CLIENT_EMAIL),
    FIREBASE_PRIVATE_KEY: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    GCP_PROJECT_ID:
      cleanEnv(process.env.GCP_PROJECT_ID) ||
      cleanEnv(process.env.FIREBASE_PROJECT_ID) ||
      "certidesk2-deb79",
    GCP_SECRET_MANAGER_CLIENT_EMAIL: cleanEnv(
      process.env.GCP_SECRET_MANAGER_CLIENT_EMAIL
    ),
    GCP_SECRET_MANAGER_PRIVATE_KEY: normalizePrivateKey(
      process.env.GCP_SECRET_MANAGER_PRIVATE_KEY
    ),
    APP_BASE_URL: normalizeBaseUrl(
      process.env.APP_BASE_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.VERCEL_URL
    ),
    SESSION_COOKIE_NAME: cleanEnv(process.env.SESSION_COOKIE_NAME) || "cd_session",
    SESSION_EXPIRES_IN_DAYS: process.env.SESSION_EXPIRES_IN_DAYS || 5,
    SUPER_ADMIN_EMAILS: cleanEnv(process.env.SUPER_ADMIN_EMAILS),
    RAZORPAY_KEY_ID: cleanEnv(process.env.RAZORPAY_KEY_ID),
    RAZORPAY_KEY_SECRET: cleanEnv(process.env.RAZORPAY_KEY_SECRET),
    RAZORPAY_WEBHOOK_SECRET: cleanEnv(process.env.RAZORPAY_WEBHOOK_SECRET),
    NODE_ENV: process.env.NODE_ENV || "development",
  });
}
