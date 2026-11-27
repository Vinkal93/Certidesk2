import { NextRequest, NextResponse } from "next/server";
import { billingInvoicesCollection } from "@/lib/firebase/firestore";
import { requireSessionUser } from "@/lib/security/session";
import { renderInvoicePrintableHtml } from "@/services/billing.service";
import { handleApiError, jsonError } from "@/lib/utils/api-response";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireSessionUser("super_admin");
    const { id } = await context.params;
    const snap = await billingInvoicesCollection().doc(id).get();
    const inv = snap.data();
    if (!snap.exists || !inv) {
      return jsonError(404, "INVOICE_NOT_FOUND", "Invoice not found.");
    }

    const html = renderInvoicePrintableHtml(inv);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${inv.invoiceNumber}.html"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
