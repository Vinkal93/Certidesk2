import "server-only";
import Razorpay from "razorpay";
import { getServerEnv } from "@/config/env.server";
import {
  gatewayConfigHistoryCollection,
  paymentGatewayConfigCollection,
  webhookEventsCollection,
} from "@/lib/firebase/firestore";
import {
  accessSecretValue,
  maskCredential,
  saveSecretValue,
} from "@/lib/gcp/secret-manager";
import { AuthError } from "@/lib/security/session";
import { generateId } from "@/lib/utils/ids";
import { recordAuditLog } from "./audit.service";
import type {
  ActivateGatewayInput,
  ConfigureGatewayInput,
  SaveWebhookSecretInput,
} from "@/lib/validation/gateway";
import type { SessionUser } from "@/types/auth";
import type { GatewayEnvironment, RazorpayGatewayConfig } from "@/types/payment";

const GATEWAY_DOC_ID = "razorpay";

function defaultGatewayConfig(): RazorpayGatewayConfig {
  return {
    provider: "razorpay",
    enabled: false,
    activeEnvironment: null,
    testStatus: "NOT_CONFIGURED",
    liveStatus: "NOT_CONFIGURED",
    testConfigured: false,
    liveConfigured: false,
    testKeyId: null,
    liveKeyId: null,
    testSecretReference: null,
    liveSecretReference: null,
    testWebhookSecretReference: null,
    liveWebhookSecretReference: null,
    testWebhookConfigured: false,
    liveWebhookConfigured: false,
    testWebhookVerified: false,
    liveWebhookVerified: false,
    testPaymentFlowVerified: false,
    livePaymentFlowVerified: false,
    liveMerchantApproved: false,
    lastTestConnectionAt: null,
    lastLiveConnectionAt: null,
    lastTestWebhookAt: null,
    lastLiveWebhookAt: null,
    lastPaymentEventAt: null,
    lastError: null,
    configVersion: 0,
    updatedAt: new Date(0).toISOString(),
    updatedBy: "system",
  };
}

export async function getRazorpayGatewayConfig(): Promise<RazorpayGatewayConfig> {
  const snap = await paymentGatewayConfigCollection().doc(GATEWAY_DOC_ID).get();
  return snap.data() ?? defaultGatewayConfig();
}

async function appendConfigHistory(params: {
  configVersion: number;
  environment: GatewayEnvironment | "platform";
  action: string;
  actorUid: string;
  summary: string;
}): Promise<void> {
  const id = generateId("GCH");
  await gatewayConfigHistoryCollection().doc(id).set({
    id,
    configVersion: params.configVersion,
    environment: params.environment,
    action: params.action,
    actorUid: params.actorUid,
    summary: params.summary,
    createdAt: new Date().toISOString(),
  });
}

export async function getSafeGatewayOverview() {
  const env = getServerEnv();
  const [config, historySnap, webhookSnap] = await Promise.all([
    getRazorpayGatewayConfig(),
    gatewayConfigHistoryCollection().orderBy("createdAt", "desc").limit(20).get(),
    webhookEventsCollection().orderBy("receivedAt", "desc").limit(25).get(),
  ]);

  const baseUrl = env.APP_BASE_URL.replace(/\/+$/, "");

  return {
    provider: config.provider,
    enabled: config.enabled,
    activeEnvironment: config.activeEnvironment,
    testStatus: config.testStatus,
    liveStatus: config.liveStatus,
    testConfigured: config.testConfigured,
    liveConfigured: config.liveConfigured,
    maskedTestKeyId: maskCredential(config.testKeyId),
    maskedLiveKeyId: maskCredential(config.liveKeyId),
    testWebhookConfigured: config.testWebhookConfigured,
    liveWebhookConfigured: config.liveWebhookConfigured,
    testWebhookVerified: config.testWebhookVerified,
    liveWebhookVerified: config.liveWebhookVerified,
    testPaymentFlowVerified: config.testPaymentFlowVerified,
    livePaymentFlowVerified: config.livePaymentFlowVerified,
    liveMerchantApproved: config.liveMerchantApproved,
    lastTestConnectionAt: config.lastTestConnectionAt,
    lastLiveConnectionAt: config.lastLiveConnectionAt,
    lastTestWebhookAt: config.lastTestWebhookAt,
    lastLiveWebhookAt: config.lastLiveWebhookAt,
    lastPaymentEventAt: config.lastPaymentEventAt,
    lastError: config.lastError,
    configVersion: config.configVersion,
    updatedAt: config.updatedAt,
    updatedBy: config.updatedBy,
    webhookUrls: {
      test: `${baseUrl}/api/webhooks/razorpay/test`,
      live: `${baseUrl}/api/webhooks/razorpay/live`,
    },
    history: historySnap.docs.map((d) => d.data()),
    recentWebhooks: webhookSnap.docs.map((d) => d.data()),
  };
}

export async function configureRazorpayEnvironment(
  actor: SessionUser,
  input: ConfigureGatewayInput
) {
  const existing = await getRazorpayGatewayConfig();
  const secretId =
    input.environment === "test"
      ? "certidesk-razorpay-test-key-secret"
      : "certidesk-razorpay-live-key-secret";

  const secretRef = await saveSecretValue(secretId, input.keySecret);
  const now = new Date().toISOString();
  const nextVersion = existing.configVersion + 1;

  const updated: RazorpayGatewayConfig = {
    ...existing,
    ...(input.environment === "test"
      ? {
          testConfigured: true,
          testKeyId: input.keyId,
          testSecretReference: secretRef,
          testStatus: "CONFIGURED" as const,
          testPaymentFlowVerified: false,
        }
      : {
          liveConfigured: true,
          liveKeyId: input.keyId,
          liveSecretReference: secretRef,
          liveStatus: "CONFIGURED" as const,
          livePaymentFlowVerified: false,
        }),
    lastError: null,
    configVersion: nextVersion,
    updatedAt: now,
    updatedBy: actor.uid,
  };

  await paymentGatewayConfigCollection().doc(GATEWAY_DOC_ID).set(updated);

  await Promise.all([
    appendConfigHistory({
      configVersion: nextVersion,
      environment: input.environment,
      action: "CREDENTIALS_SAVED",
      actorUid: actor.uid,
      summary: `Saved ${input.environment.toUpperCase()} Key ID (${maskCredential(input.keyId)}) and Secret Manager reference.`,
    }),
    recordAuditLog({
      action: "GATEWAY_CONFIGURED",
      actorUid: actor.uid,
      actorRole: actor.role,
      targetId: `razorpay_${input.environment}`,
      metadata: {
        environment: input.environment,
        configVersion: nextVersion,
      },
    }),
  ]);

  return getSafeGatewayOverview();
}

export async function saveRazorpayWebhookSecret(
  actor: SessionUser,
  input: SaveWebhookSecretInput
) {
  const existing = await getRazorpayGatewayConfig();
  const secretId =
    input.environment === "test"
      ? "certidesk-razorpay-test-webhook-secret"
      : "certidesk-razorpay-live-webhook-secret";

  const secretRef = await saveSecretValue(secretId, input.webhookSecret);
  const now = new Date().toISOString();
  const nextVersion = existing.configVersion + 1;

  const updated: RazorpayGatewayConfig = {
    ...existing,
    ...(input.environment === "test"
      ? {
          testWebhookConfigured: true,
          testWebhookSecretReference: secretRef,
          testWebhookVerified: false,
        }
      : {
          liveWebhookConfigured: true,
          liveWebhookSecretReference: secretRef,
          liveWebhookVerified: false,
        }),
    configVersion: nextVersion,
    updatedAt: now,
    updatedBy: actor.uid,
  };

  await paymentGatewayConfigCollection().doc(GATEWAY_DOC_ID).set(updated);

  await Promise.all([
    appendConfigHistory({
      configVersion: nextVersion,
      environment: input.environment,
      action: "WEBHOOK_SECRET_SAVED",
      actorUid: actor.uid,
      summary: `Updated ${input.environment.toUpperCase()} webhook secret in Secret Manager. Awaiting signed webhook verification.`,
    }),
    recordAuditLog({
      action: "GATEWAY_WEBHOOK_SECRET_SAVED",
      actorUid: actor.uid,
      actorRole: actor.role,
      targetId: `razorpay_${input.environment}_webhook`,
      metadata: { environment: input.environment, configVersion: nextVersion },
    }),
  ]);

  return getSafeGatewayOverview();
}

export async function testRazorpayConnection(
  actor: SessionUser,
  environment: GatewayEnvironment
) {
  const existing = await getRazorpayGatewayConfig();
  const keyId = environment === "test" ? existing.testKeyId : existing.liveKeyId;
  const secretRef =
    environment === "test" ? existing.testSecretReference : existing.liveSecretReference;

  if (!keyId || !secretRef) {
    throw new AuthError(
      400,
      "GATEWAY_NOT_CONFIGURED",
      `Configure ${environment.toUpperCase()} Key ID and Key Secret before testing.`
    );
  }

  const keySecret = await accessSecretValue(secretRef);
  const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const now = new Date().toISOString();
  const nextVersion = existing.configVersion + 1;

  try {
    // Real authenticated read-only connectivity check
    await client.orders.all({ count: 1 });

    const updated: RazorpayGatewayConfig = {
      ...existing,
      ...(environment === "test"
        ? {
            testStatus:
              existing.enabled && existing.activeEnvironment === "test"
                ? ("ACTIVE" as const)
                : ("VERIFIED" as const),
            lastTestConnectionAt: now,
          }
        : {
            liveStatus:
              existing.enabled && existing.activeEnvironment === "live"
                ? ("ACTIVE" as const)
                : ("VERIFIED" as const),
            lastLiveConnectionAt: now,
          }),
      lastError: null,
      configVersion: nextVersion,
      updatedAt: now,
      updatedBy: actor.uid,
    };

    await paymentGatewayConfigCollection().doc(GATEWAY_DOC_ID).set(updated);
    await Promise.all([
      appendConfigHistory({
        configVersion: nextVersion,
        environment,
        action: "CONNECTION_VERIFIED",
        actorUid: actor.uid,
        summary: `${environment.toUpperCase()} Razorpay API connectivity verified.`,
      }),
      recordAuditLog({
        action: "GATEWAY_CONNECTION_TESTED",
        actorUid: actor.uid,
        actorRole: actor.role,
        targetId: `razorpay_${environment}`,
        metadata: { environment, verified: true },
      }),
    ]);

    return { verified: true, overview: await getSafeGatewayOverview() };
  } catch (err) {
    const safeReason =
      err instanceof Error
        ? err.message.slice(0, 140)
        : "Razorpay API authentication failed.";
    const updated: RazorpayGatewayConfig = {
      ...existing,
      ...(environment === "test"
        ? { testStatus: "CONNECTION_FAILED" as const }
        : { liveStatus: "CONNECTION_FAILED" as const }),
      lastError: safeReason,
      configVersion: nextVersion,
      updatedAt: now,
      updatedBy: actor.uid,
    };

    await paymentGatewayConfigCollection().doc(GATEWAY_DOC_ID).set(updated);
    await recordAuditLog({
      action: "GATEWAY_CONNECTION_TESTED",
      actorUid: actor.uid,
      actorRole: actor.role,
      targetId: `razorpay_${environment}`,
      metadata: { environment, verified: false },
    });

    throw new AuthError(400, "RAZORPAY_CONNECTION_FAILED", safeReason);
  }
}

export async function activateOrDisableRazorpayGateway(
  actor: SessionUser,
  input: ActivateGatewayInput
) {
  const existing = await getRazorpayGatewayConfig();
  const now = new Date().toISOString();
  const nextVersion = existing.configVersion + 1;

  if (input.action === "disable") {
    const updated: RazorpayGatewayConfig = {
      ...existing,
      enabled: false,
      testStatus:
        existing.activeEnvironment === "test" && existing.testConfigured
          ? "DISABLED"
          : existing.testStatus,
      liveStatus:
        existing.activeEnvironment === "live" && existing.liveConfigured
          ? "DISABLED"
          : existing.liveStatus,
      configVersion: nextVersion,
      updatedAt: now,
      updatedBy: actor.uid,
    };

    await paymentGatewayConfigCollection().doc(GATEWAY_DOC_ID).set(updated);
    await Promise.all([
      appendConfigHistory({
        configVersion: nextVersion,
        environment: "platform",
        action: "GATEWAY_DISABLED",
        actorUid: actor.uid,
        summary:
          "Emergency/manual gateway disable executed. Existing transactions preserved.",
      }),
      recordAuditLog({
        action: "GATEWAY_DISABLED",
        actorUid: actor.uid,
        actorRole: actor.role,
        targetId: GATEWAY_DOC_ID,
      }),
    ]);

    return getSafeGatewayOverview();
  }

  const env = input.environment;
  const configured = env === "test" ? existing.testConfigured : existing.liveConfigured;
  const status = env === "test" ? existing.testStatus : existing.liveStatus;
  const webhookConfigured =
    env === "test" ? existing.testWebhookConfigured : existing.liveWebhookConfigured;

  if (!configured) {
    throw new AuthError(
      400,
      "CREDENTIALS_MISSING",
      `Configure ${env.toUpperCase()} credentials before activation.`
    );
  }
  if (status !== "VERIFIED" && status !== "ACTIVE") {
    throw new AuthError(
      400,
      "CONNECTION_NOT_VERIFIED",
      `Run and pass the ${env.toUpperCase()} connection test before activation.`
    );
  }
  if (!webhookConfigured) {
    throw new AuthError(
      400,
      "WEBHOOK_NOT_CONFIGURED",
      `Save the ${env.toUpperCase()} Webhook Secret before activation.`
    );
  }
  if (env === "live" && !input.liveMerchantApproved && !existing.liveMerchantApproved) {
    throw new AuthError(
      400,
      "MERCHANT_APPROVAL_REQUIRED",
      "Live activation requires explicit confirmation of Razorpay live merchant account approval."
    );
  }

  const updated: RazorpayGatewayConfig = {
    ...existing,
    enabled: true,
    activeEnvironment: env,
    ...(env === "test"
      ? { testStatus: "ACTIVE" as const }
      : { liveStatus: "ACTIVE" as const, liveMerchantApproved: true }),
    configVersion: nextVersion,
    updatedAt: now,
    updatedBy: actor.uid,
  };

  await paymentGatewayConfigCollection().doc(GATEWAY_DOC_ID).set(updated);
  await Promise.all([
    appendConfigHistory({
      configVersion: nextVersion,
      environment: env,
      action: "GATEWAY_ACTIVATED",
      actorUid: actor.uid,
      summary: `Activated Razorpay gateway in ${env.toUpperCase()} mode.`,
    }),
    recordAuditLog({
      action: "GATEWAY_ACTIVATED",
      actorUid: actor.uid,
      actorRole: actor.role,
      targetId: GATEWAY_DOC_ID,
      metadata: { environment: env },
    }),
  ]);

  return getSafeGatewayOverview();
}

export async function getRazorpayClientForEnvironment(
  environment: GatewayEnvironment
): Promise<{ keyId: string; keySecret: string; client: Razorpay }> {
  const config = await getRazorpayGatewayConfig();
  const keyId = environment === "test" ? config.testKeyId : config.liveKeyId;
  const secretRef =
    environment === "test" ? config.testSecretReference : config.liveSecretReference;

  if (!keyId || !secretRef) {
    throw new AuthError(
      503,
      "GATEWAY_NOT_CONFIGURED",
      `Razorpay ${environment.toUpperCase()} credentials are not configured.`
    );
  }

  const keySecret = await accessSecretValue(secretRef);
  return {
    keyId,
    keySecret,
    client: new Razorpay({ key_id: keyId, key_secret: keySecret }),
  };
}

export async function getActiveRazorpayClientForWallet(): Promise<{
  environment: GatewayEnvironment;
  keyId: string;
  keySecret: string;
  client: Razorpay;
}> {
  const config = await getRazorpayGatewayConfig();
  if (!config.enabled || !config.activeEnvironment) {
    throw new AuthError(
      503,
      "GATEWAY_DISABLED",
      "Platform payment gateway is currently disabled."
    );
  }

  const { keyId, keySecret, client } = await getRazorpayClientForEnvironment(
    config.activeEnvironment
  );
  return {
    environment: config.activeEnvironment,
    keyId,
    keySecret,
    client,
  };
}

export async function getEnvironmentWebhookSecret(
  environment: GatewayEnvironment
): Promise<string> {
  const config = await getRazorpayGatewayConfig();
  const ref =
    environment === "test"
      ? config.testWebhookSecretReference
      : config.liveWebhookSecretReference;

  if (!ref) {
    throw new AuthError(
      503,
      "WEBHOOK_NOT_CONFIGURED",
      `Razorpay ${environment.toUpperCase()} webhook secret is not configured.`
    );
  }

  return accessSecretValue(ref);
}
