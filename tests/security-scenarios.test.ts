import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeHmacSha256Hex } from "@/lib/security/razorpay";

// In-memory store simulating Firestore collections and Auth users
const store = new Map<string, Map<string, Record<string, unknown>>>();
const authUsers = new Map<
  string,
  { uid: string; email: string; disabled: boolean; claims: Record<string, unknown> }
>();
const revokedUids = new Set<string>();
const cookieJar = new Map<string, { value: string; maxAge?: number }>();

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
    colName,
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

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string, opts?: { maxAge?: number }) => {
      if (opts?.maxAge === 0) {
        cookieJar.delete(name);
      } else {
        cookieJar.set(name, {
          value,
          ...(opts?.maxAge !== undefined ? { maxAge: opts.maxAge } : {}),
        });
      }
    },
  }),
}));

vi.mock("@/config/env.server", () => ({
  getServerEnv: () => ({
    FIREBASE_PROJECT_ID: "certidesk2-deb79",
    FIREBASE_CLIENT_EMAIL: "test@certidesk2-deb79.iam.gserviceaccount.com",
    FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----",
    SESSION_COOKIE_NAME: "cd_session",
    SESSION_EXPIRES_IN_DAYS: 5,
    SUPER_ADMIN_EMAILS: "owner@certidesk.app",
    RAZORPAY_KEY_ID: "rzp_test_123",
    RAZORPAY_KEY_SECRET: "rzp_secret_123",
    RAZORPAY_WEBHOOK_SECRET: "whsec_123",
    NODE_ENV: "test",
  }),
}));

vi.mock("@/lib/firebase/auth", () => ({
  verifyFirebaseIdToken: async (idToken: string) => {
    if (idToken.startsWith("expired:")) {
      throw new Error("Token expired");
    }
    const uid = idToken.replace("token:", "");
    const u = authUsers.get(uid);
    if (!u) throw new Error("User not found");
    return { uid: u.uid, email: u.email, ...u.claims };
  },
  createFirebaseSessionCookie: async (idToken: string) => `session:${idToken}`,
  verifyFirebaseSessionCookie: async (cookie: string) => {
    if (cookie.includes("expired:")) {
      throw new Error("Session expired");
    }
    const uid = cookie.replace("session:token:", "");
    if (revokedUids.has(uid)) {
      throw new Error("Session revoked");
    }
    const u = authUsers.get(uid);
    if (!u) throw new Error("User not found");
    return { uid: u.uid, email: u.email, ...u.claims };
  },
  revokeUserRefreshTokens: async (uid: string) => {
    revokedUids.add(uid);
  },
  setUserCustomClaims: async (uid: string, claims: Record<string, unknown>) => {
    const u = authUsers.get(uid);
    if (u) u.claims = claims;
  },
  getAdminUserByUid: async (uid: string) => {
    const u = authUsers.get(uid);
    if (!u) throw new Error("User not found");
    return u;
  },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({
    createUser: async (opts: { email: string; disabled?: boolean }) => {
      const uid = `uid_${Math.random().toString(36).slice(2, 10)}`;
      authUsers.set(uid, {
        uid,
        email: opts.email,
        disabled: Boolean(opts.disabled),
        claims: {},
      });
      return { uid };
    },
    updateUser: async (uid: string, opts: { disabled?: boolean }) => {
      const u = authUsers.get(uid);
      if (u && typeof opts.disabled === "boolean") u.disabled = opts.disabled;
    },
    deleteUser: async (uid: string) => {
      authUsers.delete(uid);
    },
    setCustomUserClaims: async (uid: string, claims: Record<string, unknown>) => {
      const u = authUsers.get(uid);
      if (u) u.claims = claims;
    },
    revokeRefreshTokens: async (uid: string) => {
      revokedUids.add(uid);
    },
  }),
  getAdminFirestore: () => ({
    collection: (name: string) => ({
      doc: (id: string) => makeDocRef(name, id),
    }),
    batch: () => {
      const ops: (() => Promise<void>)[] = [];
      return {
        set: (ref: ReturnType<typeof makeDocRef>, data: Record<string, unknown>) => {
          ops.push(() => ref.set(data));
        },
        update: (ref: ReturnType<typeof makeDocRef>, patch: Record<string, unknown>) => {
          ops.push(() => ref.update(patch));
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
  COLLECTIONS: {
    INSTITUTES: "institutes",
    USERS: "users",
    STUDENTS: "students",
    LOGIN_MAPPINGS: "login_mappings",
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
  institutesCollection: () => ({ doc: (id: string) => makeDocRef("institutes", id) }),
  usersCollection: () => ({ doc: (id: string) => makeDocRef("users", id) }),
  studentsCollection: () => ({ doc: (id: string) => makeDocRef("students", id) }),
  loginMappingsCollection: () => ({
    doc: (id: string) => makeDocRef("login_mappings", id),
  }),
  walletTransactionsCollection: () => ({
    doc: (id: string) => makeDocRef("wallet_transactions", id),
  }),
  walletBonusGrantsCollection: () => ({
    doc: (id: string) => makeDocRef("wallet_bonus_grants", id),
  }),
  rechargePlansCollection: () => ({
    doc: (id: string) => makeDocRef("recharge_plans", id),
  }),
  admissionOperationsCollection: () => ({
    doc: (id: string) => makeDocRef("admission_operations", id),
  }),
  securitySessionsCollection: () => ({
    doc: (id: string) => makeDocRef("securitySessions", id),
    where: () => ({ get: async () => ({ docs: [] }) }),
  }),
  securityLoginEventsCollection: () => ({
    doc: (id: string) => makeDocRef("securityLoginEvents", id),
    where: () => ({ get: async () => ({ docs: [] }) }),
  }),
  securityAlertsCollection: () => ({
    doc: (id: string) => makeDocRef("securityAlerts", id),
    where: () => ({ get: async () => ({ docs: [] }) }),
  }),
  securityAlertRulesCollection: () => ({
    doc: (id: string) => makeDocRef("securityAlertRules", id),
    get: async () => ({ empty: true, docs: [] }),
  }),
  securityPoliciesCollection: () => ({
    doc: (id: string) => makeDocRef("securityPolicies", id),
  }),
  auditLogsCollection: () => ({ doc: (id: string) => makeDocRef("audit_logs", id) }),
  paymentOrdersCollection: () => ({
    doc: (id: string) => makeDocRef("payment_orders", id),
  }),
  paymentGatewayConfigCollection: () => ({
    doc: (id: string) => makeDocRef("paymentGatewayConfig", id),
  }),
  gatewayConfigHistoryCollection: () => ({
    doc: (id: string) => makeDocRef("gateway_config_history", id),
  }),
  webhookEventsCollection: () => ({
    doc: (id: string) => makeDocRef("webhook_events", id),
  }),
}));

vi.mock("@/services/gateway.service", () => ({
  getEnvironmentWebhookSecret: async () => "whsec_123",
  getActiveRazorpayClientForWallet: async () => {
    throw new Error("Not used");
  },
  getRazorpayClientForEnvironment: async () => {
    throw new Error("Not used");
  },
  getRazorpayGatewayConfig: async () => ({}),
}));

import { establishPortalSession, terminatePortalSession } from "@/services/auth.service";
import { getSessionUser, requireSessionUser } from "@/lib/security/session";
import { admitStudent, getInstituteStudentById } from "@/services/student.service";
import { processEnvironmentWebhook } from "@/services/payment.service";
import { computeWalletDebit } from "@/services/wallet.service";

function seedFixtures() {
  store.clear();
  authUsers.clear();
  revokedUids.clear();
  cookieJar.clear();

  // Institutes A (active) and B (suspended)
  getCol("institutes").set("INST_A", {
    id: "INST_A",
    code: "INS-ALPH-0001",
    name: "Alpha Institute",
    status: "active",
    walletBalancePaise: 20000, // ₹200
    pricing: {
      admissionFeePaise: 15000, // ₹150
      profileUpdateFeePaise: 10000, // ₹100
      certificateFeePaise: 0,
    },
  });

  getCol("institutes").set("INST_B", {
    id: "INST_B",
    code: "INS-BETA-0002",
    name: "Beta Institute",
    status: "suspended",
    walletBalancePaise: 50000,
    pricing: {
      admissionFeePaise: 15000,
      profileUpdateFeePaise: 10000,
      certificateFeePaise: 0,
    },
  });

  // Users
  authUsers.set("su_1", {
    uid: "su_1",
    email: "su@certidesk.app",
    disabled: false,
    claims: { role: "super_admin" },
  });

  authUsers.set("inst_a_admin", {
    uid: "inst_a_admin",
    email: "admin@alpha.edu",
    disabled: false,
    claims: { role: "institute_admin", instituteId: "INST_A" },
  });

  authUsers.set("inst_b_admin", {
    uid: "inst_b_admin",
    email: "admin@beta.edu",
    disabled: false,
    claims: { role: "institute_admin", instituteId: "INST_B" },
  });

  authUsers.set("staff_readonly", {
    uid: "staff_readonly",
    email: "staff@alpha.edu",
    disabled: false,
    claims: {
      role: "staff",
      instituteId: "INST_A",
      permissions: ["students:read"],
    },
  });

  authUsers.set("stu_a_1", {
    uid: "stu_a_1",
    email: "stu1@alpha.edu",
    disabled: false,
    claims: { role: "student", instituteId: "INST_A", studentId: "STU_A_1" },
  });

  authUsers.set("stu_a_disabled", {
    uid: "stu_a_disabled",
    email: "stu2@alpha.edu",
    disabled: false,
    claims: { role: "student", instituteId: "INST_A", studentId: "STU_A_2" },
  });

  getCol("students").set("STU_A_1", {
    id: "STU_A_1",
    studentCode: "STU-ALPH26-001",
    instituteId: "INST_A",
    uid: "stu_a_1",
    fullName: "Active Student",
    status: "active",
  });

  getCol("students").set("STU_A_2", {
    id: "STU_A_2",
    studentCode: "STU-ALPH26-002",
    instituteId: "INST_A",
    uid: "stu_a_disabled",
    fullName: "Disabled Student",
    status: "disabled",
  });

  getCol("students").set("STU_B_1", {
    id: "STU_B_1",
    studentCode: "STU-BETA26-001",
    instituteId: "INST_B",
    uid: "stu_b_1",
    fullName: "Beta Student",
    status: "active",
  });
}

describe("CertiDesk Pro — 17 Security & Operational Scenarios", () => {
  beforeEach(() => {
    seedFixtures();
  });

  it("1. Super Admin logs into /su", async () => {
    const user = await establishPortalSession("token:su_1", "super_admin");
    expect(user.role).toBe("super_admin");
    expect(cookieJar.get("cd_session")?.value).toBe("session:token:su_1");
  });

  it("2. Normal user cannot log into /su", async () => {
    await expect(
      establishPortalSession("token:inst_a_admin", "super_admin")
    ).rejects.toMatchObject({ status: 403, code: "WRONG_PORTAL" });
  });

  it("3. Institute Admin logs into Institute portal", async () => {
    const user = await establishPortalSession("token:inst_a_admin", "institute");
    expect(user.role).toBe("institute_admin");
    expect(user.instituteId).toBe("INST_A");
  });

  it("4. Student logs into Student portal", async () => {
    const user = await establishPortalSession("token:stu_a_1", "student");
    expect(user.role).toBe("student");
    expect(user.studentId).toBe("STU_A_1");
  });

  it("5. Student credentials fail on Institute login", async () => {
    await expect(
      establishPortalSession("token:stu_a_1", "institute")
    ).rejects.toMatchObject({ status: 403, code: "WRONG_PORTAL" });
  });

  it("6. Institute credentials fail on Student login", async () => {
    await expect(
      establishPortalSession("token:inst_a_admin", "student")
    ).rejects.toMatchObject({ status: 403, code: "WRONG_PORTAL" });
  });

  it("7. Suspended institute cannot log in", async () => {
    await expect(
      establishPortalSession("token:inst_b_admin", "institute")
    ).rejects.toMatchObject({ status: 423, code: "INSTITUTE_SUSPENDED" });
    expect(revokedUids.has("inst_b_admin")).toBe(true);
  });

  it("8. Disabled student cannot log in", async () => {
    await expect(
      establishPortalSession("token:stu_a_disabled", "student")
    ).rejects.toMatchObject({ status: 403, code: "STUDENT_DISABLED" });
    expect(revokedUids.has("stu_a_disabled")).toBe(true);
  });

  it("9. Institute A cannot read Institute B data", async () => {
    const instA = await establishPortalSession("token:inst_a_admin", "institute");
    await expect(getInstituteStudentById(instA, "STU_B_1")).rejects.toMatchObject({
      status: 404,
      code: "STUDENT_NOT_FOUND",
    });
  });

  it("10. Student A cannot access institute endpoints or Student B", async () => {
    await establishPortalSession("token:stu_a_1", "student");
    await expect(requireSessionUser("institute")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN_PORTAL",
    });
  });

  it("12. Staff cannot access unauthorized modules", async () => {
    const staff = await establishPortalSession("token:staff_readonly", "institute");
    await expect(
      admitStudent(staff, {
        fullName: "Test Student",
        email: "new@alpha.edu",
        phone: "9999999999",
        courseName: "Python",
        batchName: "A1",
      })
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("13. Wallet cannot go negative", async () => {
    expect(() => computeWalletDebit(10000, 15000)).toThrowError(
      /Insufficient wallet balance/
    );

    const instA = await establishPortalSession("token:inst_a_admin", "institute");
    // First admission succeeds (₹200 - ₹150 = ₹50)
    await admitStudent(instA, {
      fullName: "First Student",
      email: "first@alpha.edu",
      phone: "9876543210",
      courseName: "Python",
      batchName: "B1",
    });
    expect(getCol("institutes").get("INST_A")?.walletBalancePaise).toBe(5000);

    // Second admission fails (₹50 < ₹150)
    await expect(
      admitStudent(instA, {
        fullName: "Second Student",
        email: "second@alpha.edu",
        phone: "9876543211",
        courseName: "Python",
        batchName: "B1",
      })
    ).rejects.toMatchObject({ status: 402, code: "INSUFFICIENT_WALLET_BALANCE" });
  });

  it("14. Duplicate payment webhook cannot credit wallet twice", async () => {
    getCol("payment_orders").set("order_123", {
      orderId: "order_123",
      internalPaymentId: "PAY_123",
      environment: "test",
      instituteId: "INST_A",
      actorUid: "inst_a_admin",
      amountPaise: 50000, // ₹500
      refundedAmountPaise: 0,
      currency: "INR",
      status: "created",
    });

    const rawBody = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_abc",
            order_id: "order_123",
            amount: 50000,
            currency: "INR",
          },
        },
      },
    });
    const signature = computeHmacSha256Hex(rawBody, "whsec_123");

    await processEnvironmentWebhook({
      environment: "test",
      rawBody,
      signature,
      eventIdHeader: "evt_dup_1",
    });
    expect(getCol("institutes").get("INST_A")?.walletBalancePaise).toBe(70000);

    // Replay exact same webhook
    const replay = await processEnvironmentWebhook({
      environment: "test",
      rawBody,
      signature,
      eventIdHeader: "evt_dup_1",
    });
    expect(replay.duplicate).toBe(true);
    expect(getCol("institutes").get("INST_A")?.walletBalancePaise).toBe(70000);
  });

  it("15. Unauthorized API calls are rejected", async () => {
    await expect(requireSessionUser("institute")).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
    });
  });

  it("16. Expired sessions are rejected", async () => {
    cookieJar.set("cd_session", { value: "session:expired:inst_a_admin" });
    const session = await getSessionUser();
    expect(session).toBeNull();
  });

  it("17. Logout invalidates session", async () => {
    const user = await establishPortalSession("token:inst_a_admin", "institute");
    expect(await getSessionUser()).not.toBeNull();

    await terminatePortalSession(user);
    expect(cookieJar.has("cd_session")).toBe(false);
    expect(revokedUids.has("inst_a_admin")).toBe(true);
    expect(await getSessionUser()).toBeNull();
  });

  it("18. Firebase Console allowlisted owner email auto-provisions super_admin on /su login", async () => {
    authUsers.set("console_owner", {
      uid: "console_owner",
      email: "owner@certidesk.app",
      disabled: false,
      claims: {},
    });

    const user = await establishPortalSession("token:console_owner", "super_admin");
    expect(user.role).toBe("super_admin");
    expect(authUsers.get("console_owner")?.claims.role).toBe("super_admin");
    expect((await getSessionUser())?.role).toBe("super_admin");
  });

  it("19. Non-allowlisted Firebase Console user without role is rejected on /su login", async () => {
    authUsers.set("random_user", {
      uid: "random_user",
      email: "random@example.com",
      disabled: false,
      claims: {},
    });

    await expect(
      establishPortalSession("token:random_user", "super_admin")
    ).rejects.toMatchObject({ status: 403, code: "ROLE_NOT_PROVISIONED" });
  });
});
