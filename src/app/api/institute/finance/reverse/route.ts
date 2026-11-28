import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import { cancelInstituteReceipt } from "@/services/institute-finance.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const reverseSchema = z.object({
  receiptId: z.string().min(1),
  reason: z.string().trim().min(4, "Provide a reversal reason.").max(300),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser();
    const body: unknown = await request.json().catch(() => null);
    const parsed = reverseSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid reversal payload."
      );
    }
    const result = await cancelInstituteReceipt(actor, parsed.data);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
