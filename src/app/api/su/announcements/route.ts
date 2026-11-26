import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  createPlatformAnnouncement,
  listPlatformAnnouncements,
} from "@/services/su-platform.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const announcementSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(5).max(1500),
  targetScope: z.enum(["all", "selected"]).default("all"),
  targetInstituteIds: z.array(z.string()).default([]),
  status: z.enum(["draft", "published", "scheduled"]).default("published"),
  publishAt: z.string().default(() => new Date().toISOString()),
  expiresAt: z.string().nullable().default(null),
});

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const announcements = await listPlatformAnnouncements(actor);
    return jsonOk({ announcements });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const body: unknown = await request.json().catch(() => null);
    const parsed = announcementSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid announcement payload."
      );
    }
    const announcement = await createPlatformAnnouncement(actor, parsed.data);
    return jsonOk({ announcement }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
