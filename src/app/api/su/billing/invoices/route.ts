import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRecentSuperAdminAuth, requireSessionUser } from "@/lib/security/session";
import {
  generateBillingInvoice,
  issueBillingCreditNote,
  listBillingInvoicesAndCreditNotes,
  recordInvoicePaymentReference,
} from "@/services/billing.service";
import { handleApiError, jsonError, jsonOk } from "@/lib/utils/api-response";

const invoicePostSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate"),
    instituteId: z.string().min(2),
    billingType: z.enum([
      "subscription",
      "service_fee",
      "wallet_settlement",
      "adjustment",
    ]),
    subscriptionId: z.string().nullable().optional(),
    dueDate: z.string().min(4),
    sellerLegalName: z.string().trim().min(2).max(120),
    sellerGstin: z.string().trim().max(32).nullable().optional(),
    customerGstin: z.string().trim().max(32).nullable().optional(),
    notes: z.string().trim().max(400).optional(),
    lineItems: z
      .array(
        z.object({
          description: z.string().trim().min(2).max(160),
          quantity: z.coerce.number().int().min(1),
          unitPriceRupees: z.coerce.number().min(0),
          taxRatePercent: z.coerce.number().min(0).max(50),
        })
      )
      .min(1),
  }),
  z.object({
    action: z.literal("record_payment"),
    invoiceId: z.string().min(2),
    paymentReference: z.string().trim().min(2).max(120),
  }),
  z.object({
    action: z.literal("credit_note"),
    invoiceId: z.string().min(2),
    amountRupees: z.coerce.number().positive(),
    reason: z.string().trim().min(3).max(300),
  }),
]);

export async function GET() {
  try {
    const actor = await requireSessionUser("super_admin");
    const data = await listBillingInvoicesAndCreditNotes(actor);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRecentSuperAdminAuth();
    const body: unknown = await request.json().catch(() => null);
    const parsed = invoicePostSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid invoice request."
      );
    }

    if (parsed.data.action === "generate") {
      const invoice = await generateBillingInvoice(actor, {
        instituteId: parsed.data.instituteId,
        billingType: parsed.data.billingType,
        subscriptionId: parsed.data.subscriptionId ?? null,
        dueDate: parsed.data.dueDate,
        sellerLegalName: parsed.data.sellerLegalName,
        sellerGstin: parsed.data.sellerGstin ?? null,
        customerGstin: parsed.data.customerGstin ?? null,
        notes: parsed.data.notes ?? "",
        lineItems: parsed.data.lineItems.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPricePaise: Math.round(l.unitPriceRupees * 100),
          taxRateBps: Math.round(l.taxRatePercent * 100),
        })),
      });
      return jsonOk({ invoice }, 201);
    }

    if (parsed.data.action === "record_payment") {
      const invoice = await recordInvoicePaymentReference(actor, {
        invoiceId: parsed.data.invoiceId,
        paymentReference: parsed.data.paymentReference,
      });
      return jsonOk({ invoice });
    }

    const creditNote = await issueBillingCreditNote(actor, {
      invoiceId: parsed.data.invoiceId,
      amountPaise: Math.round(parsed.data.amountRupees * 100),
      reason: parsed.data.reason,
    });
    return jsonOk({ creditNote }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
