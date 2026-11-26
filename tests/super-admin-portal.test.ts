import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, Map<string, Record<string, unknown>>>();

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
    set: async (data: Record<string, unknown>) => {
      getCol(colName).set(id, structuredClone(data));
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
    limit: () => ({
      get: async () => ({
        docs: Array.from(getCol(colName).entries()).map(([id, data]) => ({
          id,
          data: () => structuredClone(data),
        })),
      }),
    }),
    orderBy: () => ({
      limit: () => ({
        get: async () => ({
          docs: Array.from(getCol(colName).entries()).map(([id, data]) => ({
            id,
            data: () => structuredClone(data),
          })),
        }),
      }),
      get: async () => ({
        docs: Array.from(getCol(colName).entries()).map(([id, data]) => ({
          id,
          data: () => structuredClone(data),
        })),
      }),
    }),
    where: (field: string, _op: string, value: unknown) => ({
      orderBy: () => ({
        limit: () => ({
          get: async () => ({
            docs: Array.from(getCol(colName).entries())
              .filter(([, d]) => d[field] === value)
              .map(([id, data]) => ({
                id,
                data: () => structuredClone(data),
              })),
          }),
        }),
      }),
    }),
  };
}

vi.mock("server-only", () => ({}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({
    listUsers: async () => ({ users: [] }),
  }),
  getAdminFirestore: () => ({
    collection: (name: string) => makeColProxy(name),
    batch: () => {
      const ops: (() => Promise<void>)[] = [];
      return {
        set: (ref: ReturnType<typeof makeDocRef>, data: Record<string, unknown>) => {
          ops.push(() => ref.set(data));
        },
        commit: async () => {
          for (const op of ops) await op();
        },
      };
    },
    runTransaction: async <T>(
      fn: (tx: {
        get: (ref: ReturnType<typeof makeDocRef>) => Promise<{
          exists: boolean;
          data: () => Record<string, unknown> | undefined;
        }>;
        set: (ref: ReturnType<typeof makeDocRef>, data: Record<string, unknown>) => void;
        update: (
          ref: ReturnType<typeof makeDocRef>,
          patch: Record<string, unknown>
        ) => void;
      }) => Promise<T>
    ) => {
      const ops: (() => Promise<void>)[] = [];
      const tx = {
        get: (ref: ReturnType<typeof makeDocRef>) => ref.get(),
        set: (ref: ReturnType<typeof makeDocRef>, data: Record<string, unknown>) => {
          ops.push(() => ref.set(data));
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
  institutesCollection: () => makeColProxy("institutes"),
  studentsCollection: () => makeColProxy("students"),
  usersCollection: () => makeColProxy("users"),
  walletTransactionsCollection: () => makeColProxy("wallet_transactions"),
  auditLogsCollection: () => makeColProxy("audit_logs"),
  paymentOrdersCollection: () => makeColProxy("payment_orders"),
  webhookEventsCollection: () => makeColProxy("webhook_events"),
}));

vi.mock("@/services/gateway.service", () => ({
  getRazorpayGatewayConfig: async () => ({
    enabled: true,
    activeEnvironment: "test",
    testStatus: "ACTIVE",
    liveStatus: "NOT_CONFIGURED",
    lastError: null,
  }),
  getRazorpayClientForEnvironment: async () => ({
    keyId: "rzp_test_123",
    keySecret: "secret",
    client: {
      payments: {
        refund: async () => ({ id: "rfnd_test_1" }),
      },
    },
  }),
  getActiveRazorpayClientForWallet: async () => {
    throw new Error("Not used");
  },
  getEnvironmentWebhookSecret: async () => "whsec_123",
}));

import {
  adjustInstituteWalletAtomic,
  updateCentralPricingConfig,
} from "@/services/su-platform.service";
import { initiateRazorpayPaymentRefund } from "@/services/payment.service";
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

const instAdmin: SessionUser = {
  uid: "inst_a",
  email: "admin@alpha.edu",
  role: "institute_admin",
  instituteId: "INST_A",
  studentId: null,
  permissions: [],
  mustChangePassword: false,
};

const studentUser: SessionUser = {
  uid: "stu_1",
  email: "stu@alpha.edu",
  role: "student",
  instituteId: "INST_A",
  studentId: "STU_1",
  permissions: [],
  mustChangePassword: false,
};

describe("Super Admin Portal — Security, Pricing, Wallets & Refunds", () => {
  beforeEach(() => {
    store.clear();
    getCol("institutes").set("INST_A", {
      id: "INST_A",
      code: "INS-ALPH-0001",
      name: "Alpha Institute",
      status: "active",
      walletBalancePaise: 20000,
    });
    getCol("payment_orders").set("order_cap_1", {
      orderId: "order_cap_1",
      internalPaymentId: "PAY_1",
      environment: "test",
      instituteId: "INST_A",
      actorUid: "inst_a",
      amountPaise: 50000,
      refundedAmountPaise: 0,
      currency: "INR",
      status: "captured",
      razorpayPaymentId: "pay_1",
    });
  });

  it("blocks Institute Admin and Student from Super Admin operations", async () => {
    await expect(
      updateCentralPricingConfig(instAdmin, {
        admissionFeeRupees: 200,
        profileUpdateFeeRupees: 100,
        certificateFeeRupees: 0,
        effectiveDate: "2026-12-01",
      })
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });

    await expect(
      adjustInstituteWalletAtomic(studentUser, {
        instituteId: "INST_A",
        type: "credit",
        amountRupees: 1000,
        reason: "Unauthorized attempt",
        idempotencyKey: "k1",
      })
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("executes atomic wallet adjustments with idempotency and non-negative enforcement", async () => {
    const first = await adjustInstituteWalletAtomic(superAdmin, {
      instituteId: "INST_A",
      type: "credit",
      amountRupees: 300,
      reason: "Onboarding promotional credit",
      idempotencyKey: "promo_1",
    });
    expect(first.alreadyProcessed).toBe(false);
    expect(first.transaction.balanceAfterPaise).toBe(50000);

    // Replay same idempotencyKey
    const replay = await adjustInstituteWalletAtomic(superAdmin, {
      instituteId: "INST_A",
      type: "credit",
      amountRupees: 300,
      reason: "Onboarding promotional credit",
      idempotencyKey: "promo_1",
    });
    expect(replay.alreadyProcessed).toBe(true);
    expect(getCol("institutes").get("INST_A")?.walletBalancePaise).toBe(50000);

    // Attempt debit exceeding balance
    await expect(
      adjustInstituteWalletAtomic(superAdmin, {
        instituteId: "INST_A",
        type: "debit",
        amountRupees: 600,
        reason: "Excessive debit",
        idempotencyKey: "debit_fail",
      })
    ).rejects.toMatchObject({ status: 402, code: "INSUFFICIENT_WALLET_BALANCE" });
  });

  it("updates central pricing with history and audit trail", async () => {
    const updated = await updateCentralPricingConfig(superAdmin, {
      admissionFeeRupees: 175,
      profileUpdateFeeRupees: 100,
      certificateFeeRupees: 0,
      effectiveDate: "2026-12-01",
    });
    expect(updated.admissionFeePaise).toBe(17500);
    expect(getCol("pricing_history").size).toBe(1);
    expect(getCol("audit_logs").size).toBe(1);
  });

  it("initiates idempotent Razorpay refunds and records audit log", async () => {
    const first = await initiateRazorpayPaymentRefund(superAdmin, {
      orderId: "order_cap_1",
      reason: "Duplicate recharge requested by institute",
      idempotencyKey: "rfnd_k1",
    });
    expect(first.alreadyRefunded).toBe(false);
    expect(first.order.status).toBe("refunded");
    expect(first.order.refundedAmountPaise).toBe(50000);

    const replay = await initiateRazorpayPaymentRefund(superAdmin, {
      orderId: "order_cap_1",
      reason: "Duplicate recharge requested by institute",
      idempotencyKey: "rfnd_k1",
    });
    expect(replay.alreadyRefunded).toBe(true);
  });
});
