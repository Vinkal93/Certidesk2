import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeHmacSha256Hex } from "@/lib/security/razorpay";

const store = new Map<string, Map<string, Record<string, unknown>>>();
const secrets = new Map<string, string>();
let mockRazorpayOrdersShouldFail = false;
let mockFetchedPayment: {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
} = {
  id: "pay_ok_1",
  order_id: "order_test_1",
  amount: 50000,
  currency: "INR",
  status: "captured",
};

function getCol(name: string) {
  let col = store.get(name);
  if (!col) {
    col = new Map();
    store.set(name, col);
  }
  return col;
}

function makeDocRef(colName: string, id: string) {
  return {
    id,
    get: async () => {
      const data = getCol(colName).get(id);
      return {
        exists: Boolean(data),
        data: () => (data ? structuredClone(data) : undefined),
      };
    },
    set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
      if (opts?.merge) {
        const existing = getCol(colName).get(id) ?? {};
        getCol(colName).set(id, { ...existing, ...structuredClone(data) });
      } else {
        getCol(colName).set(id, structuredClone(data));
      }
    },
    update: async (patch: Record<string, unknown>) => {
      const existing = getCol(colName).get(id) ?? {};
      getCol(colName).set(id, { ...existing, ...structuredClone(patch) });
    },
  };
}

function makeColProxy(colName: string) {
  return {
    doc: (id: string) => makeDocRef(colName, id),
    orderBy: () => ({
      limit: () => ({
        get: async () => ({
          docs: Array.from(getCol(colName).entries()).map(([id, data]) => ({
            id,
            ref: makeDocRef(colName, id),
            data: () => structuredClone(data),
          })),
        }),
      }),
    }),
    get: async () => {
      const entries = Array.from(getCol(colName).entries());
      return {
        empty: entries.length === 0,
        size: entries.length,
        docs: entries.map(([id, data]) => ({
          id,
          ref: makeDocRef(colName, id),
          data: () => structuredClone(data),
        })),
      };
    },
    where: (field: string, _op: string, value: unknown) => ({
      limit: () => ({
        get: async () => ({
          docs: Array.from(getCol(colName).entries())
            .filter(([, d]) => d[field] === value)
            .map(([id, data]) => ({
              id,
              ref: makeDocRef(colName, id),
              data: () => structuredClone(data),
            })),
        }),
      }),
      orderBy: () => ({
        limit: () => ({
          get: async () => ({
            docs: Array.from(getCol(colName).entries())
              .filter(([, d]) => d[field] === value)
              .map(([id, data]) => ({
                id,
                ref: makeDocRef(colName, id),
                data: () => structuredClone(data),
              })),
          }),
        }),
      }),
    }),
  };
}

vi.mock("server-only", () => ({}));

vi.mock("@/config/env.server", () => ({
  getServerEnv: () => ({
    FIREBASE_PROJECT_ID: "certidesk2-deb79",
    GCP_PROJECT_ID: "certidesk2-deb79",
    APP_BASE_URL: "https://certidesk.app",
    SESSION_COOKIE_NAME: "cd_session",
    SESSION_EXPIRES_IN_DAYS: 5,
    NODE_ENV: "test",
  }),
}));

vi.mock("@/lib/gcp/secret-manager", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gcp/secret-manager")>();
  return {
    ...actual,
    saveSecretValue: async (secretId: string, val: string) => {
      const ref = `projects/certidesk2-deb79/secrets/${secretId}/versions/1`;
      secrets.set(ref, val);
      return ref;
    },
    accessSecretValue: async (ref: string) => {
      const val = secrets.get(ref);
      if (!val) throw new Error("Secret not found");
      return val;
    },
  };
});

vi.mock("razorpay", () => {
  return {
    default: class MockRazorpay {
      orders = {
        all: async () => {
          if (mockRazorpayOrdersShouldFail) {
            throw new Error("Authentication failed");
          }
          return { items: [] };
        },
        create: async (opts: { amount: number }) => ({
          id: `order_${opts.amount}`,
        }),
      };
      payments = {
        fetch: async () => mockFetchedPayment,
      };
    },
  };
});

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => ({
    collection: (name: string) => makeColProxy(name),
    runTransaction: async <T>(
      fn: (tx: {
        get: (ref: ReturnType<typeof makeDocRef>) => Promise<{
          exists: boolean;
          data: () => Record<string, unknown> | undefined;
        }>;
        set: (
          ref: ReturnType<typeof makeDocRef>,
          data: Record<string, unknown>,
          opts?: { merge?: boolean }
        ) => void;
        update: (
          ref: ReturnType<typeof makeDocRef>,
          patch: Record<string, unknown>
        ) => void;
      }) => Promise<T>
    ) => {
      const ops: (() => Promise<void>)[] = [];
      const tx = {
        get: (ref: ReturnType<typeof makeDocRef>) => ref.get(),
        set: (
          ref: ReturnType<typeof makeDocRef>,
          data: Record<string, unknown>,
          opts?: { merge?: boolean }
        ) => {
          ops.push(() => ref.set(data, opts));
        },
        update: (ref: ReturnType<typeof makeDocRef>, patch: Record<string, unknown>) => {
          ops.push(() => ref.update(patch));
        },
      };
      const res = await fn(tx);
      for (const op of ops) await op();
      return res;
    },
  }),
}));

vi.mock("@/lib/firebase/firestore", () => ({
  COLLECTIONS: {
    INSTITUTES: "institutes",
    WALLET_TRANSACTIONS: "wallet_transactions",
    AUDIT_LOGS: "audit_logs",
    PAYMENT_ORDERS: "payment_orders",
    PAYMENT_GATEWAY_CONFIG: "paymentGatewayConfig",
    GATEWAY_CONFIG_HISTORY: "gateway_config_history",
    WEBHOOK_EVENTS: "webhook_events",
    RECHARGE_PLANS: "recharge_plans",
    WALLET_BONUS_GRANTS: "wallet_bonus_grants",
    ADMISSION_OPERATIONS: "admission_operations",
  },
  institutesCollection: () => makeColProxy("institutes"),
  walletTransactionsCollection: () => makeColProxy("wallet_transactions"),
  walletBonusGrantsCollection: () => makeColProxy("wallet_bonus_grants"),
  rechargePlansCollection: () => makeColProxy("recharge_plans"),
  admissionOperationsCollection: () => makeColProxy("admission_operations"),
  auditLogsCollection: () => makeColProxy("audit_logs"),
  paymentOrdersCollection: () => makeColProxy("payment_orders"),
  paymentGatewayConfigCollection: () => makeColProxy("paymentGatewayConfig"),
  gatewayConfigHistoryCollection: () => makeColProxy("gateway_config_history"),
  webhookEventsCollection: () => makeColProxy("webhook_events"),
}));

import {
  activateOrDisableRazorpayGateway,
  configureRazorpayEnvironment,
  getSafeGatewayOverview,
  saveRazorpayWebhookSecret,
  testRazorpayConnection,
} from "@/services/gateway.service";
import {
  createWalletRechargeOrder,
  processEnvironmentWebhook,
  verifyAndCreditCheckoutPayment,
} from "@/services/payment.service";
import type { SessionUser } from "@/types/auth";

const superAdmin: SessionUser = {
  uid: "su_1",
  email: "su@certidesk.app",
  role: "super_admin",
  instituteId: null,
  studentId: null,
  permissions: [],
  mustChangePassword: false,
};

const instAdminA: SessionUser = {
  uid: "inst_a",
  email: "admin@alpha.edu",
  role: "institute_admin",
  instituteId: "INST_A",
  studentId: null,
  permissions: [],
  mustChangePassword: false,
};

const instAdminB: SessionUser = {
  uid: "inst_b",
  email: "admin@beta.edu",
  role: "institute_admin",
  instituteId: "INST_B",
  studentId: null,
  permissions: [],
  mustChangePassword: false,
};

describe("Phase 7 — Razorpay Gateway Control Center & Security", () => {
  beforeEach(async () => {
    store.clear();
    secrets.clear();
    mockRazorpayOrdersShouldFail = false;

    getCol("institutes").set("INST_A", {
      id: "INST_A",
      code: "INS-ALPH-0001",
      name: "Alpha Institute",
      status: "active",
      walletBalancePaise: 10000,
    });
    getCol("institutes").set("INST_B", {
      id: "INST_B",
      code: "INS-BETA-0002",
      name: "Beta Institute",
      status: "active",
      walletBalancePaise: 10000,
    });

    await configureRazorpayEnvironment(superAdmin, {
      environment: "test",
      keyId: "rzp_test_1234567890",
      keySecret: "test_key_secret_abc",
    });
    await saveRazorpayWebhookSecret(superAdmin, {
      environment: "test",
      webhookSecret: "test_whsec_abc",
    });
    await configureRazorpayEnvironment(superAdmin, {
      environment: "live",
      keyId: "rzp_live_1234567890",
      keySecret: "live_key_secret_xyz",
    });
    await saveRazorpayWebhookSecret(superAdmin, {
      environment: "live",
      webhookSecret: "live_whsec_xyz",
    });
  });

  it("never exposes raw secrets in getSafeGatewayOverview()", async () => {
    const overview = await getSafeGatewayOverview();
    const serialized = JSON.stringify(overview);
    expect(serialized).not.toContain("test_key_secret_abc");
    expect(serialized).not.toContain("live_key_secret_xyz");
    expect(serialized).not.toContain("test_whsec_abc");
    expect(overview.maskedTestKeyId).toBe("rzp_te****7890");
  });

  it("marks CONNECTION_FAILED when API credentials are invalid", async () => {
    mockRazorpayOrdersShouldFail = true;
    await expect(testRazorpayConnection(superAdmin, "test")).rejects.toMatchObject({
      status: 400,
      code: "RAZORPAY_CONNECTION_FAILED",
    });
    const overview = await getSafeGatewayOverview();
    expect(overview.testStatus).toBe("CONNECTION_FAILED");
  });

  it("rejects gateway usage when disabled", async () => {
    await expect(createWalletRechargeOrder(instAdminA, 500)).rejects.toMatchObject({
      status: 503,
      code: "GATEWAY_DISABLED",
    });
  });

  it("blocks Live activation without explicit merchant approval", async () => {
    await testRazorpayConnection(superAdmin, "live");
    await getCol("paymentGatewayConfig").get("razorpay");
    getCol("paymentGatewayConfig").set("razorpay", {
      ...getCol("paymentGatewayConfig").get("razorpay"),
      liveWebhookVerified: true,
      livePaymentFlowVerified: true,
    });

    await expect(
      activateOrDisableRazorpayGateway(superAdmin, {
        action: "activate",
        environment: "live",
        liveMerchantApproved: false,
      })
    ).rejects.toMatchObject({ status: 400, code: "MERCHANT_APPROVAL_REQUIRED" });
  });

  it("rejects wrong webhook signature", async () => {
    await expect(
      processEnvironmentWebhook({
        environment: "test",
        rawBody: JSON.stringify({ event: "webhook.test" }),
        signature: "bad_signature",
      })
    ).rejects.toMatchObject({ status: 401, code: "INVALID_WEBHOOK_SIGNATURE" });
  });

  it("rejects Test order webhook on Live endpoint and Live order webhook on Test endpoint", async () => {
    getCol("payment_orders").set("order_test_1", {
      orderId: "order_test_1",
      internalPaymentId: "PAY_1",
      environment: "test",
      instituteId: "INST_A",
      actorUid: "inst_a",
      amountPaise: 50000,
      refundedAmountPaise: 0,
      currency: "INR",
      status: "created",
    });

    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_1",
            order_id: "order_test_1",
            amount: 50000,
            currency: "INR",
          },
        },
      },
    });
    const liveSig = computeHmacSha256Hex(body, "live_whsec_xyz");

    await expect(
      processEnvironmentWebhook({
        environment: "live",
        rawBody: body,
        signature: liveSig,
      })
    ).rejects.toMatchObject({ status: 400, code: "ENVIRONMENT_MISMATCH" });
  });

  it("handles duplicate webhook and duplicate checkout callback idempotently (credits once)", async () => {
    getCol("payment_orders").set("order_test_1", {
      orderId: "order_test_1",
      internalPaymentId: "PAY_1",
      environment: "test",
      instituteId: "INST_A",
      actorUid: "inst_a",
      amountPaise: 50000,
      refundedAmountPaise: 0,
      currency: "INR",
      status: "created",
    });

    mockFetchedPayment = {
      id: "pay_ok_1",
      order_id: "order_test_1",
      amount: 50000,
      currency: "INR",
      status: "captured",
    };

    const checkoutSig = computeHmacSha256Hex(
      "order_test_1|pay_ok_1",
      "test_key_secret_abc"
    );

    const first = await verifyAndCreditCheckoutPayment(instAdminA, {
      razorpayOrderId: "order_test_1",
      razorpayPaymentId: "pay_ok_1",
      razorpaySignature: checkoutSig,
    });
    expect(first.alreadyProcessed).toBe(false);
    expect(getCol("institutes").get("INST_A")?.walletBalancePaise).toBe(60000);

    // Duplicate checkout callback
    const second = await verifyAndCreditCheckoutPayment(instAdminA, {
      razorpayOrderId: "order_test_1",
      razorpayPaymentId: "pay_ok_1",
      razorpaySignature: checkoutSig,
    });
    expect(second.alreadyProcessed).toBe(true);
    expect(getCol("institutes").get("INST_A")?.walletBalancePaise).toBe(60000);

    // Subsequent webhook for same payment
    const whBody = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_ok_1",
            order_id: "order_test_1",
            amount: 50000,
            currency: "INR",
          },
        },
      },
    });
    const whSig = computeHmacSha256Hex(whBody, "test_whsec_abc");
    await processEnvironmentWebhook({
      environment: "test",
      rawBody: whBody,
      signature: whSig,
      eventIdHeader: "evt_1",
    });
    expect(getCol("institutes").get("INST_A")?.walletBalancePaise).toBe(60000);

    // Duplicate webhook replay
    const dupWh = await processEnvironmentWebhook({
      environment: "test",
      rawBody: whBody,
      signature: whSig,
      eventIdHeader: "evt_1",
    });
    expect(dupWh.duplicate).toBe(true);
    expect(getCol("institutes").get("INST_A")?.walletBalancePaise).toBe(60000);
  });

  it("rejects amount mismatch, currency mismatch, wrong institute, and authorized-not-captured", async () => {
    getCol("payment_orders").set("order_test_1", {
      orderId: "order_test_1",
      internalPaymentId: "PAY_1",
      environment: "test",
      instituteId: "INST_A",
      actorUid: "inst_a",
      amountPaise: 50000,
      refundedAmountPaise: 0,
      currency: "INR",
      status: "created",
    });

    const sig = computeHmacSha256Hex("order_test_1|pay_ok_1", "test_key_secret_abc");

    // Wrong institute
    await expect(
      verifyAndCreditCheckoutPayment(instAdminB, {
        razorpayOrderId: "order_test_1",
        razorpayPaymentId: "pay_ok_1",
        razorpaySignature: sig,
      })
    ).rejects.toMatchObject({ status: 404, code: "ORDER_NOT_FOUND" });

    // Amount mismatch
    mockFetchedPayment = {
      id: "pay_ok_1",
      order_id: "order_test_1",
      amount: 10000,
      currency: "INR",
      status: "captured",
    };
    await expect(
      verifyAndCreditCheckoutPayment(instAdminA, {
        razorpayOrderId: "order_test_1",
        razorpayPaymentId: "pay_ok_1",
        razorpaySignature: sig,
      })
    ).rejects.toMatchObject({ status: 400, code: "AMOUNT_MISMATCH" });

    // Currency mismatch
    mockFetchedPayment = {
      id: "pay_ok_1",
      order_id: "order_test_1",
      amount: 50000,
      currency: "USD",
      status: "captured",
    };
    await expect(
      verifyAndCreditCheckoutPayment(instAdminA, {
        razorpayOrderId: "order_test_1",
        razorpayPaymentId: "pay_ok_1",
        razorpaySignature: sig,
      })
    ).rejects.toMatchObject({ status: 400, code: "CURRENCY_MISMATCH" });

    // Authorized but not captured
    mockFetchedPayment = {
      id: "pay_ok_1",
      order_id: "order_test_1",
      amount: 50000,
      currency: "INR",
      status: "authorized",
    };
    await expect(
      verifyAndCreditCheckoutPayment(instAdminA, {
        razorpayOrderId: "order_test_1",
        razorpayPaymentId: "pay_ok_1",
        razorpaySignature: sig,
      })
    ).rejects.toMatchObject({ status: 409, code: "PAYMENT_NOT_CAPTURED" });
    expect(getCol("institutes").get("INST_A")?.walletBalancePaise).toBe(10000);
  });

  it("handles payment.failed without crediting and processes refund.processed", async () => {
    getCol("payment_orders").set("order_fail_1", {
      orderId: "order_fail_1",
      internalPaymentId: "PAY_FAIL",
      environment: "test",
      instituteId: "INST_A",
      actorUid: "inst_a",
      amountPaise: 50000,
      refundedAmountPaise: 0,
      currency: "INR",
      status: "created",
    });

    const failBody = JSON.stringify({
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_fail_1",
            order_id: "order_fail_1",
            error_description: "Bank declined",
          },
        },
      },
    });
    await processEnvironmentWebhook({
      environment: "test",
      rawBody: failBody,
      signature: computeHmacSha256Hex(failBody, "test_whsec_abc"),
      eventIdHeader: "evt_fail_1",
    });
    expect(getCol("payment_orders").get("order_fail_1")?.status).toBe("failed");
    expect(getCol("institutes").get("INST_A")?.walletBalancePaise).toBe(10000);

    // Refund processed
    getCol("payment_orders").set("order_cap_1", {
      orderId: "order_cap_1",
      internalPaymentId: "PAY_CAP",
      environment: "test",
      instituteId: "INST_A",
      actorUid: "inst_a",
      amountPaise: 50000,
      refundedAmountPaise: 0,
      currency: "INR",
      status: "captured",
      razorpayPaymentId: "pay_cap_1",
    });
    const refundBody = JSON.stringify({
      event: "refund.processed",
      payload: {
        refund: {
          entity: {
            id: "rfnd_1",
            payment_id: "pay_cap_1",
            amount: 50000,
          },
        },
      },
    });
    await processEnvironmentWebhook({
      environment: "test",
      rawBody: refundBody,
      signature: computeHmacSha256Hex(refundBody, "test_whsec_abc"),
      eventIdHeader: "evt_rfnd_1",
    });
    expect(getCol("payment_orders").get("order_cap_1")?.status).toBe("refunded");
    expect(getCol("payment_orders").get("order_cap_1")?.refundedAmountPaise).toBe(50000);
  });
});
