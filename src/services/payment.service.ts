import "server-only";
import { createHash } from "crypto";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  paymentGatewayConfigCollection,
  paymentOrdersCollection,
  webhookEventsCollection,
} from "@/lib/firebase/firestore";
import {
  computeHmacSha256Hex,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from "@/lib/security/razorpay";
import { AuthError } from "@/lib/security/session";
import { resolveAuthorizedInstitute } from "@/lib/security/tenant";
import { hasStaffPermission } from "@/lib/security/permissions";
import { generateId } from "@/lib/utils/ids";
import {
  getActiveRazorpayClientForWallet,
  getEnvironmentWebhookSecret,
  getRazorpayClientForEnvironment,
  getRazorpayGatewayConfig,
} from "./gateway.service";
import { creditInstituteWalletIdempotent } from "./wallet.service";
import { recordAuditLog } from "./audit.service";
import type { SessionUser } from "@/types/auth";
import type {
  GatewayEnvironment,
  PaymentOrderRecord,
  WebhookEventRecord,
} from "@/types/payment";

const GATEWAY_DOC_ID = "razorpay";

export async function createWalletRechargeOrder(
  actor: SessionUser,
  amountRupees: number
): Promise<{
  orderId: string;
  internalPaymentId: string;
  environment: GatewayEnvironment;
  amountPaise: number;
  currency: "INR";
  keyId: string;
}> {
  if (actor.role !== "institute_admin") {
    throw new AuthError(
      403,
      "FORBIDDEN",
      "Only Institute Admin can initiate wallet recharges."
    );
  }

  const institute = await resolveAuthorizedInstitute(actor);
  const amountPaise = Math.round(amountRupees * 100);
  if (!Number.isInteger(amountPaise) || amountPaise < 10000 || amountPaise > 10000000) {
    throw new AuthError(
      400,
      "INVALID_RECHARGE_AMOUNT",
      "Recharge amount must be between ₹100 and ₹1,00,000."
    );
  }

  const { environment, keyId, client } = await getActiveRazorpayClientForWallet();
  const internalPaymentId = generateId("PAY");

  const rzpOrder = await client.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: internalPaymentId,
    notes: {
      instituteId: institute.id,
      actorUid: actor.uid,
      environment,
      internalPaymentId,
    },
  });

  const now = new Date().toISOString();
  await paymentOrdersCollection().doc(rzpOrder.id).set({
    orderId: rzpOrder.id,
    internalPaymentId,
    environment,
    instituteId: institute.id,
    actorUid: actor.uid,
    amountPaise,
    refundedAmountPaise: 0,
    currency: "INR",
    status: "created",
    razorpayPaymentId: null,
    webhookConfirmed: false,
    failureReason: null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    orderId: rzpOrder.id,
    internalPaymentId,
    environment,
    amountPaise,
    currency: "INR",
    keyId,
  };
}

export async function verifyAndCreditCheckoutPayment(
  actor: SessionUser,
  input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }
): Promise<{ alreadyProcessed: boolean; balanceAfterPaise: number; status: string }> {
  if (actor.role !== "institute_admin" && !hasStaffPermission(actor, "wallet:read")) {
    throw new AuthError(403, "FORBIDDEN", "Unauthorized.");
  }

  const institute = await resolveAuthorizedInstitute(actor);
  const orderRef = paymentOrdersCollection().doc(input.razorpayOrderId);
  const orderSnap = await orderRef.get();
  const order = orderSnap.data();

  if (!orderSnap.exists || !order || order.instituteId !== institute.id) {
    throw new AuthError(404, "ORDER_NOT_FOUND", "Payment order not found.");
  }

  const { keySecret, client } = await getRazorpayClientForEnvironment(order.environment);

  const isValid = verifyRazorpayCheckoutSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
    keySecret,
  });

  if (!isValid) {
    throw new AuthError(
      400,
      "INVALID_PAYMENT_SIGNATURE",
      "Payment signature verification failed."
    );
  }

  // Fetch authoritative payment state from Razorpay API
  const rzpPayment = await client.payments.fetch(input.razorpayPaymentId);

  if (rzpPayment.order_id !== order.orderId) {
    throw new AuthError(400, "ORDER_MISMATCH", "Payment does not match order.");
  }
  if (Number(rzpPayment.amount) !== order.amountPaise) {
    throw new AuthError(400, "AMOUNT_MISMATCH", "Payment amount mismatch detected.");
  }
  if (rzpPayment.currency !== order.currency) {
    throw new AuthError(400, "CURRENCY_MISMATCH", "Payment currency mismatch detected.");
  }

  const now = new Date().toISOString();

  if (rzpPayment.status === "authorized") {
    await orderRef.update({
      status: "authorized",
      razorpayPaymentId: input.razorpayPaymentId,
      updatedAt: now,
    });
    throw new AuthError(
      409,
      "PAYMENT_NOT_CAPTURED",
      "Payment is authorized but not yet captured. Wallet will credit once captured."
    );
  }

  if (rzpPayment.status !== "captured") {
    await orderRef.update({
      status: "failed",
      razorpayPaymentId: input.razorpayPaymentId,
      failureReason: `Razorpay status: ${rzpPayment.status}`,
      updatedAt: now,
    });
    throw new AuthError(
      400,
      "PAYMENT_NOT_CAPTURED",
      `Payment not captured (status: ${rzpPayment.status}).`
    );
  }

  const creditResult = await creditInstituteWalletIdempotent({
    instituteId: institute.id,
    amountPaise: order.amountPaise,
    idempotencyDocId: `RZP_${input.razorpayPaymentId}`,
    reason: "razorpay_recharge",
    referenceId: input.razorpayPaymentId,
    actorUid: actor.uid,
    note: `Razorpay ${order.environment.toUpperCase()} wallet recharge (${order.orderId})`,
  });

  await orderRef.update({
    status: "captured",
    razorpayPaymentId: input.razorpayPaymentId,
    updatedAt: now,
  });

  return { ...creditResult, status: "captured" };
}

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
        status?: string;
        error_description?: string;
      };
    };
    refund?: {
      entity?: {
        id?: string;
        payment_id?: string;
        amount?: number;
      };
    };
  };
}

export async function processEnvironmentWebhook(params: {
  environment: GatewayEnvironment;
  rawBody: string;
  signature: string | null;
  eventIdHeader?: string | null;
}): Promise<{
  processed: boolean;
  duplicate: boolean;
  event: string;
}> {
  const webhookSecret = await getEnvironmentWebhookSecret(params.environment);
  const now = new Date().toISOString();

  // 1. Validate signature strictly against RAW request body BEFORE JSON.parse
  if (
    !params.signature ||
    !verifyRazorpayWebhookSignature({
      rawBody: params.rawBody,
      signature: params.signature,
      webhookSecret,
    })
  ) {
    const rejId = generateId("WHK_REJ");
    await webhookEventsCollection()
      .doc(rejId)
      .set({
        id: rejId,
        eventId: params.eventIdHeader || rejId,
        eventType: "signature_invalid",
        environment: params.environment,
        paymentId: null,
        orderId: null,
        status: "rejected",
        failureReason: "Invalid X-Razorpay-Signature",
        receivedAt: now,
        processedAt: null,
      });
    throw new AuthError(401, "INVALID_WEBHOOK_SIGNATURE", "Invalid webhook signature.");
  }

  // 2. Parse payload safely after signature validation
  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(params.rawBody) as RazorpayWebhookPayload;
  } catch {
    throw new AuthError(400, "INVALID_JSON", "Malformed webhook JSON body.");
  }

  const event = payload.event ?? "unknown";
  const payment = payload.payload?.payment?.entity;
  const refund = payload.payload?.refund?.entity;

  const eventHash = createHash("sha256")
    .update(params.rawBody)
    .digest("hex")
    .slice(0, 16);
  const eventId = params.eventIdHeader?.trim() || `${event}_${eventHash}`;
  const eventDocId = `${params.environment}_${eventId}`;
  const db = getAdminFirestore();

  // 3. Idempotent event recording via Firestore transaction
  const eventRef = webhookEventsCollection().doc(eventDocId);
  const alreadyProcessed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(eventRef);
    const existing = snap.data();
    if (snap.exists && existing && existing.status === "processed") {
      return true;
    }

    tx.set(eventRef, {
      id: eventDocId,
      eventId,
      eventType: event,
      environment: params.environment,
      paymentId: payment?.id ?? refund?.payment_id ?? null,
      orderId: payment?.order_id ?? null,
      status: "received",
      failureReason: null,
      receivedAt: now,
      processedAt: null,
    });
    return false;
  });

  if (alreadyProcessed) {
    return { processed: false, duplicate: true, event };
  }

  // Mark webhook verified for this environment upon receiving any valid signed event
  const gatewayRef = paymentGatewayConfigCollection().doc(GATEWAY_DOC_ID);
  const gatewayPatch: Record<string, unknown> = {
    lastPaymentEventAt: now,
    updatedAt: now,
  };
  if (params.environment === "test") {
    gatewayPatch.testWebhookVerified = true;
    gatewayPatch.lastTestWebhookAt = now;
  } else {
    gatewayPatch.liveWebhookVerified = true;
    gatewayPatch.lastLiveWebhookAt = now;
  }
  await gatewayRef.set(gatewayPatch, { merge: true });

  // Handle diagnostic ping events gracefully
  if (event === "ping" || event === "webhook.test") {
    await eventRef.update({ status: "processed", processedAt: new Date().toISOString() });
    return { processed: true, duplicate: false, event };
  }

  try {
    if (event === "refund.processed" && refund?.payment_id) {
      const snap = await paymentOrdersCollection()
        .where("razorpayPaymentId", "==", refund.payment_id)
        .limit(1)
        .get();
      const orderDoc = snap.docs[0];
      if (orderDoc) {
        const order = orderDoc.data();
        if (order.environment !== params.environment) {
          throw new AuthError(
            400,
            "ENVIRONMENT_MISMATCH",
            "Refund event environment mismatch."
          );
        }
        const nextRefunded = order.refundedAmountPaise + Number(refund.amount ?? 0);
        await orderDoc.ref.update({
          refundedAmountPaise: nextRefunded,
          status: nextRefunded >= order.amountPaise ? "refunded" : order.status,
          updatedAt: new Date().toISOString(),
        });
        await recordAuditLog({
          action: "PAYMENT_REFUNDED",
          actorUid: "system",
          actorRole: "system",
          instituteId: order.instituteId,
          targetId: order.orderId,
          metadata: {
            refundId: refund.id ?? null,
            amountPaise: Number(refund.amount ?? 0),
          },
        });
      }
      await eventRef.update({
        status: "processed",
        processedAt: new Date().toISOString(),
      });
      return { processed: true, duplicate: false, event };
    }

    if (!payment?.order_id || !payment.id) {
      await eventRef.update({
        status: "processed",
        processedAt: new Date().toISOString(),
      });
      return { processed: false, duplicate: false, event };
    }

    const orderRef = paymentOrdersCollection().doc(payment.order_id);
    const orderSnap = await orderRef.get();
    const order = orderSnap.data();

    if (!orderSnap.exists || !order) {
      await eventRef.update({
        status: "failed",
        failureReason: "Matching payment order not found",
        processedAt: new Date().toISOString(),
      });
      return { processed: false, duplicate: false, event };
    }

    // Enforce strict Test vs Live isolation
    if (order.environment !== params.environment) {
      await eventRef.update({
        status: "rejected",
        failureReason: `Environment mismatch: order is ${order.environment}, webhook hit ${params.environment}`,
        processedAt: new Date().toISOString(),
      });
      throw new AuthError(
        400,
        "ENVIRONMENT_MISMATCH",
        "Payment order environment does not match webhook endpoint."
      );
    }

    if (event === "payment.authorized") {
      if (order.status === "created") {
        await orderRef.update({
          status: "authorized",
          razorpayPaymentId: payment.id,
          updatedAt: new Date().toISOString(),
        });
      }
      await eventRef.update({
        status: "processed",
        processedAt: new Date().toISOString(),
      });
      return { processed: true, duplicate: false, event };
    }

    if (event === "payment.captured") {
      if (Number(payment.amount) !== order.amountPaise) {
        throw new AuthError(400, "AMOUNT_MISMATCH", "Webhook payment amount mismatch.");
      }
      if (payment.currency && payment.currency !== order.currency) {
        throw new AuthError(400, "CURRENCY_MISMATCH", "Webhook currency mismatch.");
      }

      await creditInstituteWalletIdempotent({
        instituteId: order.instituteId,
        amountPaise: order.amountPaise,
        idempotencyDocId: `RZP_${payment.id}`,
        reason: "razorpay_recharge",
        referenceId: payment.id,
        actorUid: order.actorUid,
        note: `Razorpay ${params.environment.toUpperCase()} webhook capture (${order.orderId})`,
      });

      await orderRef.update({
        status: "captured",
        razorpayPaymentId: payment.id,
        webhookConfirmed: true,
        updatedAt: new Date().toISOString(),
      });

      await gatewayRef.set(
        params.environment === "test"
          ? { testPaymentFlowVerified: true }
          : { livePaymentFlowVerified: true },
        { merge: true }
      );

      await eventRef.update({
        status: "processed",
        processedAt: new Date().toISOString(),
      });
      return { processed: true, duplicate: false, event };
    }

    if (event === "payment.failed") {
      // Event ordering safety: never downgrade an already captured or refunded order
      if (order.status !== "captured" && order.status !== "refunded") {
        await orderRef.update({
          status: "failed",
          razorpayPaymentId: payment.id,
          failureReason: payment.error_description ?? "Payment failed",
          updatedAt: new Date().toISOString(),
        });
      }
      await eventRef.update({
        status: "processed",
        processedAt: new Date().toISOString(),
      });
      return { processed: true, duplicate: false, event };
    }

    await eventRef.update({ status: "processed", processedAt: new Date().toISOString() });
    return { processed: false, duplicate: false, event };
  } catch (error) {
    await eventRef.update({
      status: "failed",
      failureReason:
        error instanceof Error ? error.message.slice(0, 140) : "Processing error",
      processedAt: new Date().toISOString(),
    });
    throw error;
  }
}

export async function listPlatformPayments(filters?: {
  environment?: GatewayEnvironment | "all" | undefined;
  status?: string | undefined;
  instituteId?: string | undefined;
  search?: string | undefined;
}) {
  const snap = await paymentOrdersCollection()
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();
  const allOrders = snap.docs.map((d) => d.data());

  const computeStats = (env: GatewayEnvironment) => {
    const subset = allOrders.filter((o) => o.environment === env);
    const captured = subset.filter((o) => o.status === "captured");
    const failed = subset.filter((o) => o.status === "failed");
    const refunded = subset.filter(
      (o) => o.status === "refunded" || o.refundedAmountPaise > 0
    );
    return {
      totalCapturedCount: captured.length,
      totalFailedCount: failed.length,
      totalCapturedPaise: captured.reduce((acc, o) => acc + o.amountPaise, 0),
      totalRefundedPaise: refunded.reduce((acc, o) => acc + o.refundedAmountPaise, 0),
    };
  };

  let filtered = allOrders;
  if (filters?.environment && filters.environment !== "all") {
    filtered = filtered.filter((o) => o.environment === filters.environment);
  }
  if (filters?.status && filters.status !== "all") {
    filtered = filtered.filter((o) => o.status === filters.status);
  }
  if (filters?.instituteId) {
    filtered = filtered.filter((o) => o.instituteId === filters.instituteId);
  }
  if (filters?.search) {
    const q = filters.search.trim().toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.orderId.toLowerCase().includes(q) ||
        o.internalPaymentId.toLowerCase().includes(q) ||
        (o.razorpayPaymentId?.toLowerCase().includes(q) ?? false) ||
        o.instituteId.toLowerCase().includes(q)
    );
  }

  return {
    items: filtered,
    stats: {
      test: computeStats("test"),
      live: computeStats("live"),
    },
  };
}

export async function getPaymentDetailById(
  id: string
): Promise<{ order: PaymentOrderRecord; webhooks: WebhookEventRecord[] }> {
  const orderSnap = await paymentOrdersCollection().doc(id).get();
  let order = orderSnap.data();

  if (!orderSnap.exists || !order) {
    const byInternal = await paymentOrdersCollection()
      .where("internalPaymentId", "==", id)
      .limit(1)
      .get();
    const doc = byInternal.docs[0];
    if (!doc) {
      throw new AuthError(404, "PAYMENT_NOT_FOUND", "Payment record not found.");
    }
    order = doc.data();
  }

  const whSnap = await webhookEventsCollection()
    .where("orderId", "==", order.orderId)
    .get();

  return {
    order,
    webhooks: whSnap.docs
      .map((d) => d.data())
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .slice(0, 25),
  };
}

export async function runGatewayDiagnostics(
  actor: SessionUser,
  environment: GatewayEnvironment
) {
  const config = await getRazorpayGatewayConfig();
  const checks: { name: string; passed: boolean; detail: string }[] = [];

  // 1. Credential authentication check
  let authOk = false;
  try {
    const { client } = await getRazorpayClientForEnvironment(environment);
    await client.orders.all({ count: 1 });
    authOk = true;
    checks.push({
      name: "1. API Credential Authentication",
      passed: true,
      detail: `Authenticated with Razorpay ${environment.toUpperCase()} API.`,
    });
  } catch (err) {
    checks.push({
      name: "1. API Credential Authentication",
      passed: false,
      detail: err instanceof Error ? err.message : "Failed to authenticate.",
    });
  }

  // 2. Webhook secret configured check + signature validation test
  let webhookSecretOk = false;
  try {
    const whSecret = await getEnvironmentWebhookSecret(environment);
    const sampleBody = JSON.stringify({
      event: "webhook.test",
      timestamp: Date.now(),
      actor: actor.uid,
    });
    const validSig = computeHmacSha256Hex(sampleBody, whSecret);
    const validAccepted = verifyRazorpayWebhookSignature({
      rawBody: sampleBody,
      signature: validSig,
      webhookSecret: whSecret,
    });
    const invalidRejected = !verifyRazorpayWebhookSignature({
      rawBody: sampleBody,
      signature: "0".repeat(validSig.length),
      webhookSecret: whSecret,
    });

    webhookSecretOk = validAccepted && invalidRejected;
    checks.push({
      name: "2. Webhook HMAC-SHA256 Validation & Invalid Rejection",
      passed: webhookSecretOk,
      detail: webhookSecretOk
        ? "Valid signature accepted and invalid signature rejected in constant time."
        : "Signature validation check failed.",
    });
  } catch (err) {
    checks.push({
      name: "2. Webhook HMAC-SHA256 Validation & Invalid Rejection",
      passed: false,
      detail: err instanceof Error ? err.message : "Webhook secret missing.",
    });
  }

  // 3. Real signed webhook delivery check status
  const webhookVerified =
    environment === "test" ? config.testWebhookVerified : config.liveWebhookVerified;
  checks.push({
    name: "3. Signed Webhook Event Delivery",
    passed: webhookVerified,
    detail: webhookVerified
      ? `Verified signed event received on /api/webhooks/razorpay/${environment}.`
      : `Send a test event from Razorpay Dashboard to /api/webhooks/razorpay/${environment}.`,
  });

  // 4. Payment flow verification status
  const flowVerified =
    environment === "test"
      ? config.testPaymentFlowVerified
      : config.livePaymentFlowVerified;
  checks.push({
    name: "4. Captured Payment & Atomic Wallet Credit",
    passed: flowVerified,
    detail: flowVerified
      ? `Verified ${environment.toUpperCase()} captured payment flow.`
      : `Complete a real ${environment.toUpperCase()} recharge flow to verify end-to-end capture.`,
  });

  return {
    environment,
    allPassed: authOk && webhookSecretOk && webhookVerified && flowVerified,
    checks,
  };
}

export async function initiateRazorpayPaymentRefund(
  actor: SessionUser,
  input: {
    orderId: string;
    amountRupees?: number | undefined;
    reason: string;
    idempotencyKey: string;
  }
): Promise<{ alreadyRefunded: boolean; order: PaymentOrderRecord }> {
  if (actor.role !== "super_admin") {
    throw new AuthError(403, "FORBIDDEN", "Only Super Admin can initiate refunds.");
  }
  if (input.reason.trim().length < 5) {
    throw new AuthError(400, "REASON_REQUIRED", "Refund reason is required.");
  }

  const orderRef = paymentOrdersCollection().doc(input.orderId);
  const orderSnap = await orderRef.get();
  const order = orderSnap.data();
  if (!orderSnap.exists || !order || !order.razorpayPaymentId) {
    throw new AuthError(
      404,
      "PAYMENT_NOT_FOUND",
      "Captured Razorpay payment record not found."
    );
  }
  if (order.status === "refunded") {
    return { alreadyRefunded: true, order };
  }
  if (order.status !== "captured") {
    throw new AuthError(
      400,
      "REFUND_NOT_ALLOWED",
      `Cannot refund payment in '${order.status}' state.`
    );
  }

  const remainingPaise = order.amountPaise - order.refundedAmountPaise;
  const refundPaise =
    input.amountRupees !== undefined
      ? Math.round(input.amountRupees * 100)
      : remainingPaise;

  if (
    !Number.isInteger(refundPaise) ||
    refundPaise <= 0 ||
    refundPaise > remainingPaise
  ) {
    throw new AuthError(
      400,
      "INVALID_REFUND_AMOUNT",
      `Refund amount must be between ₹1 and ₹${(remainingPaise / 100).toFixed(2)}.`
    );
  }

  const { client } = await getRazorpayClientForEnvironment(order.environment);
  const refundRes = await client.payments.refund(order.razorpayPaymentId, {
    amount: refundPaise,
    notes: {
      reason: input.reason.trim(),
      actorUid: actor.uid,
      idempotencyKey: input.idempotencyKey,
    },
  });

  const nextRefunded = order.refundedAmountPaise + refundPaise;
  const nextStatus = nextRefunded >= order.amountPaise ? "refunded" : "captured";
  const now = new Date().toISOString();

  await orderRef.update({
    refundedAmountPaise: nextRefunded,
    status: nextStatus,
    updatedAt: now,
  });

  await recordAuditLog({
    action: "PAYMENT_REFUNDED",
    actorUid: actor.uid,
    actorRole: actor.role,
    instituteId: order.instituteId,
    targetId: order.orderId,
    metadata: {
      refundId: refundRes.id ?? null,
      refundPaise,
      reason: input.reason.trim(),
    },
  });

  return {
    alreadyRefunded: false,
    order: {
      ...order,
      refundedAmountPaise: nextRefunded,
      status: nextStatus,
      updatedAt: now,
    },
  };
}
