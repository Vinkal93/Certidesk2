import { z } from "zod";

function cleanClientEnv(value: string | undefined): string | undefined {
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

const clientEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1).default("certidesk2-deb79"),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY: z.string().optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export function getClientEnv(): ClientEnv {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_FIREBASE_API_KEY: cleanClientEnv(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    ),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: cleanClientEnv(
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    ),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      cleanClientEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) || "certidesk2-deb79",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: cleanClientEnv(
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    ),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: cleanClientEnv(
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    ),
    NEXT_PUBLIC_FIREBASE_APP_ID: cleanClientEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: cleanClientEnv(
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    ),
    NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY: cleanClientEnv(
      process.env.NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY
    ),
  });
}
