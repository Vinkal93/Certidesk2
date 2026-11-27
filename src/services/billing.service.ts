import "server-only";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  billingInvoicesCollection,
  creditNotesCollection,
  institutesCollection,
  planVersionsCollection,
  pricingRulesCollection,
} from "@/lib/firebase/firestore";
import { AuthError } from "@/lib/security/session";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import { getEffectivePlatformPricing } from "./su-platform.service";
import type { SessionUser } from "@/types/auth";
import type {
  BillingCreditNoteRecord,
  BillingInvoiceLineItem,
  BillingInvoiceRecord,
  BillingPricingRuleRecord,
  PlanVersionRecord,
} from "@/types/billing";

function assertSuperAdmin(actor: SessionUser) {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Super Admin authorization required.");
  }
}

export const FEATURE_REGISTRY = [
  { key: "students.read", module: "Students", label: "View Student Directory" },
  { key: "students.create", module: "Students", label: "Admit New Students" },
  { key: "students.update", module: "Students", label: "Update Student Profiles" },
  { key: "staff.manage", module: "Staff", label: "Manage Staff & Permissions" },
  { key: "courses.manage", module: "Academics", label: "Create & Edit Courses" },
  { key: "attendance.manage", module: "Academics", label: "Record & Export Attendance" },
  { key: "examinations.manage", module: "Exams", label: "Create & Schedule Exams" },
  { key: "examinations.publish", module: "Exams", label: "Publish Exam Results" },
  { key: "marksheets.generate", module: "Marksheets", label: "Generate Marksheets" },
  {
    key: "marksheets.bulk_export",
    module: "Marksheets",
    label: "Bulk Export Marksheets",
  },
  { key: "certificates.generate", module: "Certificates", label: "Issue Certificates" },
  {
    key: "certificates.bulk_export",
    module: "Certificates",
    label: "Bulk Export Certificates",
  },
  { key: "reports.advanced", module: "Reports", label: "Advanced Analytics & Reports" },
  { key: "api.access", module: "Platform", label: "REST API Access" },
  { key: "branding.customize", module: "Branding", label: "Custom Institute Branding" },
  { key: "storage.upload", module: "Storage", label: "Document & Photo Uploads" },
] as const;

/**
 * Pure helper to compute line-item & invoice totals in integer paise.
 * Exported for unit testing.
 */
export function computeInvoiceTotals(
  items: Array<{
    description: string;
    quantity: number;
    unitPricePaise: number;
    taxRateBps: number;
  }>
): {
  lineItems: BillingInvoiceLineItem[];
  taxableAmountPaise: number;
  taxAmountPaise: number;
  totalAmountPaise: number;
} {
  let taxableAmountPaise = 0;
  let taxAmountPaise = 0;
  const lineItems: BillingInvoiceLineItem[] = items.map((item) => {
    const qty = Math.max(1, Math.trunc(item.quantity));
    const unitPricePaise = Math.max(0, Math.trunc(item.unitPricePaise));
    const taxRateBps = Math.max(0, Math.trunc(item.taxRateBps));
    const taxablePaise = qty * unitPricePaise;
    const taxPaise = Math.round((taxablePaise * taxRateBps) / 10000);
    const totalPaise = taxablePaise + taxPaise;

    taxableAmountPaise += taxablePaise;
    taxAmountPaise += taxPaise;

    return {
      description: item.description.trim(),
      quantity: qty,
      unitPricePaise,
      taxRateBps,
      taxablePaise,
      taxPaise,
      totalPaise,
    };
  });

  return {
    lineItems,
    taxableAmountPaise,
    taxAmountPaise,
    totalAmountPaise: taxableAmountPaise + taxAmountPaise,
  };
}

/**
 * Pure helper for effective service price resolution.
 * Precedence: Institute Override > Plan-Specific Rule > Global Rule > Fallback.
 * Exported for unit testing.
 */
export function resolveEffectiveRule(params: {
  rules: BillingPricingRuleRecord[];
  serviceKey: BillingPricingRuleRecord["serviceKey"];
  planId?: string | null;
  instituteId?: string | null;
  quantity?: number;
  nowIso?: string;
}): BillingPricingRuleRecord | null {
  const nowMs = params.nowIso ? Date.parse(params.nowIso) : Date.now();
  const qty = params.quantity ?? 1;

  const eligible = params.rules.filter((r) => {
    if (r.serviceKey !== params.serviceKey) return false;
    if (r.status !== "active") return false;
    if (Date.parse(r.effectiveStart) > nowMs) return false;
    if (r.effectiveEnd && Date.parse(r.effectiveEnd) < nowMs) return false;
    if (qty < r.minQty) return false;
    if (r.maxQty !== null && qty > r.maxQty) return false;
    return true;
  });

  const instituteMatch = params.instituteId
    ? eligible.find((r) => r.applicableInstituteId === params.instituteId)
    : undefined;
  if (instituteMatch) return instituteMatch;

  const planMatch = params.planId
    ? eligible.find(
        (r) => !r.applicableInstituteId && r.applicablePlanId === params.planId
      )
    : undefined;
  if (planMatch) return planMatch;

  return eligible.find((r) => !r.applicableInstituteId && !r.applicablePlanId) ?? null;
}

// ─── PLAN VERSIONING ─────────────────────────────────────────────────────────

export async function listPlanVersions(actor: SessionUser): Promise<PlanVersionRecord[]> {
  assertSuperAdmin(actor);
  const snap = await planVersionsCollection().get();
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createOrPublishPlanVersion(
  actor: SessionUser,
  input: Omit<PlanVersionRecord, "id" | "version" | "createdAt" | "createdByUid">
): Promise<PlanVersionRecord> {
  assertSuperAdmin(actor);
  const existingSnap = await planVersionsCollection()
    .where("planCode", "==", input.planCode.trim().toUpperCase())
    .get();
  const existingVersions = existingSnap.docs.map((d) => d.data());
  const nextVersion =
    existingVersions.length > 0
      ? Math.max(...existingVersions.map((v) => v.version)) + 1
      : 1;

  const now = new Date().toISOString();
  const id = `${input.planCode.trim().toUpperCase()}_V${nextVersion}`;
  const record: PlanVersionRecord = {
    ...input,
    id,
    planCode: input.planCode.trim().toUpperCase(),
    version: nextVersion,
    createdAt: now,
    createdByUid: actor.uid,
  };

  await planVersionsCollection().doc(id).set(record);

  await recordAuditLog({
    action: "SUBSCRIPTION_ASSIGNED",
    actorUid: actor.uid,
    actorRole: actor.role,
    resourceType: "plan_version",
    targetId: id,
    reason: `Created plan version ${id} (${record.status})`,
    metadata: {
      planCode: record.planCode,
      version: record.version,
      pricePaise: record.pricePaise,
      status: record.status,
    },
  });

  return record;
}

export async function updatePlanVersionStatus(
  actor: SessionUser,
  versionId: string,
  status: "active" | "retired"
): Promise<PlanVersionRecord> {
  assertSuperAdmin(actor);
  const ref = planVersionsCollection().doc(versionId);
  const snap = await ref.get();
  const existing = snap.data();
  if (!snap.exists || !existing) {
    throw new AuthError(404, "PLAN_VERSION_NOT_FOUND", "Plan version not found.");
  }
  await ref.update({ status });
  await recordAuditLog({
    action: "FEATURE_FLAG_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    resourceType: "plan_version",
    targetId: versionId,
    reason: `Changed plan version status to ${status}`,
    metadata: { status },
  });
  return { ...existing, status };
}

// ─── PRICING RULES ───────────────────────────────────────────────────────────

export async function listPricingRules(
  actor: SessionUser
): Promise<BillingPricingRuleRecord[]> {
  assertSuperAdmin(actor);
  const snap = await pricingRulesCollection().get();
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function upsertPricingRule(
  actor: SessionUser,
  input: Omit<
    BillingPricingRuleRecord,
    "id" | "createdAt" | "updatedAt" | "updatedByUid"
  > & { id?: string | undefined }
): Promise<BillingPricingRuleRecord> {
  assertSuperAdmin(actor);
  if (!input.reason.trim()) {
    throw new AuthError(400, "REASON_REQUIRED", "Pricing change reason is required.");
  }
  if (!Number.isInteger(input.amountPaise) || input.amountPaise < 0) {
    throw new AuthError(
      400,
      "INVALID_AMOUNT",
      "Amount must be non-negative integer paise."
    );
  }
  const id = input.id?.trim() || generateId("PRC");
  const ref = pricingRulesCollection().doc(id);
  const existing = (await ref.get()).data();
  const now = new Date().toISOString();

  const record: BillingPricingRuleRecord = {
    ...input,
    id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    updatedByUid: actor.uid,
  };
  await ref.set(record);

  await recordAuditLog({
    action: "PRICING_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: record.applicableInstituteId,
    resourceType: "pricing_rule",
    targetId: id,
    reason: record.reason,
    metadata: {
      serviceKey: record.serviceKey,
      amountPaise: record.amountPaise,
      status: record.status,
    },
  });

  return record;
}

export async function resolveEffectiveServicePrice(params: {
  serviceKey: BillingPricingRuleRecord["serviceKey"];
  planId?: string | null;
  instituteId?: string | null;
  quantity?: number;
}): Promise<{
  amountPaise: number;
  ruleId: string;
  source: "rule" | "platform_default";
}> {
  const snap = await pricingRulesCollection().get();
  const rules = snap.docs.map((d) => d.data());
  const matched = resolveEffectiveRule({
    rules,
    serviceKey: params.serviceKey,
    planId: params.planId ?? null,
    instituteId: params.instituteId ?? null,
    quantity: params.quantity ?? 1,
  });
  if (matched) {
    return {
      amountPaise: matched.amountPaise,
      ruleId: matched.id,
      source: "rule",
    };
  }

  const fallback = await getEffectivePlatformPricing();
  const map: Record<string, number> = {
    student_admission: fallback.admissionFeePaise,
    profile_edit: fallback.profileUpdateFeePaise,
    certificate_issue: fallback.certificateFeePaise,
    marksheet_issue: 0,
    custom: 0,
  };
  return {
    amountPaise: map[params.serviceKey] ?? 0,
    ruleId: "platform_default",
    source: "platform_default",
  };
}

// ─── INVOICES & CREDIT NOTES ─────────────────────────────────────────────────

export async function listBillingInvoicesAndCreditNotes(actor: SessionUser) {
  assertSuperAdmin(actor);
  const [invSnap, cnSnap] = await Promise.all([
    billingInvoicesCollection().get(),
    creditNotesCollection().get(),
  ]);
  const invoices = invSnap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const creditNotes = cnSnap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { invoices, creditNotes };
}

export async function generateBillingInvoice(
  actor: SessionUser,
  input: {
    instituteId: string;
    billingType: BillingInvoiceRecord["billingType"];
    subscriptionId?: string | null;
    dueDate: string;
    sellerLegalName: string;
    sellerGstin?: string | null;
    customerGstin?: string | null;
    notes?: string;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPricePaise: number;
      taxRateBps: number;
    }>;
  }
): Promise<BillingInvoiceRecord> {
  assertSuperAdmin(actor);
  if (input.lineItems.length === 0) {
    throw new AuthError(400, "EMPTY_INVOICE", "At least one line item is required.");
  }

  const instSnap = await institutesCollection().doc(input.instituteId).get();
  const institute = instSnap.data();
  if (!instSnap.exists || !institute) {
    throw new AuthError(404, "INSTITUTE_NOT_FOUND", "Institute not found.");
  }

  const totals = computeInvoiceTotals(input.lineItems);
  const db = getAdminFirestore();
  const seqRef = db.collection("platform_config").doc("invoice_sequence");
  const now = new Date().toISOString();
  const year = now.slice(0, 4);
  const invoiceId = generateId("BINV");

  const invoiceNumber = await db.runTransaction(async (tx) => {
    const seqSnap = await tx.get(seqRef);
    const currentSeq = Number(seqSnap.data()?.seq ?? 0) + 1;
    tx.set(seqRef, { seq: currentSeq, updatedAt: now }, { merge: true });
    return `INV-${year}-${String(currentSeq).padStart(6, "0")}`;
  });

  const record: BillingInvoiceRecord = {
    id: invoiceId,
    invoiceNumber,
    instituteId: institute.id,
    instituteName: institute.name,
    billingAddress: institute.address,
    customerGstin: input.customerGstin?.trim() || null,
    sellerLegalName: input.sellerLegalName.trim(),
    sellerGstin: input.sellerGstin?.trim() || null,
    billingType: input.billingType,
    subscriptionId: input.subscriptionId ?? null,
    issueDate: now.slice(0, 10),
    dueDate: input.dueDate,
    lineItems: totals.lineItems,
    taxableAmountPaise: totals.taxableAmountPaise,
    taxAmountPaise: totals.taxAmountPaise,
    totalAmountPaise: totals.totalAmountPaise,
    currency: "INR",
    status: "issued",
    paymentReference: null,
    notes: input.notes?.trim() ?? "",
    createdByUid: actor.uid,
    createdAt: now,
    updatedAt: now,
  };

  await billingInvoicesCollection().doc(invoiceId).set(record);

  await recordAuditLog({
    action: "INSTITUTE_UPDATED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: institute.id,
    resourceType: "billing_invoice",
    targetId: invoiceId,
    reason: `Generated invoice ${invoiceNumber}`,
    metadata: {
      invoiceNumber,
      totalAmountPaise: record.totalAmountPaise,
      billingType: record.billingType,
    },
  });

  return record;
}

export async function recordInvoicePaymentReference(
  actor: SessionUser,
  input: { invoiceId: string; paymentReference: string }
): Promise<BillingInvoiceRecord> {
  assertSuperAdmin(actor);
  if (!input.paymentReference.trim()) {
    throw new AuthError(400, "REFERENCE_REQUIRED", "Payment reference is required.");
  }
  const ref = billingInvoicesCollection().doc(input.invoiceId);
  const snap = await ref.get();
  const inv = snap.data();
  if (!snap.exists || !inv) {
    throw new AuthError(404, "INVOICE_NOT_FOUND", "Invoice not found.");
  }
  if (inv.status === "cancelled" || inv.status === "credited") {
    throw new AuthError(
      400,
      "INVOICE_LOCKED",
      `Cannot mark ${inv.status} invoice as paid.`
    );
  }
  const now = new Date().toISOString();
  await ref.update({
    status: "paid",
    paymentReference: input.paymentReference.trim(),
    updatedAt: now,
  });

  await recordAuditLog({
    action: "WALLET_CREDITED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: inv.instituteId,
    resourceType: "billing_invoice",
    targetId: inv.id,
    reason: `Recorded payment reference ${input.paymentReference.trim()}`,
  });

  return {
    ...inv,
    status: "paid",
    paymentReference: input.paymentReference.trim(),
    updatedAt: now,
  };
}

export async function issueBillingCreditNote(
  actor: SessionUser,
  input: { invoiceId: string; amountPaise: number; reason: string }
): Promise<BillingCreditNoteRecord> {
  assertSuperAdmin(actor);
  if (!input.reason.trim()) {
    throw new AuthError(400, "REASON_REQUIRED", "Credit note reason is required.");
  }
  const invRef = billingInvoicesCollection().doc(input.invoiceId);
  const invSnap = await invRef.get();
  const inv = invSnap.data();
  if (!invSnap.exists || !inv) {
    throw new AuthError(404, "INVOICE_NOT_FOUND", "Invoice not found.");
  }
  if (input.amountPaise <= 0 || input.amountPaise > inv.totalAmountPaise) {
    throw new AuthError(
      400,
      "INVALID_CREDIT_AMOUNT",
      "Credit note amount must be between ₹0.01 and invoice total."
    );
  }

  const db = getAdminFirestore();
  const seqRef = db.collection("platform_config").doc("credit_note_sequence");
  const now = new Date().toISOString();
  const year = now.slice(0, 4);
  const cnId = generateId("CN");

  const creditNoteNumber = await db.runTransaction(async (tx) => {
    const seqSnap = await tx.get(seqRef);
    const seq = Number(seqSnap.data()?.seq ?? 0) + 1;
    tx.set(seqRef, { seq, updatedAt: now }, { merge: true });
    return `CN-${year}-${String(seq).padStart(6, "0")}`;
  });

  const cn: BillingCreditNoteRecord = {
    id: cnId,
    creditNoteNumber,
    invoiceId: inv.id,
    invoiceNumber: inv.invoiceNumber,
    instituteId: inv.instituteId,
    amountPaise: input.amountPaise,
    reason: input.reason.trim(),
    status: "issued",
    createdByUid: actor.uid,
    createdAt: now,
  };

  await creditNotesCollection().doc(cnId).set(cn);
  await invRef.update({ status: "credited", updatedAt: now });

  await recordAuditLog({
    action: "PAYMENT_REFUNDED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: inv.instituteId,
    resourceType: "credit_note",
    targetId: cnId,
    reason: input.reason.trim(),
    metadata: { invoiceNumber: inv.invoiceNumber, amountPaise: input.amountPaise },
  });

  return cn;
}

export function renderInvoicePrintableHtml(inv: BillingInvoiceRecord): string {
  const rows = inv.lineItems
    .map(
      (item) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">${item.description}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">₹${(item.unitPricePaise / 100).toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${(item.taxRateBps / 100).toFixed(2)}%</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">₹${(item.totalPaise / 100).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${inv.invoiceNumber}</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:800px;margin:40px auto;color:#0f172a">
  <div style="display:flex;justify-content:space-between;border-bottom:2px solid #0f172a;padding-bottom:16px">
    <div>
      <h1 style="margin:0;font-size:22px">${inv.sellerLegalName}</h1>
      ${inv.sellerGstin ? `<p style="margin:4px 0;font-size:12px;color:#475569">GSTIN: ${inv.sellerGstin}</p>` : ""}
    </div>
    <div style="text-align:right">
      <h2 style="margin:0;font-size:18px">TAX INVOICE</h2>
      <p style="margin:4px 0;font-size:13px;font-family:monospace">${inv.invoiceNumber}</p>
      <p style="margin:2px 0;font-size:12px;color:#475569">Issue: ${inv.issueDate} | Due: ${inv.dueDate}</p>
    </div>
  </div>
  <div style="margin:20px 0;font-size:13px">
    <strong>Billed To:</strong> ${inv.instituteName} (${inv.instituteId})<br/>
    <span>${inv.billingAddress}</span>
    ${inv.customerGstin ? `<br/><span>Customer GSTIN: ${inv.customerGstin}</span>` : ""}
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px">
    <thead>
      <tr style="background:#f8fafc;text-align:left">
        <th style="padding:8px;border-bottom:1px solid #cbd5e1">Description</th>
        <th style="padding:8px;border-bottom:1px solid #cbd5e1;text-align:right">Qty</th>
        <th style="padding:8px;border-bottom:1px solid #cbd5e1;text-align:right">Unit Price</th>
        <th style="padding:8px;border-bottom:1px solid #cbd5e1;text-align:right">Tax</th>
        <th style="padding:8px;border-bottom:1px solid #cbd5e1;text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="margin-top:20px;text-align:right;font-size:14px">
    <p>Taxable: ₹${(inv.taxableAmountPaise / 100).toFixed(2)}</p>
    <p>Tax: ₹${(inv.taxAmountPaise / 100).toFixed(2)}</p>
    <p style="font-size:18px;font-weight:bold">Total: ₹${(inv.totalAmountPaise / 100).toFixed(2)} (${inv.status.toUpperCase()})</p>
  </div>
</body>
</html>`;
}
