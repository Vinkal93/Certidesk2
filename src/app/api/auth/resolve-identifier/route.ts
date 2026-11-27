import { NextRequest } from "next/server";
import { resolveLoginIdentifierSchema } from "@/lib/validation/auth";
import { resolvePortalLoginIdentifier } from "@/services/auth.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 25;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkResolveRateLimit(ip: string): boolean {
  const now = Date.now();
  const current = rateBuckets.get(ip);
  if (!current || now > current.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_ATTEMPTS_PER_WINDOW) {
    return false;
  }
  current.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!checkResolveRateLimit(ip)) {
      return jsonError(
        429,
        "RATE_LIMITED",
        "Too many login lookup attempts. Please wait a few minutes."
      );
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = resolveLoginIdentifierSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid login identifier."
      );
    }

    const result = await resolvePortalLoginIdentifier(
      parsed.data.portal,
      parsed.data.identifier
    );
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
