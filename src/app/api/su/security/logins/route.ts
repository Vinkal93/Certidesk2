import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  addLoginEventInvestigationNote,
  listLoginActivity,
} from "@/services/security-center.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const noteSchema = z.object({
  eventId: z.string().min(2),
  note: z.string().trim().min(2).max(500),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const { searchParams } = new URL(request.url);
    const events = await listLoginActivity(actor, {
      result: searchParams.get("result") ?? "all",
      role: searchParams.get("role") ?? "all",
      instituteId: searchParams.get("instituteId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    return jsonOk({ events });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("super_admin");
    const body: unknown = await request.json().catch(() => null);
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Valid eventId and note are required.");
    }
    const event = await addLoginEventInvestigationNote(
      actor,
      parsed.data.eventId,
      parsed.data.note
    );
    return jsonOk({ event });
  } catch (error) {
    return handleApiError(error);
  }
}
