import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/security/session";
import {
  createFinanceAccount,
  createFinanceCategory,
  deleteFinanceCategory,
  listFinanceAccountsAndLedger,
  recordLedgerEntry,
} from "@/services/institute-finance.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_category"),
    name: z.string().trim().min(2).max(80),
    type: z.enum(["income", "expense"]),
    description: z.string().trim().max(200).optional(),
  }),
  z.object({
    action: z.literal("delete_category"),
    categoryId: z.string().min(1),
  }),
  z.object({
    action: z.literal("create_account"),
    name: z.string().trim().min(2).max(80),
    accountType: z.enum(["cash", "bank", "upi"]),
    openingBalanceRupees: z.coerce.number().min(0).optional(),
  }),
  z.object({
    action: z.literal("record_entry"),
    entryType: z.enum(["income", "expense", "transfer"]),
    date: z.string().min(8).max(20),
    categoryId: z.string().optional(),
    categoryName: z.string().optional(),
    description: z.string().trim().min(2).max(200),
    vendorOrPayee: z.string().trim().max(120).optional(),
    amountRupees: z.coerce.number().positive(),
    paymentMethod: z.enum(["cash", "upi", "bank_transfer", "card", "razorpay", "other"]),
    accountId: z.string().min(1),
    toAccountId: z.string().optional(),
    reference: z.string().trim().max(80).optional(),
  }),
]);

export async function GET() {
  try {
    const actor = await requireSessionUser();
    const data = await listFinanceAccountsAndLedger(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSessionUser();
    const body: unknown = await request.json().catch(() => null);
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid finance accounts payload."
      );
    }

    const d = parsed.data;
    if (d.action === "create_category") {
      const category = await createFinanceCategory(actor, d);
      return jsonOk({ category }, 201);
    }
    if (d.action === "delete_category") {
      await deleteFinanceCategory(actor, d.categoryId);
      return jsonOk({ deleted: true });
    }
    if (d.action === "create_account") {
      const account = await createFinanceAccount(actor, d);
      return jsonOk({ account }, 201);
    }
    const entry = await recordLedgerEntry(actor, d);
    return jsonOk({ entry }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
