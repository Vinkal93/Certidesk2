import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  listAttendanceRecords,
  markBatchAttendance,
} from "@/services/attendance.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const markAttendanceSchema = z.object({
  batchId: z.string().min(1),
  batchName: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(["present", "absent", "leave"]),
      })
    )
    .min(1),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    const { searchParams } = new URL(request.url);
    const records = await listAttendanceRecords(actor, {
      date: searchParams.get("date") ?? undefined,
      batchId: searchParams.get("batchId") ?? undefined,
      month: searchParams.get("month") ?? undefined,
    });
    return jsonOk({ records });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser("institute");
    const body: unknown = await request.json().catch(() => null);
    const parsed = markAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid attendance payload."
      );
    }
    const result = await markBatchAttendance(actor, parsed.data);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
