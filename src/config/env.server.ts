import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1).default("certidesk2-deb79"),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
  GCP_PROJECT_ID: z.string().min(1).default("certidesk2-deb79"),
  GCP_SECRET_MANAGER_CLIENT_EMAIL: z.string().email().optional(),
  GCP_SECRET_MANAGER_PRIVATE_KEY: z.string().min(1).optional(),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
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
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const normalizedPrivateKey = rawPrivateKey
    ? rawPrivateKey.replace(/\\n/g, "\n")
    : undefined;

  const rawGcpKey = process.env.GCP_SECRET_MANAGER_PRIVATE_KEY;
  const normalizedGcpKey = rawGcpKey ? rawGcpKey.replace(/\\n/g, "\n") : undefined;

  return serverEnvSchema.parse({
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "certidesk2-deb79",
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || undefined,
    FIREBASE_PRIVATE_KEY: normalizedPrivateKey,
    GCP_PROJECT_ID:
      process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "certidesk2-deb79",
    GCP_SECRET_MANAGER_CLIENT_EMAIL:
      process.env.GCP_SECRET_MANAGER_CLIENT_EMAIL || undefined,
    GCP_SECRET_MANAGER_PRIVATE_KEY: normalizedGcpKey,
    APP_BASE_URL:
      process.env.APP_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000",
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME || "cd_session",
    SESSION_EXPIRES_IN_DAYS: process.env.SESSION_EXPIRES_IN_DAYS || 5,
    SUPER_ADMIN_EMAILS: process.env.SUPER_ADMIN_EMAILS || undefined,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || undefined,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || undefined,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || undefined,
    NODE_ENV: process.env.NODE_ENV || "development",
  });
}
